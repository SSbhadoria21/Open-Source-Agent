# Open Source Mentee Agent

Open Source Mentee Agent is a multi-agent AI platform designed to accelerate open-source contributions. Built for high-volume open-source events like **Google Summer of Code (GSoC)** and **Hacktoberfest**, the platform automates codebase orientation, issue analysis, implementation planning, and PR review — entirely from the contributor's perspective.

By leveraging advanced LLMs and an orchestrated multi-agent graph powered by **LangGraph + Gemini**, this platform removes the friction that stops new developers from making their first (and second, and third) contribution.

---

## 🎯 Key Features

- **GitHub Onboarding:** Enter your GitHub username to personalize your workspace. Your real profile, repos, and stats power your contributor dashboard — no login required.
- **Repo Orientation:** Instantly understand the tech stack and directory structure of any public GitHub repository.
- **Issue Simplification:** Translates complex GitHub issues into beginner-friendly, plain-English summaries with difficulty ratings and time estimates.
- **File & Flow Discovery:** Automatically identifies which files to modify and maps the call graph for any given issue.
- **Implementation Guidance:** Generates numbered, step-by-step fix plans with code snippets via the Fix Agent.
- **Pre-Submission PR Review:** Catch bugs, style violations, security issues, and missing tests before opening a public Pull Request.
- **Personalized Dashboard:** A gamified contributor profile showing your XP level, top repositories, skill tracker, and active AI agents — all driven from your real GitHub data.

---

## 🏗️ Architecture & Tech Stack

The platform is designed around a multi-agent orchestrated architecture, dividing tasks among specialized AI sub-agents.

### **Backend**
- **Framework:** FastAPI (Python)
- **Agent Orchestration:** LangGraph & LangChain
- **LLM Engine:** Google Gemini (gemini-1.5-flash-lite) & text-embedding-004
- **Database:** PostgreSQL (SQLAlchemy + Alembic)
- **Vector Store:** Chroma (for semantic search)

### **Frontend**
- **Framework:** Next.js 14 (App Router)
- **UI & Styling:** React 18 + Tailwind CSS + Framer Motion
- **Data:** GitHub Public API (no OAuth required for contributors)

---

## 🖥️ User Flow

```
Landing Page
    └── "Start Contributing" / "Explore a Repo"
            └── /onboarding  ← Enter GitHub username
                    └── GitHub profile validated & cached
                            └── /contributor/issues  ← Contributor workspace
```

The `/dashboard` route also performs a smart redirect:
- **Username found** in `localStorage` → goes straight to `/contributor/issues`
- **No username** → redirects to `/onboarding` first

---

## 🤖 Agent Constellation

| Agent | Role |
|---|---|
| **Orchestrator** | LangGraph router — dispatches to sub-agents based on contributor intent |
| **Repo Agent** | Analyzes file tree and README to orient the contributor |
| **Issue Agent** | Fetches and simplifies GitHub issues; classifies difficulty |
| **Code Agent** | Nominates affected files and extracts call graph from source code |
| **Fix Agent** | Generates step-by-step implementation plan from real file contents |
| **Review Agent** | Reviews PR diffs and provides categorized, actionable feedback |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- A Google Gemini API key
- A GitHub personal access token (for backend repo/issue fetching)

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # fill in your API keys
uvicorn app.main:app --reload
```

Open [http://localhost:3000](http://localhost:3000) and click **Start Contributing** to enter your GitHub username and begin.

---

## 📜 Documentation
- **[Product Requirements Document (PRD)](./PRD_Open_Source_Mentee_Agent.md)**: Detailed project goals, user personas, and feature specifications.
- **[Technical Requirements Document (TRD)](./TRD_Open_Source_Mentee_Agent.md)**: System architecture, agent graphs, data models, and API definitions.

---

**Status:** In Development · Contributor-only scope (v1.0)