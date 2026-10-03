import test from 'node:test';
import assert from 'node:assert/strict';
import {needsHumanReview} from '../packages/shared-ui/attention.js';
test('routine status and missing verification do not become owner requests', () => {
 for (const state of ['working','blocked','failed','officially-stale','waiting-on-external-system','complete','held']) assert.equal(needsHumanReview({state}),false,state);
 assert.equal(needsHumanReview(),false);
});
test('explicit pending reviews and decisions count, even after implementation completes', () => {
 assert.equal(needsHumanReview({state:'waiting-for-human'}),true);
 for (const kind of ['review','decision']) assert.equal(needsHumanReview({state:'complete',attention_request:{kind,status:'pending'}}),true);
});
test('resolved, cancelled, superseded and technical requests are not owner attention', () => {
 for (const state of ['cancelled','superseded','archived']) assert.equal(needsHumanReview({state,attention_request:{kind:'review',status:'pending'}}),false);
 for (const status of ['answered','completed','dismissed','deferred']) assert.equal(needsHumanReview({state:'waiting-for-human',attention_request:{kind:'review',status}}),false);
 assert.equal(needsHumanReview({state:'blocked',attention_request:{kind:'repair',status:'pending'}}),false);
});
