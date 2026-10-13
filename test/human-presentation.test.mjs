import test from 'node:test';
import assert from 'node:assert/strict';
import {summaryText,assignmentPresentation} from '../packages/shared-ui/presentation-copy.js';
import {assignmentItem} from '../packages/shared-ui/work-view-model.js';
const internal='USER STOP GATE: Authorized desktop/Gallery/mobile implementation shipped in PR139, merged 2026-10-03T09:04:35Z as f581e4f3e750afd2a959032e4e1815b554b23e4b. /Users/lauren/secret';
test('internal work log is never glance copy, source retained',async()=>{
 const source={assignment:'field-unified-chrome-20261002',state:'waiting-for-human',stage:'held',next_action:internal};
 const copy=assignmentPresentation(source);assert.equal(copy.title,'work on hold');assert.ok(!copy.detail.includes('STOP'));assert.ok(!copy.next.includes('Users'));
 const item=await assignmentItem('field',source);assert.equal(item.source.next_action,internal);assert.ok(!item.detail.includes('f581'));assert.ok(!item.title.includes('20261002'));
});
test('friendly questions remain readable and bounded',()=>{assert.equal(summaryText('Which layout do you prefer?','fallback'),'Which layout do you prefer?');assert.ok(summaryText('a '.repeat(200),'fallback').length<=180);assert.equal(summaryText('PR139 shipped','safe'),'safe');assert.equal(summaryText('worktree ready','safe'),'safe');});
import {detailTarget} from '../packages/shared-ui/work-details.js';
test('detail links only route explicit same-origin assignments',()=>{
 assert.deepEqual(detailTarget('/#/runner/field/a?project=field','https://ctrl.loew.fi'),{project:'field',assignment:'a'});
 assert.equal(detailTarget('https://evil.example/#/runner/field/a','https://ctrl.loew.fi'),null);
 assert.equal(detailTarget('/#/runner','https://ctrl.loew.fi'),null);
});
