# Product Requirements Document (PRD)
## Open Source Mentee Agent

**Version:** 1.0  
**Status:** Draft  
**Date:** June 2026  
**Owner:** Product Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users & Personas](#4-target-users--personas)
5. [User Stories](#5-user-stories)
6. [Feature Requirements](#6-feature-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Out of Scope](#8-out-of-scope)
9. [Assumptions & Dependencies](#9-assumptions--dependencies)
10. [Risks](#10-risks)
11. [Timeline & Milestones](#11-timeline--milestones)

---

## 1. Executive Summary

Open Source Mentee Agent is a multi-agent AI platform that serves two distinct audiences: **Contributors** (developers seeking to make meaningful open source contributions) and **Project Admins** (maintainers who manage repositories at scale). The platform automates issue analysis, code orientation, contribution guidance, triage, labeling, and project health monitoring — reducing friction for contributors and toil for maintainers.

The platform is purpose-built for high-volume open source events like **Google Summer of Code (GSoC)**, **Hacktoberfest**, and **Nexus Spring of Code**, where thousands of contributors and maintainers interact simultaneously.

---

## 2. Problem Statement

### For Contributors

- New developers struggle to understand unfamiliar codebases and don't know where to start.
- GitHub issues are written for existing contributors, making them opaque to newcomers.
- Finding the right files to modify requires manual grep-ing and code archaeology.
- PRs are submitted with avoidable bugs, style violations, and missing tests — wasting everyone's time.

### For Project Admins

- Maintainers spend hours manually labeling, triaging, and routing issues.
- Duplicate issue reports create backlog noise and slow down resolution.
- Matching the right contributor to the right issue is done by intuition, not data.
- Project health signals (PR merge time, stale PRs, active contributors) are scattered across GitHub's UI.

---

## 3. Goals & Success Metrics

### Goals

- Reduce time-to-first-contribution for new developers by providing automated codebase orientation and issue simplification.
- Reduce maintainer triage time by automating labeling, duplicate detection, and contributor matching.
- Improve PR quality before submission through automated pre-review.
- Provide actionable project health insights to maintainers on a recurring basis.

### Success Metrics

| Metric | Target |
|---|---|
| Time to first contribution (contributor) | Reduced by 40% vs. baseline |
| Maintainer triage time per issue | Reduced by 60% |
| PR acceptance rate on first submission | Increased by 30% |
| Duplicate issue detection accuracy | ≥ 85% precision |
| Contributor matching satisfaction score | ≥ 4.0 / 5.0 |
| Weekly active users (WAU) at 6 months | 5,000+ |

---

## 4. Target Users & Personas

### Persona 1 — The Newcomer Contributor

**Name:** Arjun, 21, CS undergraduate  
**Goal:** Make his first open source contribution for GSoC selection  
**Pain Points:** Overwhelmed by large codebases, doesn't understand GitHub issues, afraid of being rejected  
**Needs:** Step-by-step guidance, file-level context, implementation hints

### Persona 2 — The Intermediate Contributor

**Name:** Sanya, 25, junior developer  
**Goal:** Build her open source portfolio and get visibility in the community  
**Pain Points:** Can read code but struggles with tracing full request flows and edge cases  
**Needs:** Code flow mapping, fix suggestions, pre-submission PR review

### Persona 3 — The Project Admin / Maintainer

**Name:** Rohan, 30, senior engineer maintaining a popular OSS library  
**Goal:** Keep the project healthy and growing without burning out  
**Pain Points:** Too many unlabeled issues, duplicate reports, unqualified contributors picking up complex tickets  
**Needs:** Automated triage, labeling, contributor matching, health dashboards

---

## 5. User Stories

### Contributor Stories

**US-C-01 — Codebase Orientation**  
*As a contributor,* I want to drop a GitHub repository URL and receive a structured orientation summary so that I can understand the tech stack and key directories without spending hours exploring manually.

**US-C-02 — Issue Simplification**  
*As a contributor,* I want to paste a GitHub issue link and receive a plain-language explanation with difficulty rating and time estimate so that I can decide if it matches my skill level.

**US-C-03 — File Discovery**  
*As a contributor,* I want the platform to automatically identify which files I need to modify for a given issue so that I don't waste time grepping through the entire codebase.

**US-C-04 — Implementation Guidance**  
*As a contributor,* I want a numbered step-by-step fix plan with code snippets so that I can implement the solution confidently without guessing the approach.

**US-C-05 — Pre-Submission PR Review**  
*As a contributor,* I want to submit my PR link and receive structured feedback on bugs, security issues, style violations, and missing tests before I open the PR publicly so that I can avoid rejection.

**US-C-06 — Good First Issue Discovery**  
*As a contributor,* I want to browse a filtered feed of beginner-friendly issues that match my skill profile so that I can quickly identify where to start.

### Admin Stories

**US-A-01 — Automated Issue Triage**  
*As a maintainer,* I want incoming issues to be automatically classified by type, affected area, and priority so that I don't have to read every issue and manually add labels.

**US-A-02 — Duplicate Issue Detection**  
*As a maintainer,* I want new issues to be compared against existing open issues and flagged if they are likely duplicates so that my backlog stays clean.

**US-A-03 — Automated Labeling**  
*As a maintainer,* I want labels to be automatically suggested or applied based on issue content and repo label conventions so that issues are consistently categorized.

**US-A-04 — Contributor Matching**  
*As a maintainer,* I want to see ranked contributor recommendations for each issue based on skill, past contributions, and availability so that I can assign issues to the most qualified person.

**US-A-05 — Project Health Dashboard**  
*As a maintainer,* I want a weekly/monthly report showing open vs closed issue counts, average PR merge time, active contributor count, and stale PR count so that I can monitor project momentum at a glance.

---

## 6. Feature Requirements

### 6.1 Contributor Features

#### F-C-01: Repo Agent — Repository Orientation

**Priority:** P0 (Must Have)

The system shall:
- Accept a public GitHub repository URL as input.
- Automatically read the repository folder structure, README, and key documentation files.
- Detect the tech stack (frontend framework, backend language/framework, database).
- Return a structured orientation summary listing the tech stack and purpose of key directories (e.g., `src/`, `api/`, `components/`).

**Acceptance Criteria:**
- Orientation summary is returned within 30 seconds for repositories up to 50,000 lines of code.
- Tech stack detection accuracy is ≥ 90% across the 50 most popular language/framework combinations.
- Output highlights at minimum 3–5 key directories with plain-English descriptions.

---

#### F-C-02: Issue Agent — Issue Simplification

**Priority:** P0 (Must Have)

The system shall:
- Accept a public GitHub issue URL as input.
- Fetch and parse the full issue title, description, and linked comments.
- Rewrite the issue in plain English, stripping jargon.
- Classify issue difficulty as Beginner, Intermediate, or Advanced.
- Provide a rough time estimate for implementation.

**Acceptance Criteria:**
- Issue summary is returned within 15 seconds.
- Difficulty classification aligns with maintainer labels (good-first-issue, etc.) in ≥ 80% of cases.
- Time estimates are within ±50% of actual median implementation time in user testing.

---

#### F-C-03: Code Agent — File & Flow Discovery

**Priority:** P0 (Must Have)

The system shall:
- Receive issue context from the Issue Agent.
- Trace the codebase to identify files most likely affected by the issue.
- Map the call graph and dependency chain from the entry point to the affected area.
- Return a structured list of files with their roles.

**Acceptance Criteria:**
- At least 80% of truly affected files are identified in the returned list.
- The output includes a human-readable call trace or dependency map.

---

#### F-C-04: Fix Agent — Implementation Plan

**Priority:** P1 (Should Have)

The system shall:
- Receive code context from the Code Agent.
- Generate a numbered implementation plan with step-by-step instructions.
- Include minimal code snippets for each step.
- Flag known edge cases and potential regressions.

**Acceptance Criteria:**
- Implementation plans are evaluated as "helpful" or "very helpful" by ≥ 75% of test contributors.
- Edge case flagging covers at least the most common failure modes identified in similar issues.

---

#### F-C-05: Review Agent — Pre-Submission PR Review (Contributor Mode)

**Priority:** P1 (Should Have)

The system shall:
- Accept a GitHub PR URL as input.
- Fetch and analyze the PR diff.
- Return structured feedback categorized as: Bugs / Security Issues / Style Violations / Missing Tests.
- Check that new code includes test coverage.

**Acceptance Criteria:**
- Review feedback is returned within 60 seconds for PRs with fewer than 500 changed lines.
- Known security issues (XSS, SQL injection, exposed secrets) are flagged with ≥ 90% recall.

---

#### F-C-06: Good First Issue Feed

**Priority:** P2 (Nice to Have)

The system shall:
- Aggregate `good-first-issue` tagged issues across configured repositories.
- Filter by contributor skill profile (derived from their GitHub history).
- Present a ranked, paginated feed.

---

### 6.2 Admin Features

#### F-A-01: Triage Agent — Automated Issue Triage

**Priority:** P0 (Must Have)

The system shall:
- Trigger automatically when a new issue is opened in a connected repository.
- Classify the issue type (Bug / Feature / Docs / Question).
- Detect the affected area (Frontend / Backend / Infrastructure / Other).
- Set a priority level (Low / Medium / High / Critical) based on impact signals in the issue body.
- Return or apply triage results within 60 seconds of issue creation.

---

#### F-A-02: Duplicate Issue Agent — Similarity Detection

**Priority:** P0 (Must Have)

The system shall:
- Embed incoming issue text using a vector model.
- Compare the embedding against all open issues in the repository.
- Return a similarity score (0–100%) for the top matches.
- Flag the issue as a probable duplicate if similarity exceeds a configurable threshold (default: 85%).
- Suggest a reference comment draft linking to the original issue.

**Acceptance Criteria:**
- Duplicate detection precision ≥ 85% and recall ≥ 80% on a held-out test set of known duplicates.
- Latency ≤ 30 seconds for repositories with up to 10,000 open issues.

---

#### F-A-03: Label Agent — Automated Labeling

**Priority:** P0 (Must Have)

The system shall:
- Read the repo's existing label configuration.
- Suggest a relevant label set combining type, area, and difficulty labels.
- Learn from the repo's existing labeling patterns.
- Flag unlabeled PRs before merge.

---

#### F-A-04: Contributor Match Agent

**Priority:** P1 (Should Have)

The system shall:
- Build contributor skill profiles from merged PR history (language, area, frequency).
- Match issue requirements to contributor profiles.
- Factor in recency of activity (deprioritize contributors inactive > 30 days).
- Return 2–3 ranked recommendations with brief reasoning.

---

#### F-A-05: Project Health Agent — Dashboard & Reports

**Priority:** P1 (Should Have)

The system shall:
- Query the GitHub API for repository activity data.
- Track and display: open vs closed issue count, average PR merge time, active contributor count per window, stale PR count (>14 days).
- Generate weekly and monthly summary reports.
- Deliver reports via dashboard UI and optionally via email/webhook.

---

#### F-A-06: AI-Generated Release Notes

**Priority:** P2 (Nice to Have)

The system shall:
- Summarize merged PRs in a configurable time window into a structured changelog.
- Group changes by category (Features, Bug Fixes, Documentation, Breaking Changes).

---

### 6.3 Shared Features

#### F-S-01: Review Agent — Pre-Merge Review (Admin Mode)

Same underlying Review Agent as F-C-05, invoked by maintainers before approving a merge. Context window is populated with admin-side metadata (contributor history, repo standards doc).

---

## 7. Non-Functional Requirements

### Performance

- API response time for single-agent operations: ≤ 30 seconds (p95).
- API response time for multi-agent orchestrated flows: ≤ 90 seconds (p95).
- System must support 1,000 concurrent users during Hacktoberfest-scale events.

### Reliability

- Platform uptime: ≥ 99.5% monthly.
- Graceful degradation: if a sub-agent fails, the orchestrator returns a partial result rather than a full error.

### Security

- All GitHub tokens are stored encrypted at rest and in transit.
- No repository code is persisted beyond the session context window.
- The platform only reads public repositories or repositories where the user has explicitly granted OAuth access.

### Privacy

- Contributor profiles are derived only from public GitHub data.
- Users can request deletion of their stored profile at any time.

### Scalability

- The vector store (Chroma) must support repositories with up to 10,000 open issues.
- The system must scale horizontally via containerized deployment.

### Accessibility

- The frontend UI must meet WCAG 2.1 AA compliance.

---

## 8. Out of Scope

- Direct code editing or automated PR creation on behalf of the contributor.
- Support for private repositories without explicit OAuth grant.
- Integration with non-GitHub version control platforms (GitLab, Bitbucket) in v1.
- Support for monorepos larger than 500,000 lines of code in v1.
- Real-time chat or pair-programming features.
- Billing or subscription management UI.

---

## 9. Assumptions & Dependencies

- GitHub's public API is available and rate limits are manageable with token pooling.
- The Gemini API provides sufficient context window length for large file analysis.
- Chroma vector store can be self-hosted within the platform's infrastructure.
- Users have a GitHub account and are comfortable authenticating via GitHub OAuth.
- Repository maintainers actively configure their label set in GitHub.

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GitHub API rate limiting at scale | High | High | Implement token pooling and caching layer via Redis |
| LLM hallucination in fix suggestions | Medium | High | Add confidence scoring and disclaimer on all AI-generated code snippets |
| Low duplicate detection precision on short issues | Medium | Medium | Set configurable threshold; allow admin override |
| Contributor profile data becoming stale | Medium | Low | Refresh profiles on each new PR merge event |
| GitHub API breaking changes | Low | High | Abstract GitHub API calls behind an internal client layer |

---

## 11. Timeline & Milestones

| Milestone | Target |
|---|---|
| M1: Core Contributor Flow (Repo + Issue + Code Agent) | Week 6 |
| M2: Fix Agent + Review Agent (Contributor Mode) | Week 10 |
| M3: Admin Triage + Label + Duplicate Agent | Week 14 |
| M4: Contributor Match + Health Dashboard | Week 18 |
| M5: Beta Launch (GSoC / Hacktoberfest pilot) | Week 22 |
| M6: GA Release with Release Notes + Good First Issue Feed | Week 26 |

---

*End of PRD v1.0*
