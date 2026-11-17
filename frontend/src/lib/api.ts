/**
 * Centralized API client for the Open Source Mentee Agent backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error || data?.detail || `Request failed with status ${response.status}`
    );
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

// ─── Contributor Endpoints ───────────────────────────────────────────────────

export interface RepoSummary {
  tech_stack: Record<string, string>;
  key_directories: Array<{ path: string; description?: string; desc?: string }>;
  entry_points: string[];
  summary: string;
}

export interface AnalyzeRepoResponse {
  message: string;
  repo_summary: RepoSummary;
}

export async function analyzeRepo(repoUrl: string): Promise<AnalyzeRepoResponse> {
  return apiRequest<AnalyzeRepoResponse>("/contributor/analyze-repo", {
    method: "POST",
    body: JSON.stringify({ repo_url: repoUrl }),
  });
}

export interface IssueSummary {
  title: string;
  plain_summary: string;
  difficulty: string;
  estimated_hours: number;
  affected_areas: string[];
  labels_detected: string[];
}

export interface ExplainIssueResponse {
  message: string;
  issue_summary: IssueSummary;
}

export async function explainIssue(issueUrl: string): Promise<ExplainIssueResponse> {
  return apiRequest<ExplainIssueResponse>("/contributor/explain-issue", {
    method: "POST",
    body: JSON.stringify({ issue_url: issueUrl }),
  });
}

export interface AffectedFile {
  path: string;
  reason: string;
}

export interface FixStep {
  number: number;
  title: string;
  description: string;
  snippet: string;
  files_modified: string[];
}

export interface SourceCitation {
  file_path: string;
  source_url: string;
  heading?: string;
  score?: number;
}

export interface RetrievedChunk {
  text: string;
  file_path: string;
  heading: string;
  source_url: string;
  score: number;
}

export interface FixPlanData {
  steps: FixStep[];
  edge_cases: string[];
  sources?: SourceCitation[];
}

export interface FixPlanResponse {
  message: string;
  issue_summary: IssueSummary;
  affected_files: AffectedFile[];
  call_graph: Record<string, any>;
  fix_plan: FixPlanData;
  retrieved_context?: RetrievedChunk[];
}

export async function getFixPlan(issueUrl: string, repoUrl: string): Promise<FixPlanResponse> {
  return apiRequest<FixPlanResponse>("/contributor/fix-plan", {
    method: "POST",
    body: JSON.stringify({ issue_url: issueUrl, repo_url: repoUrl }),
  });
}

/**
 * Connect to the Server-Sent Events stream for real-time agent execution and RAG progress.
 */
export function streamFixPlan(
  issueUrl: string,
  repoUrl: string,
  onEvent: (eventType: string, data: any) => void,
  onError: (error: any) => void
): () => void {
  const url = `${API_BASE}/contributor/fix-plan-stream?repo_url=${encodeURIComponent(
    repoUrl
  )}&issue_url=${encodeURIComponent(issueUrl)}`;

  const eventSource = new EventSource(url);

  const eventTypes = [
    "pipeline_start",
    "agent_status",
    "indexing_docs",
    "retrieved_context",
    "complete",
    "error",
  ];

  eventTypes.forEach((type) => {
    eventSource.addEventListener(type, (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(type, parsed);
        if (type === "complete" || type === "error") {
          eventSource.close();
        }
      } catch (err) {
        onEvent(type, e.data);
      }
    });
  });

  eventSource.onerror = (err) => {
    eventSource.close();
    onError(err);
  };

  return () => {
    eventSource.close();
  };
}

// ─── Review Endpoint ─────────────────────────────────────────────────────────

export interface ReviewIssue {
  type: string;
  severity: string;
  file: string;
  desc: string;
  fix: string;
}

export interface ReviewPRResponse {
  message: string;
  summary: string;
  grouped_issues: {
    Bugs: ReviewIssue[];
    Security: ReviewIssue[];
    Style: ReviewIssue[];
    Tests: ReviewIssue[];
  };
  tests: {
    new_code_has_tests: boolean;
    missing_coverage: string[];
  };
}

export async function reviewPR(prUrl: string): Promise<ReviewPRResponse> {
  return apiRequest<ReviewPRResponse>("/review/pr", {
    method: "POST",
    body: JSON.stringify({ pr_url: prUrl }),
  });
}
