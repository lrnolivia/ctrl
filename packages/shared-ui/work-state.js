// Reconstructed from approved state distinctions. Ownership is never execution.
const states = {
  working:['working','Work reported in progress','info'], running:['working','Start reported; progress not checked','info'],
  queued:['queued','Queued; start not confirmed','quiet'], requested:['queued','Request saved; start not confirmed','quiet'],
  active:['reserved','Reserved; execution unverified','quiet'], reserved:['reserved','Reserved; execution unverified','quiet'],
  'reserved-but-idle':['reserved','Reserved; no execution reported','quiet'], leased:['reserved','Executor reserved; start not confirmed','quiet'], starting:['reserved','Start requested; execution unverified','quiet'],
  'waiting-for-human':['waiting','Waiting for a decision','wait'], 'waiting-on-external-system':['waiting','Waiting for an external response','wait'], waiting:['waiting','Waiting','wait'], waiting_credentials:['waiting','Waiting for access','wait'],
  held:['held','On hold','quiet'], paused:['held','Paused','quiet'], blocked:['blocked','Blocked','warn'], failed:['failed','Failed','bad'],
  stale:['stale','Last progress update is stale','warn'], 'possibly-stale':['stale','Progress may be stale','warn'], 'officially-stale':['stale','Progress update overdue','warn'], expired:['stale','Execution lease expired; current progress unknown','warn'],
  unavailable:['unavailable','Progress unavailable','quiet'], offline:['unavailable','Progress unavailable','quiet'],
  complete:['complete','Recorded complete','quiet'], completed:['complete','Recorded complete','quiet'], succeeded:['complete','Successful run reported; result not checked','quiet'],
  cancelled:['cancelled','Cancelled','quiet'], superseded:['cancelled','Superseded','quiet'], archived:['cancelled','Archived','quiet']
};
export function workState(item = {}, {available = true} = {}) {
  const raw = String(item.state || '');
  const freshness=['stale','possibly-stale','officially-stale'].includes(item.progress_freshness)&&!['complete','completed','succeeded','cancelled','superseded','archived'].includes(raw)?item.progress_freshness:raw;
  const [kind,label,tone] = available ? (states[freshness] || ['unknown','Current progress unknown','quiet']) : ['unavailable','Progress unavailable','quiet'];
  return {kind,label,tone,raw,executing:kind==='working',progress:null};
}
export function evidenceNextAction(item = {}) {
  const state=workState(item),request=item.attention_request;
  if(request && ['review','decision'].includes(request.kind) && request.status==='pending')return {label:'Review the recorded request',basis:'attention-request'};
  if(state.kind==='queued')return {label:'Review the saved queue request',basis:'queue-state'};
  if(state.kind==='stale'||state.kind==='unavailable')return {label:'Refresh work evidence',basis:state.kind};
  if(state.kind==='failed'||state.kind==='blocked')return {label:'Inspect the reported problem',basis:'reported-state'};
  if(state.kind==='waiting')return {label:'Inspect the recorded waiting reason',basis:'waiting-state'};
  if(item.identities?.pr)return {label:'Review the linked pull request',basis:'pull-request'};
  if(item.latest_event?.type||item.events?.length)return {label:'Inspect the latest work receipt',basis:'work-event'};
  return {label:'Open the assignment record',basis:'assignment-record'};
}
export function projectWorkState(snapshot) {
  const projects=new Set([...Object.keys(snapshot?.progress||{}),...Object.keys(snapshot?.coordination||{})]);
  const rows=[];
  for(const project of projects){
    const payload=snapshot?.progress?.[project]||{},coordination=snapshot?.coordination?.[project]||{},map=new Map();
    for(const item of payload.progress||[])if(item?.assignment)map.set(item.assignment,{project,item,origin:'progress'});
    for(const queue of [...(payload.queue||[]),...(coordination.queue||[])]){
      const id=queue.assignment||queue.id;
      if(!id||map.has(id)||queue.state&&queue.state!=='queued')continue;
      map.set(id,{project,item:{...queue,assignment:id,state:'queued'},origin:'queue'});
    }
    for(const claim of coordination.claims||[]){
      if(!claim.id||map.has(claim.id)||!['active','held'].includes(claim.state))continue;
      map.set(claim.id,{project,item:{...claim,assignment:claim.id},origin:'claim'});
    }
    for(const row of map.values())rows.push({...row,semantics:workState(row.item,{available:row.origin!=='progress'||!snapshot?.failedProgress?.includes(project)}),next:row.origin==='progress'&&snapshot?.failedProgress?.includes(project)?{label:'Refresh work evidence',basis:'unavailable'}:evidenceNextAction(row.item)});
  }
  const counts=Object.fromEntries(['working','queued','waiting','held','blocked','failed','stale','unavailable','reserved','complete','cancelled','unknown'].map(key=>[key,0]));
  for(const row of rows)counts[row.semantics.kind]++;
  return {rows,counts,incomplete:!snapshot||Boolean(snapshot.failedProgress?.length||snapshot.loadingProgress?.length),progress:null};
}
