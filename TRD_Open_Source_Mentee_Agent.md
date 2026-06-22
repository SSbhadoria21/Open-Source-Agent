# Technical Requirements Document (TRD)
## Open Source Mentee Agent

**Version:** 1.0  
**Status:** Draft  
**Date:** June 2026  
**Owner:** Engineering Team

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Agent Specifications](#3-agent-specifications)
4. [Data Models](#4-data-models)
5. [API Specifications](#5-api-specifications)
6. [Infrastructure & Tech Stack](#6-infrastructure--tech-stack)
7. [Integration Requirements](#7-integration-requirements)
8. [Security Requirements](#8-security-requirements)
9. [Performance & Scalability](#9-performance--scalability)
10. [Testing Requirements](#10-testing-requirements)
11. [Deployment & DevOps](#11-deployment--devops)
12. [Observability](#12-observability)

---

## 1. System Overview

Open Source Mentee Agent is a multi-agent AI system orchestrated via **LangGraph**, exposing a **FastAPI** backend and a **React/Next.js** frontend. The system routes user requests through a central Orchestrator Agent that delegates to specialized sub-agents depending on the user's role (Contributor or Admin) and intent.

All agents are stateless and communicate through a shared message-passing graph managed by LangGraph. Persistent state is stored in PostgreSQL (structured data) and Redis (session cache, rate-limit counters). Vector similarity search is handled by Chroma.

---

## 2. Architecture

### 2.1 High-Level Agent Graph

```
                        User Request
                             │
                             ▼
                    Orchestrator Agent
                    (LangGraph Router)
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
     Repo Agent         Issue Agent        Admin Agent
          │                  │                  │
          └────────┬──────────┘                 │
                   ▼                            │
              Code Agent               ┌────────┴────────┐
                   │                   ▼                  ▼
                   ▼             Label Agent         Triage Agent
              Fix Agent               │                   │
                   │             Duplicate              Contributor
                   └───────┐     Issue Agent          Match Agent
                           ▼                               │
                     Review Agent  ◄────────────────────────┘
                           │
                           ▼
                        Response
```

### 2.2 Request Lifecycle

1. Frontend sends authenticated REST request to FastAPI backend.
2. Backend constructs an initial LangGraph state object containing user role, intent, and input payload.
3. Orchestrator Agent inspects the state and routes to the appropriate sub-agent(s).
4. Sub-agents execute, updating shared state, and pass control downstream.
5. Final agent writes the response payload to state.
6. Backend serializes and returns the response to the frontend.
7. Intermediate states are cached in Redis with a 30-minute TTL.

### 2.3 Deployment Topology

```
                  ┌─────────────────────────────────────┐
                  │           Cloud Provider             │
                  │                                      │
  User ─── HTTPS ─►  Nginx / Load Balancer               │
                  │         │                            │
                  │         ▼                            │
                  │    FastAPI Pods (horizontal)          │
                  │         │                            │
                  │    ┌────┴────┐                       │
                  │    ▼         ▼                       │
                  │ PostgreSQL  Redis                    │
                  │    │                                 │
                  │    ▼                                 │
                  │  Chroma (vector store)               │
                  │                                      │
                  │  LangGraph Agents (same FastAPI proc) │
                  └─────────────────────────────────────┘
                                    │
                        External APIs (GitHub, Gemini)
```

---

## 3. Agent Specifications

### 3.1 Orchestrator Agent

**Responsibilities:** Route incoming requests to the correct sub-agent pipeline based on user role and intent.

**Inputs:**

| Field | Type | Description |
|---|---|---|
| `user_role` | `enum` | `contributor` or `admin` |
| `intent` | `enum` | `analyze_repo`, `explain_issue`, `trace_code`, `generate_fix`, `review_pr`, `triage_issue`, `detect_duplicate`, `label_issue`, `match_contributor`, `project_health` |
| `payload` | `dict` | Intent-specific input (URL, issue ID, etc.) |
| `session_id` | `str` | UUID for state continuity |

**Routing Table:**

| Intent | Sub-Agent Chain |
|---|---|
| `analyze_repo` | `RepoAgent` |
| `explain_issue` | `IssueAgent` |
| `trace_code` | `IssueAgent → CodeAgent` |
| `generate_fix` | `IssueAgent → CodeAgent → FixAgent` |
| `review_pr` | `ReviewAgent` |
| `triage_issue` | `TriageAgent` |
| `detect_duplicate` | `DuplicateIssueAgent` |
| `label_issue` | `LabelAgent` |
| `match_contributor` | `ContributorMatchAgent` |
| `project_health` | `ProjectHealthAgent` |

---

### 3.2 Repo Agent

**Purpose:** Analyze a GitHub repository's structure and produce an orientation summary.

**Tools Used:**
- `github_api.get_tree(repo_url, recursive=True)` — fetches file tree.
- `github_api.get_file_content(path)` — reads README, package.json, requirements.txt, etc.
- `llm.complete(prompt)` — generates orientation summary.

**LangGraph Node Definition:**

```python
def repo_agent_node(state: AgentState) -> AgentState:
    repo_url = state["payload"]["repo_url"]
    tree = github_client.get_tree(repo_url, recursive=True)
    readme = github_client.get_file_content(repo_url, "README.md")
    manifest_files = detect_manifests(tree)  # package.json, pyproject.toml, etc.
    
    prompt = build_orientation_prompt(tree, readme, manifest_files)
    result = llm.complete(prompt)
    
    state["repo_summary"] = parse_orientation_response(result)
    return state
```

**Output Schema:**

```json
{
  "tech_stack": {
    "frontend": "React",
    "backend": "FastAPI",
    "database": "PostgreSQL"
  },
  "key_directories": [
    { "path": "src/", "description": "Main application logic" },
    { "path": "api/", "description": "Route handlers" }
  ],
  "entry_points": ["main.py", "src/index.tsx"]
}
```

---

### 3.3 Issue Agent

**Purpose:** Fetch and simplify a GitHub issue.

**Tools Used:**
- `github_api.get_issue(issue_url)` — fetches issue metadata, body, and comments.
- `llm.complete(prompt)` — rewrites issue in plain English, classifies difficulty, estimates time.

**Difficulty Classification Logic:**

The LLM is prompted with the issue body plus a few-shot classification guide:
- **Beginner:** UI-only changes, typo fixes, documentation updates, config changes.
- **Intermediate:** New feature with 2–5 files touched, minor API changes.
- **Advanced:** Architectural changes, security fixes, performance-critical code, cross-cutting concerns.

**Output Schema:**

```json
{
  "title": "Issue #120: Add dark mode support",
  "plain_summary": "Users want a dark theme option that respects system preferences.",
  "difficulty": "Beginner",
  "estimated_hours": 2,
  "affected_areas": ["Frontend", "CSS"],
  "labels_detected": ["enhancement", "good-first-issue"]
}
```

---

### 3.4 Code Agent

**Purpose:** Identify files affected by an issue and trace the relevant call graph.

**Tools Used:**
- `github_api.get_tree(repo_url, recursive=True)` — full file tree.
- `github_api.get_file_content(path)` — reads file contents for analysis.
- `llm.complete(prompt)` — identifies affected files and maps dependencies.

**Strategy:**
1. Pass issue summary + full file tree to the LLM.
2. Ask the LLM to nominate up to 10 candidate files with reasoning.
3. Fetch the content of nominated files.
4. Pass file contents to LLM for call graph extraction.

**Output Schema:**

```json
{
  "affected_files": [
    { "path": "src/theme.ts", "reason": "Add dark color palette" },
    { "path": "components/Navbar.tsx", "reason": "Add toggle button" },
    { "path": "App.tsx", "reason": "Wrap with context provider" }
  ],
  "call_graph": {
    "entry": "App.tsx",
    "flow": ["App.tsx → ThemeProvider → Navbar.tsx → ThemeToggle"]
  }
}
```

---

### 3.5 Fix Agent

**Purpose:** Generate a step-by-step implementation plan with code snippets.

**Tools Used:**
- `llm.complete(prompt)` — generates implementation plan given issue + code context.

**Prompt Construction:**
- System prompt: explains the repo's tech stack and coding conventions.
- User content: issue summary + affected file contents + call graph.
- Instruction: produce a numbered plan with code snippets ≤ 30 lines per step.

**Output Schema:**

```json
{
  "steps": [
    {
      "number": 1,
      "title": "Create ThemeContext",
      "description": "Wrap <App /> in a ThemeContext provider.",
      "snippet": "const ThemeContext = createContext('light');\n...",
      "files_modified": ["App.tsx", "src/theme.ts"]
    }
  ],
  "edge_cases": [
    "System preference may differ from stored preference — check localStorage first.",
    "Ensure CSS variables are applied to <html>, not <body>."
  ]
}
```

---

### 3.6 Review Agent

**Purpose:** Analyze a PR diff and return structured feedback. Used in both contributor (pre-submission) and admin (pre-merge) modes.

**Tools Used:**
- `github_api.get_pull_request(pr_url)` — fetches PR metadata and diff.
- `llm.complete(prompt)` — performs code review.

**Review Categories:**

| Category | Description |
|---|---|
| Bugs | Logic errors, null dereferences, incorrect conditionals |
| Security | XSS, SQL injection, hardcoded secrets, insecure deps |
| Style | Naming violations, unused imports, missing docstrings |
| Tests | New code paths with no test coverage |

**Output Schema:**

```json
{
  "pr_number": 203,
  "summary": "3 issues found, 2 style notes.",
  "issues": [
    { "type": "Bug", "severity": "Warning", "location": "api/users.py:42", "message": "Missing error handling in fetchUser()" },
    { "type": "Security", "severity": "Critical", "location": "utils/db.py:18", "message": "Raw SQL string interpolation — use parameterized queries." }
  ],
  "style_notes": [
    { "type": "Style", "severity": "Info", "location": "components/Navbar.tsx:3", "message": "Unused import: lodash/merge" }
  ],
  "tests": {
    "new_code_has_tests": false,
    "missing_coverage": ["src/ThemeContext.ts"]
  }
}
```

---

### 3.7 Triage Agent

**Purpose:** Classify and prioritize incoming issues automatically.

**Tools Used:**
- `github_api.get_issue(issue_url)` — reads full issue.
- `llm.complete(prompt)` — performs classification.

**Priority Signal Heuristics (passed to LLM as context):**

| Signal | Priority Boost |
|---|---|
| Words: "crash", "data loss", "security", "broken in production" | High → Critical |
| Words: "performance", "slow", "timeout" | Medium → High |
| Words: "typo", "docs", "suggestion" | Low |
| Issue from a known maintainer account | +1 priority level |

**Output Schema:**

```json
{
  "issue_type": "Bug",
  "affected_area": "Frontend",
  "priority": "Low",
  "suggested_labels": ["bug", "frontend", "good-first-issue"],
  "suggested_assignee_query": "match_contributor"
}
```

---

### 3.8 Duplicate Issue Agent

**Purpose:** Detect whether a new issue is a duplicate of an existing one.

**Tools Used:**
- `chroma.embed_and_upsert(issue)` — adds new issue to the vector store.
- `chroma.query(embedding, n_results=5)` — retrieves nearest neighbors.
- `llm.complete(prompt)` — performs semantic similarity verification for top candidates.

**Pipeline:**

```
New Issue Text
      │
      ▼
Embed with Gemini text-embedding-004
      │
      ▼
Query Chroma (top-5 nearest by cosine similarity)
      │
      ▼
For each candidate: cosine_score ≥ 0.75?
      │ Yes
      ▼
LLM verifies semantic equivalence
      │
      ▼
Score ≥ 85 → Flag as Duplicate
```

**Output Schema:**

```json
{
  "is_duplicate": true,
  "similar_issues": [
    { "issue_number": 320, "title": "Login page throws 500 error", "similarity_score": 91 }
  ],
  "recommended_action": "Close #451 and reference #320.",
  "draft_comment": "This issue appears to be a duplicate of #320. Please follow that thread for updates."
}
```

---

### 3.9 Label Agent

**Purpose:** Suggest GitHub labels for a new issue or PR.

**Tools Used:**
- `github_api.get_repo_labels(repo_url)` — fetches all defined labels.
- `github_api.get_recent_issues_with_labels(repo_url, limit=100)` — fetches recently labeled issues for few-shot examples.
- `llm.complete(prompt)` — suggests labels from the allowed set.

**Output Schema:**

```json
{
  "suggested_labels": ["documentation", "enhancement", "beginner-friendly", "backend"],
  "confidence": { "documentation": 0.97, "enhancement": 0.88, "beginner-friendly": 0.74 }
}
```

---

### 3.10 Contributor Match Agent

**Purpose:** Recommend the best contributors for a given issue.

**Tools Used:**
- PostgreSQL: reads stored contributor skill profiles.
- `github_api.get_merged_prs(username)` — used on first-time profile build.
- `llm.complete(prompt)` — reasons about match quality.

**Skill Profile Build Logic:**

For each contributor in the repo:
1. Fetch merged PRs from GitHub API.
2. Extract: files changed, languages used, labels on PR, PR recency.
3. Store structured profile in PostgreSQL.
4. Refresh profile on each new PR merge event via GitHub webhook.

**Ranking Factors:**

| Factor | Weight |
|---|---|
| Overlap between issue area and contributor's top areas | 40% |
| Number of merged PRs in the issue's language | 30% |
| Recency of last contribution | 20% |
| Self-reported availability (optional profile flag) | 10% |

**Output Schema:**

```json
{
  "recommendations": [
    {
      "rank": 1,
      "username": "krish",
      "reason": "8 merged React PRs, 3 CSS theming contributions in the last 30 days.",
      "score": 91
    },
    {
      "rank": 2,
      "username": "prateek",
      "reason": "3 theming PRs last month, active contributor.",
      "score": 78
    }
  ],
  "excluded": ["alice (inactive > 30 days)", "bob (no frontend PRs)"]
}
```

---

### 3.11 Project Health Agent

**Purpose:** Aggregate repository health metrics and generate summary reports.

**Tools Used:**
- `github_api.list_issues(state, since)` — fetches open/closed issues.
- `github_api.list_pull_requests(state, since)` — fetches PR activity.
- `llm.complete(prompt)` — generates narrative report summary.

**Metrics Computed:**

| Metric | Source |
|---|---|
| Total open issues | GitHub Issues API |
| Issues closed in period | GitHub Issues API |
| Active contributors (unique PR authors in period) | GitHub PRs API |
| Avg PR merge time | PR created_at vs merged_at |
| Stale PRs (open > 14 days without activity) | GitHub PRs API |

**Report Output Schema:**

```json
{
  "period": "2026-05-22 to 2026-06-22",
  "open_issues": 85,
  "closed_this_period": 34,
  "active_contributors": 23,
  "avg_pr_merge_days": 2.4,
  "stale_prs": 7,
  "narrative": "The project maintained steady momentum this month with 34 issues resolved..."
}
```

---

## 4. Data Models

### 4.1 PostgreSQL Schemas

#### Repositories

```sql
CREATE TABLE repositories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id     BIGINT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    full_name     TEXT NOT NULL,            -- e.g. "owner/repo"
    description   TEXT,
    language      TEXT,
    stars         INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### Issues

```sql
CREATE TABLE issues (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    github_id     BIGINT NOT NULL,
    number        INTEGER NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT,
    labels        TEXT[],                   -- array of label names
    difficulty    TEXT,                     -- Beginner / Intermediate / Advanced
    issue_type    TEXT,                     -- Bug / Feature / Docs / Question
    priority      TEXT,                     -- Low / Medium / High / Critical
    state         TEXT NOT NULL,            -- open / closed
    embedding_id  TEXT,                     -- Chroma document ID
    created_at    TIMESTAMPTZ,
    closed_at     TIMESTAMPTZ,
    UNIQUE (repository_id, number)
);
```

#### Contributors

```sql
CREATE TABLE contributors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        TEXT UNIQUE NOT NULL,
    display_name    TEXT,
    skills          JSONB,                  -- { "React": 8, "Python": 3, ... }
    top_areas       TEXT[],                 -- ["Frontend", "Backend"]
    merged_pr_count INTEGER DEFAULT 0,
    last_active_at  TIMESTAMPTZ,
    repositories    TEXT[],                 -- full_name list
    profile_built_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Sessions

```sql
CREATE TABLE sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT,                     -- GitHub username
    state_json    JSONB,                    -- LangGraph state snapshot
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    expires_at    TIMESTAMPTZ
);
```

### 4.2 Chroma Collection Schema

**Collection name:** `issues`

| Field | Type | Description |
|---|---|---|
| `id` | `str` | `{repo_full_name}:{issue_number}` |
| `document` | `str` | `"{title}\n{description}"` |
| `embedding` | `float[]` | Generated by Gemini text-embedding-004 (768-dim) |
| `metadata.repo` | `str` | Repository full name |
| `metadata.issue_number` | `int` | GitHub issue number |
| `metadata.state` | `str` | `open` or `closed` |

### 4.3 Redis Key Conventions

| Key Pattern | TTL | Description |
|---|---|---|
| `session:{session_id}` | 30 min | LangGraph session state |
| `rate:{github_token_hash}` | 1 hour | GitHub API rate limit counter |
| `cache:repo_tree:{repo_full_name}` | 15 min | Repo file tree cache |
| `cache:issue:{repo}:{number}` | 5 min | Issue content cache |

---

## 5. API Specifications

### Base URL
`https://api.osmentee.dev/v1`

### Authentication
All endpoints require a GitHub OAuth Bearer token in the `Authorization` header.

```
Authorization: Bearer {github_oauth_token}
```

---

### 5.1 Endpoint: Analyze Repository

```
POST /contributor/analyze-repo
```

**Request Body:**

```json
{
  "repo_url": "https://github.com/owner/repo"
}
```

**Response 200:**

```json
{
  "session_id": "uuid",
  "tech_stack": { "frontend": "React", "backend": "FastAPI", "database": "PostgreSQL" },
  "key_directories": [
    { "path": "src/", "description": "Main application logic" }
  ],
  "entry_points": ["main.py"]
}
```

---

### 5.2 Endpoint: Explain Issue

```
POST /contributor/explain-issue
```

**Request Body:**

```json
{
  "issue_url": "https://github.com/owner/repo/issues/120",
  "session_id": "uuid"
}
```

**Response 200:** Returns `IssueAgent` output schema (see Section 3.3).

---

### 5.3 Endpoint: Generate Fix Plan

```
POST /contributor/fix-plan
```

**Request Body:**

```json
{
  "issue_url": "https://github.com/owner/repo/issues/120",
  "repo_url": "https://github.com/owner/repo",
  "session_id": "uuid"
}
```

**Response 200:** Returns combined `CodeAgent` + `FixAgent` output.

---

### 5.4 Endpoint: Review PR

```
POST /review/pr
```

**Request Body:**

```json
{
  "pr_url": "https://github.com/owner/repo/pull/203",
  "mode": "contributor",
  "session_id": "uuid"
}
```

**Response 200:** Returns `ReviewAgent` output schema (see Section 3.6).

---

### 5.5 Endpoint: Triage Issue (Admin)

```
POST /admin/triage
```

**Request Body:**

```json
{
  "issue_url": "https://github.com/owner/repo/issues/451",
  "repo_url": "https://github.com/owner/repo"
}
```

**Response 200:** Returns `TriageAgent` output schema (see Section 3.7).

---

### 5.6 Endpoint: Detect Duplicate

```
POST /admin/detect-duplicate
```

**Request Body:**

```json
{
  "issue_url": "https://github.com/owner/repo/issues/451",
  "repo_url": "https://github.com/owner/repo",
  "similarity_threshold": 85
}
```

**Response 200:** Returns `DuplicateIssueAgent` output schema (see Section 3.8).

---

### 5.7 Endpoint: Project Health Report

```
GET /admin/health/{repo_full_name}?period=30d
```

**Response 200:** Returns `ProjectHealthAgent` output schema (see Section 3.11).

---

### 5.8 Webhook: GitHub Issue Events

```
POST /webhooks/github
```

Receives GitHub webhook events. Processes the following event types:

| Event | Action |
|---|---|
| `issues` `opened` | Triggers Triage → Label → Duplicate chain |
| `pull_request` `closed` (merged) | Updates contributor profile |
| `issues` `closed` | Updates issue state in PostgreSQL + Chroma |

**GitHub Webhook Secret:** validated via HMAC-SHA256 signature on `X-Hub-Signature-256` header.

---

## 6. Infrastructure & Tech Stack

### 6.1 AI Layer

| Component | Technology | Purpose |
|---|---|---|
| Agent orchestration | LangGraph | Stateful multi-agent graph execution |
| LLM chains | LangChain | Prompt templates, tool wrappers, output parsers |
| LLM model | Gemini 1.5 Pro | Reasoning, code analysis, summarization |
| Embeddings | Gemini text-embedding-004 | Issue similarity vectors |
| Vector store | Chroma (self-hosted) | Semantic similarity search for duplicate detection |

### 6.2 Backend

| Component | Technology | Notes |
|---|---|---|
| API framework | FastAPI | Async, OpenAPI docs auto-generated |
| Task queue | Not required in v1 | Agents execute synchronously per request |
| ORM | SQLAlchemy + Alembic | Schema migrations via Alembic |
| GitHub client | PyGithub + custom wrapper | Token pooling built into wrapper |

### 6.3 Storage

| Component | Technology | Notes |
|---|---|---|
| Primary database | PostgreSQL 16 | Repositories, issues, contributors, sessions |
| Cache / rate-limit | Redis 7 | Session state, API cache, rate counters |
| Vector store | Chroma | Embedded in FastAPI process in v1; standalone service in v2 |

### 6.4 Frontend

| Component | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + static pages |
| UI library | React 18 | |
| Styling | Tailwind CSS | |
| Auth | NextAuth.js (GitHub OAuth) | |
| API client | Axios + React Query | |

### 6.5 Infrastructure

| Component | Technology | Notes |
|---|---|---|
| Containerization | Docker + Docker Compose (dev) | |
| Orchestration | Kubernetes (prod) | Horizontal pod autoscaling on FastAPI |
| Reverse proxy | Nginx | TLS termination |
| CI/CD | GitHub Actions | Test → Build → Push → Deploy pipeline |
| Container registry | GitHub Container Registry (GHCR) | |

---

## 7. Integration Requirements

### 7.1 GitHub API

- **Auth:** Personal Access Tokens (PAT) or GitHub App installation tokens.
- **Token pooling:** Maintain a pool of ≥ 5 tokens; rotate when remaining rate limit < 100.
- **Scopes required:** `repo` (read), `read:org`, `read:user`.
- **Webhook events required:** `issues`, `pull_request`.
- **Rate limit handling:** Exponential backoff with jitter on 429 responses; cache responses in Redis to reduce API calls.

**Endpoints used:**

| GitHub API | Purpose |
|---|---|
| `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` | Repo file tree |
| `GET /repos/{owner}/{repo}/contents/{path}` | File content |
| `GET /repos/{owner}/{repo}/issues/{number}` | Issue content |
| `GET /repos/{owner}/{repo}/pulls/{number}` | PR metadata |
| `GET /repos/{owner}/{repo}/pulls/{number}/files` | PR diff |
| `GET /repos/{owner}/{repo}/labels` | Repo labels |
| `GET /users/{username}/repos` | Contributor public repos |
| `GET /search/issues` | Contributor PR history |

### 7.2 Gemini API

- **Model:** `gemini-1.5-pro` for reasoning; `text-embedding-004` for embeddings.
- **Auth:** API key via `GOOGLE_API_KEY` environment variable.
- **Context window:** Up to 1M tokens; file contents are chunked and summarized if repo exceeds 200K tokens.
- **Error handling:** Retry on 503 with exponential backoff; fall back to `gemini-1.5-flash` for non-critical tasks if quota exceeded.

---

## 8. Security Requirements

### 8.1 Authentication & Authorization

- All API endpoints require a valid GitHub OAuth token.
- Tokens are verified against GitHub's API on each request; invalid tokens return 401.
- Admin endpoints additionally verify that the requesting user has `admin` or `maintain` permissions on the target repository via GitHub API.

### 8.2 Secret Management

- All secrets (`GOOGLE_API_KEY`, `GITHUB_WEBHOOK_SECRET`, `DATABASE_URL`, etc.) are stored in environment variables injected via Kubernetes Secrets.
- No secrets in source code or Docker images.
- GitHub OAuth secrets stored in NextAuth.js server-side only; never exposed to the client.

### 8.3 Data Handling

- Repository file content is fetched on-demand and not persisted beyond the Redis session TTL (30 minutes).
- Only issue metadata and contributor profiles are stored persistently in PostgreSQL.
- Vector embeddings in Chroma contain no raw file content — only issue text and metadata.

### 8.4 Webhook Validation

- All incoming webhook requests are validated via HMAC-SHA256 signature check on `X-Hub-Signature-256`.
- Invalid signatures return 401 and are logged.

### 8.5 Input Validation

- All URL inputs are validated as GitHub URLs matching `https://github.com/{owner}/{repo}(/...)?`.
- Issue and PR numbers are validated as positive integers.
- LLM outputs are validated against Pydantic schemas before being returned to the client.

---

## 9. Performance & Scalability

### 9.1 Latency Targets

| Operation | p50 | p95 |
|---|---|---|
| Repo Agent | 10s | 30s |
| Issue Agent | 5s | 15s |
| Code Agent | 10s | 30s |
| Fix Agent | 15s | 45s |
| Review Agent | 20s | 60s |
| Triage Agent | 5s | 20s |
| Duplicate Detection | 5s | 30s |
| Label Agent | 3s | 10s |
| Contributor Match | 5s | 15s |
| Project Health | 10s | 30s |

### 9.2 Throughput

- Target: 1,000 concurrent users during peak events.
- FastAPI pods scale horizontally via Kubernetes HPA targeting 70% CPU utilization.
- Redis handles session state; no server-side affinity required.

### 9.3 Caching Strategy

| Layer | What is cached | TTL |
|---|---|---|
| Redis | Repo file tree | 15 min |
| Redis | Issue content | 5 min |
| Redis | Contributor profile | 1 hour |
| Redis | Project health report | 1 hour |
| Chroma | Issue embeddings | Persistent |

### 9.4 GitHub API Rate Limit Management

- Pool of 5+ tokens; each with 5,000 requests/hour.
- Token selector picks the token with the highest remaining rate limit.
- All cacheable responses (file tree, issue content) are stored in Redis to avoid redundant calls.

---

## 10. Testing Requirements

### 10.1 Unit Tests

Each agent node must have unit tests covering:
- Happy path with valid GitHub inputs.
- Malformed input handling (invalid URLs, missing fields).
- LLM output parsing with valid and malformed JSON.
- GitHub API mocking (no real API calls in unit tests).

**Coverage target:** ≥ 85% line coverage on agent logic.

### 10.2 Integration Tests

- End-to-end test of each full agent chain against a real test repository (`osmentee/test-repo`).
- Duplicate detection test with a seed set of 100 known duplicate pairs.
- Review Agent test with a set of PRs with known bugs and clean PRs.

### 10.3 Load Tests

- Simulate 500 concurrent `/contributor/fix-plan` requests.
- Assert p95 latency ≤ 90 seconds.
- Assert zero 500 errors under load.

Tool: **Locust** or **k6**.

### 10.4 Security Tests

- OWASP ZAP scan on all public API endpoints.
- Dependency vulnerability scan via `pip-audit` and `npm audit` in CI pipeline.
- Webhook signature bypass attempt test.

---

## 11. Deployment & DevOps

### 11.1 Environments

| Environment | Purpose | Deployment |
|---|---|---|
| `local` | Development | Docker Compose |
| `staging` | Integration testing | Kubernetes (single replica) |
| `production` | Live users | Kubernetes (autoscaled) |

### 11.2 CI/CD Pipeline (GitHub Actions)

```
Push to main branch
        │
        ▼
  Run unit tests (pytest)
        │
        ▼
  Run linter (ruff, eslint)
        │
        ▼
  Build Docker image
        │
        ▼
  Push to GHCR
        │
        ▼
  Deploy to staging (kubectl rollout)
        │
        ▼
  Run integration tests
        │
        ▼
  Manual approval gate
        │
        ▼
  Deploy to production
```

### 11.3 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `GOOGLE_API_KEY` | Yes | Gemini API key |
| `GITHUB_TOKENS` | Yes | Comma-separated list of GitHub PATs |
| `GITHUB_WEBHOOK_SECRET` | Yes | HMAC secret for webhook validation |
| `GITHUB_CLIENT_ID` | Yes | OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | OAuth App client secret |
| `CHROMA_HOST` | No | Chroma host (default: localhost) |
| `CHROMA_PORT` | No | Chroma port (default: 8000) |
| `LOG_LEVEL` | No | Logging level (default: INFO) |

---

## 12. Observability

### 12.1 Logging

- Structured JSON logging via Python `structlog`.
- Every agent invocation logs: `agent_name`, `session_id`, `duration_ms`, `input_intent`, `status`.
- Log levels: `DEBUG` (dev), `INFO` (staging/prod), `ERROR` always.
- Logs shipped to a centralized log aggregator (e.g., Loki or CloudWatch).

### 12.2 Metrics

Prometheus metrics exported at `/metrics`:

| Metric | Type | Description |
|---|---|---|
| `agent_invocation_total` | Counter | Total agent calls, labeled by `agent_name` |
| `agent_duration_seconds` | Histogram | Agent latency, labeled by `agent_name` |
| `github_api_calls_total` | Counter | GitHub API calls, labeled by `endpoint` |
| `github_api_rate_limit_remaining` | Gauge | Remaining rate limit per token |
| `llm_tokens_used_total` | Counter | Gemini tokens consumed, labeled by `model` |
| `duplicate_detections_total` | Counter | Duplicate flags raised |

### 12.3 Alerting

| Alert | Condition | Severity |
|---|---|---|
| High p95 latency | `agent_duration_seconds p95 > 90s` for 5 min | Warning |
| GitHub rate limit critical | `github_api_rate_limit_remaining < 200` | Critical |
| Error rate spike | 5xx rate > 5% for 2 min | Critical |
| Chroma connection failure | Health check fails for 3 consecutive checks | Critical |

### 12.4 Tracing

- OpenTelemetry distributed tracing via `opentelemetry-sdk`.
- Each request carries a `trace_id`; all agent spans are children of the root request span.
- Traces exported to Jaeger or Tempo.

---

*End of TRD v1.0*
