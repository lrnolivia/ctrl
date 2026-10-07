import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nightShiftState,nightShiftSummary,observerDiagnostic,declaredAwayWindow,loadExecutionReceipts} from '../packages/shared-ui/night-shift-state.js';
const start='2026-10-03T01:00:00Z',end='2026-10-03T02:00:00Z';
const source={assignment:'source',job_id:'original',execution_state:'succeeded',started_at:start,finished_at:end};
const item=(n,state)=>({id:'item'+n,summary:'TEST DATA',declared_away_window:{start,end},source:{...source},shift:{assignment:'recipient'+n,job_id:'job'+n,initial_state:state}});
const execution=(n,state,started=true)=>({assignment:'recipient'+n,job:{id:'job'+n,state,...(started?{started_at:start}:{}),...(['succeeded','failed'].includes(state)?{finished_at:end}:{}),process:{pid:1}}});
test('approved eight-row scenario produces 6 requests, 4 starts, zero checked results and 2 actionable problems',()=>{
 const items=[item(1),item(2,'queued'),item(3,'queued'),item(4,'queued'),item(5,'queued'),item(6,'queued'),{id:'unknown',source:{assignment:'u'}},{id:'merged',source:{assignment:'m',provenance_kind:'canonical-assignment-and-merged-source',source_event_at:end}}];
 const executions=[execution(2,'queued',false),execution(3,'running'),execution(4,'succeeded'),execution(5,'blocked'),execution(6,'failed')];
 const summary=nightShiftSummary([{project:'ctrl',items,executions}]);
 assert.equal(summary.requests.length,6);assert.equal(summary.starts.length,4);assert.equal(summary.finished.length,0);assert.equal(summary.needsAction.length,2);assert.equal(summary.records.length,8);
 assert.deepEqual(summary.records.map(row=>row.semantics.kind),['unknown','queued','working','complete','blocked','failed','unknown','unknown']);
 assert.equal(summary.records[0].semantics.label,'Request saved. No current progress update');assert.equal(summary.records[7].semantics.label,'Code merged; result not checked');
});
test('saved Shift metadata cannot establish a process or recipient acknowledgment',()=>{
 const saved={...item(1,'queued'),shift:{...item(1,'queued').shift,executor_started:true}};
 const result=nightShiftState(saved);assert.equal(result.startReported,false);assert.equal(result.recipientAcknowledged,false);assert.equal(result.finishedChecked,false);assert.equal(result.kind,'queued');
});
test('execution rows require exact assignment AND job identity',()=>{
 for(const row of [execution(2,'running'),{...execution(1,'running'),assignment:'different'}])assert.equal(nightShiftState(item(1,'queued'),{executions:[row]}).startReported,false);
});
test('terminal execution is a reported exit, not a verified finished objective',()=>{
 const result=nightShiftState({id:'receipt',source});assert.equal(result.startReported,true);assert.equal(result.finishedReported,true);assert.equal(result.finishedChecked,false);assert.equal(result.workDuration,null);
 assert.equal(nightShiftState({id:'receipt',source,objective_completed:true,process_verified:true}).finishedChecked,true);
 assert.equal(nightShiftState({id:'receipt',source:{...source,execution_state:'failed'},objective_completed:true,process_verified:true}).finishedChecked,false);
});
test('native-source backfill retains provenance and declared window without invented process or working time',()=>{
 const native={id:'source',declared_away_window:{start,end},source:{assignment:'native',provenance_kind:'canonical-assignment-and-merged-source',source_event_at:end,work_duration:999}};
 const result=nightShiftState(native);assert.strictEqual(result.source,native.source);assert.strictEqual(result.awayWindow,native.declared_away_window);assert.equal(result.startReported,false);assert.equal(result.workDuration,null);assert.equal(result.sourceVerified,true);assert.equal(result.finishedChecked,false);
});
test('unavailable current execution keeps historical start facts but never current activity',()=>{
 const result=nightShiftState(item(1,'queued'),{executions:[execution(1,'running')],executionAvailable:false});assert.equal(result.kind,'unavailable');assert.equal(result.executing,false);assert.equal(result.startReported,true);assert.equal(result.needsAction,false);
});
test('unknown timestamps never count as reported starts',()=>{assert.equal(nightShiftState({source:{...source,started_at:'not a timestamp'}}).startReported,false);});
test('waiting does not become a failed or needs-action row',()=>{const result=nightShiftState(item(1,'queued'),{executions:[execution(1,'waiting-for-human')]});assert.equal(result.kind,'waiting');assert.equal(result.needsAction,false);});
test('partial, failed and paginated reads label counts as incomplete',()=>{
 for(const patch of [{error:'failed'},{executionError:'failed'},{next_cursor:20},{executionLoading:true}])assert.equal(nightShiftSummary([{items:[item(1)],...patch}]).incomplete,true);
 assert.equal(nightShiftSummary([],{loading:true}).incomplete,true);assert.equal(nightShiftSummary([],{scopeAvailable:false}).incomplete,true);
});
test('paid observer failure never affects canonical ledger semantics',()=>{
 const diagnostic=observerDiagnostic({runtime:{last_error:'insufficient_quota',status:'failed'}});assert.equal(diagnostic.projectStateAffected,false);assert.match(diagnostic.error,/Optional model checks/);
 const summary=nightShiftSummary([{items:[{id:'receipt',source}],workers:[{runtime:{last_error:'insufficient_quota'}}]}]);assert.equal(summary.records.length,1);assert.equal(summary.incomplete,false);assert.equal(summary.needsAction.length,0);
});
test('away window is explicit and chronological, with no fabricated duration',()=>{
 assert.deepEqual(declaredAwayWindow(start,end,Date.parse(end)),{start:'2026-10-03T01:00:00.000Z',end:'2026-10-03T02:00:00.000Z'});
 for(const [a,b,now] of [[end,start,Date.parse(end)],[start,start,Date.parse(end)],['bad',end,Date.parse(end)],[start,end,Date.parse(start)]])assert.throws(()=>declaredAwayWindow(a,b,now),/completed away window/);
});
test('execution pagination loads all bounded pages and deduplicates exact receipt identities',async()=>{
 const calls=[],row=execution(1,'running');const rows=await loadExecutionReceipts('ctrl',async url=>{calls.push(url);return calls.length===1?{ok:true,rows:[row],next_cursor:20}:{ok:true,rows:[row,execution(2,'queued',false)],next_cursor:null};});assert.equal(rows.length,2);assert.equal(calls.length,2);assert.match(calls[1],/cursor=20/);
});
test('repeated execution cursor stops instead of polling forever',async()=>{let calls=0;await assert.rejects(loadExecutionReceipts('ctrl',async()=>{calls++;return {ok:true,rows:[],next_cursor:0};}),/pagination repeated/);assert.equal(calls,1);});
test('ledger uses canonical artwork, four approved tiles and independent observer diagnostics',()=>{
 const ledger=fs.readFileSync(new URL('../apps/web/src/components/NightShiftLedger.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(ledger,/glyph\('moon'\)/);assert.match(ledger,/featureIconMarkup\('night-shift'/);
 for(const title of ['Requests saved','Starts reported','Finished and checked','Needs action'])assert.ok(ledger.includes(title));
 const page=fs.readFileSync(new URL('../apps/web/src/pages/NightShiftPage.tsx',import.meta.url),'utf8');assert.match(page,/<details className="operator-section night-shift-observer-diagnostics">/);assert.match(page,/<NightShiftLedger snapshot=\{snapshot\}/);
});
test('a running label without a timestamped start remains unknown',()=>{const result=nightShiftState(item(1,'queued'),{executions:[execution(1,'running',false)]});assert.equal(result.startReported,false);assert.equal(result.executing,false);assert.equal(result.kind,'unknown');});
test('future starts and inverted exits do not become valid receipts',()=>{
 assert.equal(nightShiftState({source:{...source,started_at:'2099-01-01T00:00:00Z'}}).startReported,false);
 assert.equal(nightShiftState({source:{...source,finished_at:'2026-10-03T00:00:00Z'}}).finishedReported,false);
});
