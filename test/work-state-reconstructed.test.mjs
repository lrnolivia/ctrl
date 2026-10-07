import test from 'node:test';
import assert from 'node:assert/strict';
import {workState,projectWorkState,evidenceNextAction} from '../packages/shared-ui/work-state.js';
import {controlTelemetry} from '../packages/shared-ui/control-telemetry.js';
import {statusLabel,assignmentPresentation} from '../packages/shared-ui/presentation-copy.js';

for(const state of ['active','reserved','reserved-but-idle','leased','starting'])test(`${state} ownership is not execution`,()=>{const result=workState({state,next_action:'Coding now',stage:'implementation'});assert.equal(result.executing,false);assert.equal(result.kind,'reserved');assert.equal(result.progress,null);});
for(const [state,kind] of [['queued','queued'],['waiting-for-human','waiting'],['waiting-on-external-system','waiting'],['waiting_credentials','waiting'],['held','held'],['failed','failed'],['blocked','blocked'],['officially-stale','stale'],['possibly-stale','stale'],['unavailable','unavailable'],['unrecognized','unknown']])test(`${state} keeps its meaning`,()=>{assert.equal(workState({state}).kind,kind);});
test('the reported 10 stale + 2 failed + 1 held and 8 queued never become 13 waiting',()=>{
 const progress=[...Array.from({length:10},(_,i)=>({assignment:'stale'+i,state:'officially-stale'})),{assignment:'failed1',state:'failed'},{assignment:'failed2',state:'failed'},{assignment:'held',state:'held'}];
 const queue=Array.from({length:8},(_,i)=>({id:'queue'+i,goal:'saved work',state:'queued'}));
 const snapshot={projects:[{id:'ctrl'}],progress:{ctrl:{progress,queue}},coordination:{ctrl:{claims:[]}}};
 const summary=projectWorkState(snapshot),telemetry=controlTelemetry(snapshot);
 assert.equal(summary.rows.length,21);assert.equal(summary.counts.stale,10);assert.equal(summary.counts.failed,2);assert.equal(summary.counts.held,1);assert.equal(summary.counts.queued,8);
 assert.equal(telemetry.moving,0);assert.equal(telemetry.waiting,0);assert.equal(telemetry.queued,8);assert.equal(telemetry.current.length,21);assert.equal(telemetry.percent,undefined);
});
test('canonical queue is visible and deduplicated across queue/progress/claims',()=>{
 const snapshot={progress:{ctrl:{progress:[{assignment:'a',state:'working'}],queue:[{id:'a'},{id:'b'},{id:'done',state:'completed'}]}},coordination:{ctrl:{claims:[{id:'a',state:'active'},{id:'c',state:'active'}],queue:[{id:'b',state:'queued'}]}}};
 const summary=projectWorkState(snapshot);assert.equal(summary.rows.length,3);assert.equal(summary.counts.working,1);assert.equal(summary.counts.queued,1);assert.equal(summary.counts.reserved,1);
});
test('unknown progress stays unknown even with stage, percentage prose or lease',()=>{
 for(const source of [{},{stage:'implementation',next_action:'90 percent done'},{state:'active',progress:99,lease_until:'2099-01-01'}])assert.equal(workState(source).progress,null);
 assert.equal(projectWorkState(null).incomplete,true);
});
test('unavailability does not erase the underlying reported state',()=>{const result=workState({state:'failed'},{available:false});assert.equal(result.kind,'unavailable');assert.equal(result.raw,'failed');});
test('next action cannot come from unsupported next_action prose',()=>{
 const source={assignment:'a',state:'active',next_action:'Deploy now'};
 assert.equal(evidenceNextAction(source).label,'Open the assignment record');assert.equal(assignmentPresentation(source).next,'Open the assignment record');
 assert.equal(evidenceNextAction({...source,attention_request:{kind:'decision',status:'pending'}}).basis,'attention-request');
 assert.equal(evidenceNextAction({...source,state:'queued'}).basis,'queue-state');
 assert.equal(statusLabel('active'),'reserved; execution unverified');
});
test('stale progress freshness suppresses an old working claim without fabricating failure',()=>{const result=workState({state:'working',progress_freshness:'officially-stale'});assert.equal(result.kind,'stale');assert.equal(result.executing,false);});
test('failed refresh keeps last-good records but cannot report them as currently moving',()=>{
 const summary=projectWorkState({progress:{ctrl:{progress:[{assignment:'a',state:'working'}],queue:[{id:'b'}]}},failedProgress:['ctrl']});assert.equal(summary.counts.working,0);assert.equal(summary.counts.unavailable,1);assert.equal(summary.counts.queued,1);assert.equal(summary.rows[0].item.state,'working');assert.equal(summary.rows[0].next.basis,'unavailable');
});
import {assignmentItem} from '../packages/shared-ui/work-view-model.js';
test('work-list items retain raw source while displaying availability-aware semantics',async()=>{
 const source={assignment:'a',state:'working'},semantics=workState(source,{available:false});const item=await assignmentItem('ctrl',source,semantics);
 assert.equal(item.sourceState,'unavailable');assert.strictEqual(item.source,source);assert.equal(item.source.state,'working');
 const queued=await assignmentItem('ctrl',{assignment:'q',state:'queued'});assert.equal(queued.sourceState,'queued');
});
