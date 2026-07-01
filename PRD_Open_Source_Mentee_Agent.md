# Product Requirements Document (PRD)
## Open Source Mentee Agent

**Version:** 1.1  
**Status:** Active  
**Date:** July 2026  
**Owner:** Product Team  
**Scope:** Contributor-only (Admin features removed in v1.1)

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

Open Source Mentee Agent is a multi-agent AI platform built exclusively for **open-source contributors** — developers who want to make meaningful contributions to public repositories but struggle with codebase orientation, issue comprehension, and pre-submission quality.

The platform automates codebase orientation, issue analysis, file discovery, implementation planning, and PR review using a LangGraph + Gemini orchestrated agent pipeline. It is purpose-built for high-volume open-source events like **Google Summer of Code (GSoC)** and **Hacktoberfest**, where thousands of new contributors engage simultaneously.

### What changed in v1.1

All admin/maintainer features (automated triage, duplicate detection, label agent, contributor matching, health dashboards) have been **removed from scope** to focus the product on delivering the best possible contributor experience. The user role selection screen has been replaced by a **GitHub username onboarding flow** that personalizes the workspace with real GitHub profile data.

---

## 2. Problem Statement

### For Contributors

- New developers are overwhelmed by large, unfamiliar codebases and don't know where to start.
- GitHub issues are written for experienced maintainers, making them opaque to newcomers.
- Finding the correct files to modify requires manual exploration and code archaeology.
- PRs are submitted with avoidable bugs, style violations, and missing tests — leading to rejection and discouragement.
- Contributors lack a personalized workspace that tracks their progress and guides their next steps.

---

## 3. Goals & Success Metrics

### Goals

- Reduce time-to-first-contribution for new developers by providing automated codebase orientation and issue simplification.
- Improve PR quality before submission through automated pre-review.
- Create a personalized, gamified contributor workspace that encourages sustained participation.

### Success Metrics

| Metric | Target |
|---|---|
| Time to first contribution (contributor) | Reduced by 40% vs. baseline |
| PR acceptance rate on first submission | Increased by 30% |
| Average session length in contributor workspace | ≥ 8 minutes |
| GitHub username onboarding completion rate | ≥ 85% |
| Weekly active users (WAU) at 6 months | 5,000+ |

---

## 4. Target Users & Personas

### Persona 1 — The Newcomer Contributor

**Name:** Arjun, 21, CS undergraduate  
**Goal:** Make his first open source contribution for GSoC selection  
**Pain Points:** Overwhelmed by large codebases, doesn't understand GitHub issues, afraid of being rejected  
**Needs:** Step-by-step guidance, file-level context, implementation hints, a workspace that feels made for him

### Persona 2 — The Intermediate Contributor

**Name:** Sanya, 25, junior developer  
**Goal:** Build her open source portfolio and get visibility in the community  
**Pain Points:** Can read code but struggles with tracing full request flows and edge cases  
**Needs:** Code flow mapping, fix suggestions, pre-submission PR review, progress tracking

---

## 5. User Stories

### Onboarding

**US-O-01 — GitHub Username Entry**  
*As a contributor,* I want to enter my GitHub username when I first arrive so that my workspace is personalized with my real profile, repositories, and stats.

**US-O-02 — Profile Validation**  
*As a contributor,* I want real-time feedback as I type my username (including an avatar preview) so that I can confirm my identity before entering the workspace.

**US-O-03 — Persistent Session**  
*As a contributor,* I want my GitHub username to be remembered across sessions so that I don't have to re-enter it every visit.

**US-O-04 — Switch Account**  
*As a contributor,* I want a "Switch Account" option in the sidebar so that I can change my GitHub identity without clearing browser storage manually.

### Contributor Workspace

**US-C-01 — Personalized Dashboard**  
*As a contributor,* I want my dashboard to show my real GitHub stats (repos, followers, stars, top repositories) so that my workspace feels personalized and motivating.

**US-C-02 — Codebase Orientation**  
*As a contributor,* I want to drop a GitHub repository URL and receive a structured orientation summary so that I can understand the tech stack and key directories without spending hours exploring manually.

**US-C-03 — Issue Simplification**  
*As a contributor,* I want to paste a GitHub issue link and receive a plain-language explanation with difficulty rating and time estimate so that I can decide if it matches my skill level.

**US-C-04 — File Discovery**  
*As a contributor,* I want the platform to automatically identify which files I need to modify for a given issue so that I don't waste time grepping through the entire codebase.

**US-C-05 — Implementation Guidance**  
*As a contributor,* I want a numbered step-by-step fix plan with code snippets so that I can implement the solution confidently.

**US-C-06 — Pre-Submission PR Review**  
*As a contributor,* I want to submit my PR link and receive structured feedback on bugs, security issues, style violations, and missing tests before I open the PR publicly.

**US-C-07 — Good First Issue Feed**  
*As a contributor,* I want to browse a filtered feed of beginner-friendly issues so that I can quickly identify where to start.

---

## 6. Feature Requirements

### 6.1 Onboarding — GitHub Username Flow

#### F-O-01: GitHub Username Entry & Validation

**Priority:** P0 (Must Have)

The system shall:
- Present a dedicated onboarding page (`/onboarding`) when no GitHub username is stored.
- Accept a GitHub username via text input.
- Debounce input by 500ms before triggering validation.
- Validate the username format with regex before making an API call.
- Fetch the user's public profile from `api.github.com/users/{username}`.
- Display a real-time profile preview (avatar, display name, bio, repo count, follower count) upon successful fetch.
- Enable the "Enter Workspace" CTA only after profile is confirmed.
- Store `gh_username` and `gh_profile` (JSON) in `localStorage` on confirmation.
- Redirect to `/contributor/issues` after confirmation.

**Acceptance Criteria:**
- Profile preview appears within 1 second of debounce resolving for valid usernames.
- Invalid usernames show a clear error message without triggering an API call.
- Non-existent GitHub usernames show a "not found" error.
- Stored session persists across browser restarts.

---

#### F-O-02: Persistent Session & Smart Redirect

**Priority:** P0 (Must Have)

The system shall:
- Check `localStorage` for a saved `gh_username` on every route load within `/contributor/*`.
- Redirect to `/onboarding` if no username is found.
- Allow users to reset their session via a "Switch Account" button in the contributor sidebar.

---

### 6.2 Contributor Dashboard

#### F-C-00: Personalized Dashboard

**Priority:** P0 (Must Have)

The system shall:
- Read the stored `gh_profile` from `localStorage` and fetch fresh data from the GitHub API.
- Display: avatar, display name, GitHub handle, bio, repo count, follower count, following count.
- Compute and display a dynamic **Level** and **XP** system based on: `(public_repos × 120) + (total_stars × 30) + (followers × 50)`.
- Show a **contributor class** badge (C/B/A/S-Class) derived from computed level.
- Render a **bar chart** of the user's top 5 repositories by star count.
- Render a **repository list** showing repo name, description, language (with color dot), stars, and forks.
- Display a **level progress ring** (circular SVG progress) with animated fill.
- Show skill tracker bars and active agent party cards.

---

#### F-C-01: Repo Agent — Repository Orientation

**Priority:** P0 (Must Have)

The system shall:
- Accept a public GitHub repository URL as input.
- Automatically read the repository folder structure, README, and key documentation files.
- Detect the tech stack (frontend framework, backend language/framework, database).
- Return a structured orientation summary listing tech stack and key directories.

**Acceptance Criteria:**
- Orientation summary returned within 30 seconds for repositories up to 50,000 lines of code.
- Tech stack detection accuracy ≥ 90% across the 50 most popular language/framework combinations.
- Output highlights at minimum 3–5 key directories with plain-English descriptions.

---

#### F-C-02: Issue Agent — Issue Simplification

**Priority:** P0 (Must Have)

The system shall:
- Accept a public GitHub issue URL as input.
- Fetch and parse the full issue title, description, and linked comments.
- Rewrite the issue in plain English.
- Classify difficulty as Beginner, Intermediate, or Advanced.
- Provide a rough time estimate.

**Acceptance Criteria:**
- Issue summary returned within 15 seconds.
- Difficulty classification aligns with maintainer labels in ≥ 80% of cases.

---

#### F-C-03: Code Agent — File & Flow Discovery

**Priority:** P0 (Must Have)

The system shall:
- Receive issue context from the Issue Agent.
- Trace the codebase to identify files most likely affected by the issue.
- Map the call graph and dependency chain.
- Return a structured list of files with their roles.

**Acceptance Criteria:**
- At least 80% of truly affected files are identified.
- The output includes a human-readable call trace or dependency map.

---

#### F-C-04: Fix Agent — Implementation Plan

**Priority:** P1 (Should Have)

The system shall:
- Receive code context from the Code Agent.
- Generate a numbered implementation plan with step-by-step instructions.
- Include minimal code snippets for each step.
- Flag known edge cases and potential regressions.

---

#### F-C-05: Review Agent — Pre-Submission PR Review

**Priority:** P1 (Should Have)

The system shall:
- Accept a GitHub PR URL as input.
- Fetch and analyze the PR diff.
- Return structured feedback categorized as: Bugs / Security Issues / Style Violations / Missing Tests.

**Acceptance Criteria:**
- Review feedback returned within 60 seconds for PRs with fewer than 500 changed lines.
- Known security issues flagged with ≥ 90% recall.

---

#### F-C-06: Good First Issue Feed

**Priority:** P2 (Nice to Have)

The system shall:
- Aggregate `good-first-issue` tagged issues across configured repositories.
- Present a ranked, paginated feed.

---

## 7. Non-Functional Requirements

### Performance

- API response time for single-agent operations: ≤ 30 seconds (p95).
- API response time for multi-agent orchestrated flows: ≤ 90 seconds (p95).
- GitHub username validation and profile preview: ≤ 1 second (p95).
- System must support 1,000 concurrent users during Hacktoberfest-scale events.

### Reliability

- Platform uptime: ≥ 99.5% monthly.
- Graceful degradation: if a sub-agent fails, the orchestrator returns a partial result rather than a full error.
- If GitHub API is unavailable during onboarding, display a clear error and allow retry.

### Security

- No GitHub tokens or secrets are stored in `localStorage`.
- Only public GitHub data is fetched; no OAuth or private repo access is required.
- No repository code is persisted beyond the session context window.

### Privacy

- Contributor profiles are derived only from public GitHub data.
- Stored `gh_profile` in `localStorage` can be cleared at any time via "Switch Account".

### Scalability

- The system must scale horizontally via containerized deployment.

### Accessibility

- The frontend UI must meet WCAG 2.1 AA compliance.

---

## 8. Out of Scope (v1.1)

- **Admin/Maintainer features:** Automated triage, duplicate detection, label agent, contributor matching, project health dashboards — removed from v1.1 scope.
- Direct code editing or automated PR creation on behalf of the contributor.
- Support for private repositories without explicit OAuth grant.
- Integration with non-GitHub version control platforms (GitLab, Bitbucket).
- Support for monorepos larger than 500,000 lines of code.
- Real-time chat or pair-programming features.
- Billing or subscription management UI.
- GitHub OAuth login (v1.1 uses public API with username-only entry).

---

## 9. Assumptions & Dependencies

- GitHub's public API is available and rate limits are manageable for profile + repo fetching.
- The Gemini API provides sufficient context window length for large file analysis.
- Chroma vector store can be self-hosted within the platform's infrastructure.
- Users have a public GitHub account (private accounts will fail the username lookup).
- `localStorage` is available in the user's browser (standard for all modern browsers).

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GitHub API rate limiting during onboarding | Medium | Medium | Cache profile in `localStorage`; show fallback if rate-limited |
| LLM hallucination in fix suggestions | Medium | High | Add confidence scoring and disclaimer on all AI-generated code snippets |
| Users entering a wrong GitHub username | Medium | Low | Profile preview with avatar confirmation before proceeding |
| `localStorage` cleared between sessions | Low | Low | Re-prompt onboarding gracefully; no data loss since profile is re-fetched |
| GitHub API breaking changes | Low | High | Abstract GitHub API calls behind an internal client layer |

---

## 11. Timeline & Milestones

| Milestone | Target |
|---|---|
| M1: GitHub Username Onboarding + Personalized Dashboard | ✅ Complete |
| M2: Core Contributor Flow (Repo + Issue + Code Agent) | Week 6 |
| M3: Fix Agent + Review Agent | Week 10 |
| M4: Good First Issue Feed + Polish | Week 14 |
| M5: Beta Launch (GSoC / Hacktoberfest pilot) | Week 18 |
| M6: GA Release | Week 22 |

---

*End of PRD v1.1 — Contributor-only scope*
