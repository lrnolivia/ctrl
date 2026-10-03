import test from 'node:test';
import assert from 'node:assert/strict';
import {activitySeries,controlTelemetry,reviewFocus} from '../packages/shared-ui/control-telemetry.js';
const now=Date.parse('2026-10-03T12:00:00Z');
test('activity uses timestamped hourly counts, deduplicates latest events and excludes future/undated events',()=>{
 const event={id:'one',type:'completed',at:'2026-10-03T11:30:00Z'};
 const series=activitySeries({ctrl:{progress:[{assignment:'a',events:[event,{id:'future',at:'2026-10-03T13:00:00Z'},{id:'missing'},{id:'old',at:'2026-10-03T01:00:00Z'}],latest_event:event}]}},now);
 assert.equal(series.count,1);assert.equal(series.undated,1);assert.deepEqual(series.bins.map(b=>b.count),[0,0,0,0,0,1]);
});
test('completion ratio is derived only from accounted record states, never partial progress',()=>{
 const snapshot={projects:[{id:'ctrl'}],progress:{ctrl:{progress:[]}},coordination:{ctrl:{claims:[{state:'completed'},{state:'active'},{state:'cancelled'},{state:'superseded'}]}}};
 assert.equal(controlTelemetry(snapshot,now).percent,50);
 assert.equal(controlTelemetry({...snapshot,failedProgress:['ctrl']},now).percent,undefined);
 assert.equal(controlTelemetry(null,now).percent,undefined);
 assert.equal(controlTelemetry(snapshot,now).newest,null);
});
test('review focus excludes technical failure and routine completion, ordering explicit requests by importance then recency',()=>{
 const rows=[{project:'ctrl',item:{assignment:'failure',state:'failed',priority:'critical'}},{project:'ctrl',item:{assignment:'done',state:'complete'}},{project:'ctrl',item:{assignment:'older',state:'working',priority:'high',attention_request:{kind:'review',status:'pending'},last_meaningful_progress_at:'2026-10-03T10:00:00Z'}},{project:'ctrl',item:{assignment:'recent',state:'waiting-for-human',last_meaningful_progress_at:'2026-10-03T11:00:00Z'}}];
 assert.equal(reviewFocus(rows).item.assignment,'older');assert.equal(reviewFocus(rows.slice(0,2)),null);
});
