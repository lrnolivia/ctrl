import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveReview,selectWork,evidenceItem,reviewKey,reviewConfirmationIsCurrent} from '../packages/shared-ui/work-view-model.js';
const source={evidence_id:'vis_loading123',context:{project:'ctrl',commit_sha:'abc'},captured_at:'2026-10-03T01:00:00Z'};
test('unresolved evidence is visible without being labelled a pending review',async()=>{
 const item=await evidenceItem({...source,reviewHydration:'pending'});
 assert.equal(effectiveReview(item).status,'loading');
 assert.equal(selectWork([item],{filter:'pending'}).length,1);
 for(const filter of ['completed','stale','archived'])assert.equal(selectWork([item],{filter}).length,0);
});
test('failed review read is unknown, never empty or completed',async()=>{
 const item=await evidenceItem({...source,reviewHydration:'failed'});
 assert.equal(effectiveReview(item,{read_confirmed:true}).status,'unavailable');
});
test('confirmed empty QA is pending and hydration never changes artifact revision',async()=>{
 const before=await evidenceItem({...source,reviewHydration:'pending'});
 const after=await evidenceItem({...source,reviewHydration:'ready',qaReview:null});
 assert.equal(before.revision,after.revision);assert.equal(effectiveReview(after,{read_confirmed:true}).status,'pending');
});
test('confirmed modern review record wins over unresolved legacy hydration',async()=>{
 const item=await evidenceItem({...source,reviewHydration:'pending'});
 const record={source_revision:item.revision,status:'completed',archived:true};
 assert.deepEqual(effectiveReview(item,record),{status:'completed',archived:true});
 assert.equal(selectWork([item],{filter:'pending'},{[reviewKey(item)]:record}).length,0);
});

test('legacy completion needs confirmed modern absence and survives lazy hydration',async()=>{
 const item=await evidenceItem({...source,reviewHydration:'ready',qaReview:{disposition:'completed'}});
 assert.equal(effectiveReview(item,{read_failed:true}).status,'unavailable');
 assert.equal(effectiveReview(item).status,'loading');
 assert.equal(effectiveReview(item,{read_confirmed:true}).status,'completed');
 const archived=await evidenceItem({...source,reviewHydration:'ready',qaReview:{disposition:'archived'}});
 assert.equal(effectiveReview(archived,{read_confirmed:true}).archived,true);
});

test('modern source revision mismatch reopens only after a confirmed read',async()=>{
 const item=await evidenceItem({...source,reviewHydration:'pending'});
 assert.equal(effectiveReview(item,{read_confirmed:true,source_revision:'older',status:'completed'}).status,'pending');
});
test('prepared changes reject unknown targets, changed revisions and changed etags',async()=>{
 const ready=await evidenceItem({...source,reviewHydration:'ready',qaReview:null});const key=reviewKey(ready),records={[key]:{read_confirmed:true,etag:'v1'}},versions={[key]:'v1'};
 assert.equal(reviewConfirmationIsCurrent([ready],[ready],records,versions,true),true);
 assert.equal(reviewConfirmationIsCurrent([ready],[ready],records,versions,false),false);
 assert.equal(reviewConfirmationIsCurrent([{...ready,reviewHydration:'pending'}],[ready],records,versions,true),false);
 assert.equal(reviewConfirmationIsCurrent([{...ready,revision:'new'}],[ready],records,versions,true),false);
 assert.equal(reviewConfirmationIsCurrent([ready],[ready],{[key]:{read_confirmed:true,etag:'v2'}},versions,true),false);
});
