// Display-only language; original state and diagnostics remain available in Details.
const statuses = {
  'reserved-but-idle': 'ready to start', queued: 'waiting to start', working: 'in progress', running: 'running',
  'waiting-for-human': 'needs your decision', 'waiting-on-external-system': 'waiting for a response',
  blocked: 'needs help', failed: 'needs a fix', complete: 'completed',
  deployed: 'deployed', verified: 'verified', 'officially-stale': 'update overdue',
  'possibly-stale': 'may need an update', stale: 'last update may be old',
  live: 'up to date', connecting: 'connecting', reconnecting: 'refreshing', offline: 'unavailable',
  enabled: 'scheduled', paused: 'paused', idle: 'ready', waiting_credentials: 'needs access', recorded: 'update received'
};
const phases = { checks: 'checking', held: 'on hold', reserved: 'ready to start', 'liveness-check': 'checking for updates', 'pull-request': 'review', reconciliation: 'resolving a mismatch', planning: 'planning', implementation: 'building', coding: 'building', testing: 'checking', verification: 'verifying', review: 'ready for review', delivery: 'delivery', deployment: 'deployment', complete: 'completed' };
const events = { 'claim-created': 'work reserved', 'runner-heartbeat': 'work status refreshed', 'source-commit': 'changes saved', 'pull-request-opened': 'ready for review', 'pull-request-updated': 'review updated', 'check-started': 'check started', 'check-completed': 'check finished', 'cloud-deployment': 'deployed', 'assignment-claimed': 'work picked up', 'work-started': 'work started', 'commit-created': 'changes saved', 'pr-opened': 'ready for review', 'pr-merged': 'changes merged', 'deployment-started': 'deployment started', 'deployment-completed': 'deployment finished', 'verification-passed': 'checks passed', 'verification-failed': 'checks need attention', completed: 'work completed' };
export function statusLabel(value) { return statuses[value] || 'status not reported'; }
export function phaseLabel(value) { return phases[value] || statuses[value] || 'phase not reported'; }
export function eventLabel(value) { return events[value] || 'progress update'; }
export function summaryText(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== 'string') return fallback;
  // Infrastructure diagnostics belong in optional Details, not the glance summary.
  if (/[a-f0-9]{12,}|(?:apps|packages|src)\/|\b(?:PR\s*#?\d+|MCP|SHA|canonical|rebase|commit|payload|worker heartbeat|metadata|ui\/resourceUri|ui\.resourceUri|provenance|claim|source task|USER STOP GATE|preflight|checkout|worktree)\b|Node\.js|\bpackets?\b|\bENOBUFS\b|\/Users\/|\d{4}-\d{2}-\d{2}T\d{2}:|\b(?:stack trace|head_sha|request_id)\b|\bat \S+\([^)]*:\d+/i.test(value)) return fallback;
  const clean=value.replace(/\s+/g,' ').trim();
  return clean.length>180?clean.slice(0,177).replace(/\s+\S*$/,'')+'…':clean;
}

// Source records stay intact. Only this display model is shortened for people.
export function assignmentPresentation(item = {}) {
  const request=item.attention_request || {};
  const phase=phaseLabel(item.stage);
  const fallbackTitle=({implementation:'work in progress',coding:'work in progress',checks:'checking the latest changes',testing:'checking the latest changes',held:'work on hold',review:'work ready to review',complete:'work completed',reconciliation:'work status needs an update'})[item.stage] || 'project work';
  const title=summaryText(request.title || item.display_name || item.title || item.goal,fallbackTitle);
  const fallback=({working:'Work is underway. Open details for the latest update.',complete:'This assignment is recorded as complete.',completed:'This assignment is recorded as complete.',held:'Work is paused. Open details for the reason.', 'waiting-for-human':'A recorded request is waiting for review. Open details to see what is needed.', 'waiting-on-external-system':'Waiting for a running check or external response.', blocked:'The work needs a fix before it can continue.',failed:'A check failed and needs attention.'})[item.state] || 'Open details for the latest recorded update.';
  return {title,detail:summaryText(request.question || item.waiting_reason || item.recovery_action || item.next_action,fallback),next:summaryText(item.next_action,'Open details for the next step.'),phase};
}
