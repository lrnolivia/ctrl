// Operational failures are for agents to resolve. Only an explicit human request
// belongs in the owner's review/decision queue; completion alone is not a request.
export function needsHumanReview(item = {}) {
  if (['cancelled', 'superseded', 'archived'].includes(item.state)) return false;
  const request = item.attention_request;
  if (request && typeof request === 'object') {
    return ['review', 'decision'].includes(request.kind) && request.status === 'pending';
  }
  return item.state === 'waiting-for-human';
}
