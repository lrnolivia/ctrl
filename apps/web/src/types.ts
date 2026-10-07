export type ConnectionState = "connecting" | "live" | "reconnecting" | "stale" | "offline";

export type ProgressEvent = {
  id?: string;
  type?: string;
  at?: string;
  [key: string]: unknown;
};

export type ObservedProgress = {
  assignment: string;
  goal?: string | null;
  state?: string;
  stage?: string;
  attention_request?: { kind?: "review" | "decision"; status?: string };
  primary_staff?: string | null;
  supporting_staff?: string[];
  primary_team?: string | null;
  supporting_teams?: string[];
  next_action?: string | null;
  waiting_reason?: string | null;
  recovery_action?: string | null;
  last_meaningful_progress_at?: string | null;
  progress_freshness?: string | null;
  latest_event?: ProgressEvent | null;
  events?: ProgressEvent[];
  worker?: {
    heartbeat_at?: string | null;
    freshness?: string | null;
    age_ms?: number | null;
  };
  identities?: {
    branch?: string | null;
    head_sha?: string | null;
    pr?: number | null;
    merge_commit_sha?: string | null;
    cloud_version_id?: string | null;
    cloud_deployment_id?: string | null;
  };
};

export type ProgressPayload = {
  project: string;
  generated_at?: string;
  observed_progress?: boolean;
  progress?: ObservedProgress[];
  queue?: Array<{
    id?: string;
    assignment?: string;
    goal?: string;
    next_action?: string;
    created_at?: string;
  }>;
};

export type ProjectRegistration = {
  id: string;
  name?: string;
  managed?: boolean;
  created_at?: string;
};

export type RunnerWorker = {
  id: string;
  name?: string;
  enabled?: boolean;
  runtime?: {
    status?: string;
    project_health?: string;
    dependency_health?: string;
    last_run_at?: string | null;
    next_run_at?: string | null;
    last_summary?: string | null;
    last_error?: string | null;
  };
};

export type DashboardSnapshot = {
  observerState?: "available" | "stale" | "unavailable";
  fetchedAt: string;
  coordination?: Record<string,{claims:Array<{id:string;state:string;goal?:string;owner?:string;branch?:string;lease_until?:string;primary_staff?:string|null;primary_team?:string|null;created_at?:string;completed_at?:string}>}>;
  projects: ProjectRegistration[];
  progress: Record<string, ProgressPayload>;
  workers: RunnerWorker[];
  loadingProgress?: string[];
  failedProgress?: string[];
};
