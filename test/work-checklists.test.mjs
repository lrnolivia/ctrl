import test from 'node:test';
import assert from 'node:assert/strict';
import {recordedChecklist,projectWork} from '../packages/shared-ui/work-checklists.js';
import {activitySeries,controlTelemetry} from '../packages/shared-ui/control-telemetry.js';
test('assignment completion does not imply completion of recorded requirements',()=>{
 const model=recordedChecklist({state:'completed',acceptance:'Open the project details; Preserve the latest preview'});
 assert.equal(model.total,2);assert.equal(model.completed,0);assert.equal(model.percent,undefined);
 assert.ok(model.items.every(item=>item.status==='completion not reported'));
});
test('reported checklist completion stays distinct from verification',()=>{
 const model=recordedChecklist({deliverables:[{title:'layout',status:'completed'},{title:'keyboard',status:'verified'},{title:'loading'}]});
 assert.equal(model.percent,67);assert.equal(model.items[0].verified,false);assert.equal(model.items[1].verified,true);
 assert.equal(model.items[2].completed,false);
});
test('planned work remains visible without duplicating claimed or retired work',()=>{
 const work=projectWork({claims:[{id:'a',state:'active'},{id:'b',state:'cancelled'}],queue:[{id:'a',state:'claimed'},{id:'c',state:'queued'}]});
 assert.deepEqual(work.claims.map(item=>item.id),['a']);assert.deepEqual(work.queued.map(item=>item.id),['c']);
});
test('heartbeats never count as meaningful activity or make a project most active',()=>{
 const now=Date.parse('2026-10-04T01:00:00Z'),at='2026-10-04T00:30:00Z';
 const progress={ctrl:{progress:[{assignment:'a',events:[{type:'runner-heartbeat',at},{type:'heartbeat',at}]}]},field:{progress:[{assignment:'b',events:[{type:'source-commit',at}]}]}};
 assert.equal(activitySeries(progress,now).count,1);assert.equal(controlTelemetry({progress},now).mostUpdates.project,'field');
});
