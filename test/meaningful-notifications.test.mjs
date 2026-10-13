import test from 'node:test';import assert from 'node:assert/strict';import {meaningfulWorkChanges} from '../packages/shared-ui/meaningful-notifications.js';
const snapshot=state=>({coordination:{field:{claims:[{id:'task',state,goal:'Polish media'}]}},progress:{field:{progress:[{assignment:'task',state:'working'}]}},loadingProgress:[],failedProgress:[]});
test('initial hydration and heartbeat do not manufacture notifications',()=>{assert.deepEqual(meaningfulWorkChanges(null,snapshot('active')),[]);const next=snapshot('active');next.coordination.field.claims[0].updated_at=new Date().toISOString();assert.deepEqual(meaningfulWorkChanges(snapshot('active'),next),[]);});
test('completion is a meaningful event with actionable identity',()=>{const [event]=meaningfulWorkChanges(snapshot('active'),snapshot('completed'));assert.equal(event.title,'work completed');assert.equal(event.assignment,'task');});
test('incomplete reads do not announce completion',()=>{const next=snapshot('completed');next.failedProgress=['field'];assert.deepEqual(meaningfulWorkChanges(snapshot('active'),next),[]);});

test('a new explicit decision while work continues produces an actionable notification',()=>{
 const before=snapshot('active'),after=snapshot('active');
 after.progress.field.progress[0].attention_request={kind:'decision',status:'pending',question:'Which preview should ship?'};
 const [event]=meaningfulWorkChanges(before,after);assert.equal(event.title,'your decision is needed');assert.equal(event.assignment,'task');
 assert.deepEqual(meaningfulWorkChanges(after,after),[]);
});
