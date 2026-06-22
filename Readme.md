# Open Source Mentee Agent

Open Source Mentee Agent is a multi-agent AI platform designed to bridge the gap between open-source maintainers and contributors. Built for high-volume open-source events like **Google Summer of Code (GSoC)** and **Hacktoberfest**, the platform automates codebase orientation, issue triage, and PR reviews.

By leveraging advanced LLMs and an orchestrated multi-agent graph, this platform reduces friction for new developers and significantly cuts down triage toil for project admins.

---

## 🎯 Key Features

### For Contributors
- **Repo Orientation:** Instantly understand the tech stack and directory structure of any public GitHub repository.
- **Issue Simplification:** Translates complex GitHub issues into beginner-friendly, plain-English summaries with difficulty ratings.
- **Implementation Guidance:** Automatically identifies affected files and generates step-by-step code implementation plans.
- **Pre-Submission Review:** Catch bugs, style violations, and missing tests before opening a public Pull Request.

### For Project Admins
- **Automated Triage:** Automatically classify incoming issues by type, affected area, and priority.
- **Duplicate Detection:** Employs vector similarity search to instantly flag duplicate bug reports.
- **Automated Labeling:** Suggests context-aware GitHub labels based on repository history.
- **Contributor Matching:** Recommends the best available developers for specific issues based on their past merged PRs.
- **Project Health Dashboards:** Gain insights into repository momentum, merge times, and stale PRs.

---

## 🏗️ Architecture & Tech Stack

The platform is designed around a multi-agent orchestrated architecture, dividing tasks among specialized AI sub-agents.

### **Backend**
- **Framework:** FastAPI (Python)
- **Agent Orchestration:** LangGraph & LangChain
- **LLM Engine:** Google Gemini (1.5 Pro) & text-embedding-004
- **Database:** PostgreSQL (SQLAlchemy + Alembic)
- **State/Cache:** Redis
- **Vector Store:** Chroma (for duplicate detection embeddings)

### **Frontend**
- **Framework:** Next.js 14 (App Router)
- **UI & Styling:** React 18 + Tailwind CSS

---

## 🚀 Getting Started

*(Instructions for local setup and configuration will be added here as the development progresses.)*

## 📜 Documentation
- **[Product Requirements Document (PRD)](./PRD_Open_Source_Mentee_Agent.md)**: Detailed project goals, user personas, and feature specifications.
- **[Technical Requirements Document (TRD)](./TRD_Open_Source_Mentee_Agent.md)**: System architecture, agent graphs, data models, and API definitions.

---
**Status:** In Development