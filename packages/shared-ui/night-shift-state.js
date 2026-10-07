// Canonical ledger facts and optional observer diagnostics are independent inputs.
import {workState} from './work-state.js';
const validTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function nightShiftState(item = {}, {executions = [], executionAvailable = true} = {}) {
  const source=item.source||{},shift=item.shift,assignment=shift?.assignment||source.assignment,jobId=shift?.job_id||source.job_id;
  const match=executions.find(row=>row.assignment===assignment&&row.job?.id===jobId);
  const job=match?.job;
  const native=source.provenance_kind==='canonical-assignment-and-merged-source';
  // A saved initial_state is historical. Only a matching current receipt updates it.
  let state=job?.state||(!shift&&!native?source.execution_state:null);
  let semantics=workState({state});
  if(!executionAvailable&&shift)semantics=workState({}, {available:false});
  else if(shift&&!job)semantics={...workState({state:shift.initial_state==='queued'?'queued':null}),label:shift.initial_state==='queued'?'Queued; start not confirmed':'Request saved. No current progress update'};
  else if(native&&!shift)semantics={...workState({}),label:'Code merged; result not checked'};
  const startedAt=job?.started_at||(!shift&&!native?source.started_at:null);
  const finishedAt=job?.finished_at||(!shift&&!native?source.finished_at:null);
  const startReported=validTime(startedAt)&&Date.parse(startedAt)<=Date.now();
  if(semantics.kind==='working'&&!startReported)semantics={...workState({}),label:'Execution marked running; start receipt unavailable'};
  const finishedReported=validTime(finishedAt)&&Date.parse(finishedAt)<=Date.now()&&(!startReported||Date.parse(finishedAt)>=Date.parse(startedAt))&&['succeeded','failed','cancelled'].includes(state);
  // Process, result and acknowledgement evidence are separate. Success/merge is not a verified result.
  const finishedChecked=!shift&&item.objective_completed===true&&item.process_verified===true&&finishedReported&&state==='succeeded';
  if(finishedChecked)semantics={...semantics,label:'Finished and checked',tone:'good'};
  return {...semantics,requestSaved:Boolean(shift),startReported,finishedReported,finishedChecked,
    needsAction:['blocked','failed'].includes(semantics.kind),startedAt:startReported?startedAt:null,finishedAt:finishedReported?finishedAt:null,
    recipientAcknowledged:shift?.recipient_acknowledged===true,sourceVerified:native,
    awayWindow:item.declared_away_window||null,workDuration:null,source,job:job||null,
    next:semantics.kind==='unavailable'?'Refresh execution receipts':shift?'Inspect the saved Shift request':'Inspect the recorded source'};
}
export function nightShiftSummary(pages = [], {loading = false, scopeAvailable = true} = {}) {
  const records=pages.flatMap(page=>(page.items||[]).map(item=>({page,item,semantics:nightShiftState(item,{executions:page.executions||[],executionAvailable:!page.executionError})})));
  const incomplete=loading||!scopeAvailable||pages.some(page=>page.error||page.executionError||page.executionLoading||page.next_cursor!=null);
  return {records,incomplete,requests:records.filter(row=>row.semantics.requestSaved),starts:records.filter(row=>row.semantics.startReported),finished:records.filter(row=>row.semantics.finishedChecked),needsAction:records.filter(row=>row.semantics.needsAction)};
}
export function observerDiagnostic(worker = {}) {
  const runtime=worker.runtime||{},error=runtime.last_error||'';
  const quota=/insufficient_quota|credit_balance_exhausted|no credits remaining/i.test(error);
  return {state:workState({state:runtime.status}),error:quota?'Optional model checks are paused because API credits are exhausted. Saved work, execution receipts and manual controls remain available.':error,
    label:'Optional observer',hasError:Boolean(error),projectStateAffected:false};
}
export function declaredAwayWindow(start, end, now = Date.now()) {
  const first=Date.parse(start),last=Date.parse(end);
  if(!Number.isFinite(first)||!Number.isFinite(last)||first>=last||last>now)throw Error('Choose a valid completed away window with its end after its start.');
  return {start:new Date(first).toISOString(),end:new Date(last).toISOString()};
}
export async function loadExecutionReceipts(project, api) {
  const rows=[],seen=new Set();let cursor=0;
  do {
    if(seen.has(cursor))throw Error('Execution receipt pagination repeated. Refresh before continuing.');
    seen.add(cursor);
    const result=await api('/api/execution/jobs?'+new URLSearchParams({project,cursor:String(cursor)}));
    if(!result.ok||!Array.isArray(result.rows))throw Error('Execution receipts unavailable.');
    rows.push(...result.rows);cursor=result.next_cursor;
    if(rows.length>1000||seen.size>100)throw Error('Execution receipts could not finish loading safely.');
  } while(cursor!=null);
  return [...new Map(rows.map(row=>[[row.assignment,row.job?.id].join(':'),row])).values()];
}
