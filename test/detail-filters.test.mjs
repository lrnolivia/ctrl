import test from 'node:test';
import assert from 'node:assert/strict';
import {filterFiles,fileKind} from '../packages/shared-ui/file-manager.js';
import {filterWorkCollection} from '../packages/shared-ui/work-details.js';
test('file filters preserve source readiness and combine filename, type and ordering',()=>{
 const rows=[{filename:'Archive.zip',state:'ready',bytes:20,created_at:1},{filename:'Portrait.png',state:'uploading',bytes:10,created_at:2},{filename:'notes.md',state:'ready',bytes:40,created_at:3}];
 assert.equal(fileKind('Portrait.PNG'),'images');
 assert.deepEqual(filterFiles(rows,{kind:'images',state:'incomplete'}),[rows[1]]);
 assert.deepEqual(filterFiles(rows,{search:'archive',state:'ready'}),[rows[0]]);
 assert.deepEqual(filterFiles(rows,{sort:'size'}),[rows[2],rows[0],rows[1]]);
 assert.deepEqual(filterFiles(rows,{kind:'packages',state:'incomplete'}),[]);
 assert.equal(rows[1].state,'uploading');
});
test('assignment filters distinguish explicit review requests, reservation and failed work',()=>{
 const rows=[{project:'ctrl',item:{assignment:'reserved',state:'active',goal:'Polish cards'}},{project:'field',item:{assignment:'failed',state:'failed',goal:'Check portrait'}},{project:'ctrl',item:{assignment:'review',state:'waiting-for-human',goal:'Review cards',attention_request:{kind:'review',status:'pending'}}}];
 assert.deepEqual(filterWorkCollection(rows,{state:'review'}),[rows[2]]);
 assert.deepEqual(filterWorkCollection(rows,{state:'problem'}),[rows[1]]);
 assert.deepEqual(filterWorkCollection(rows,{project:'ctrl',search:'polish',state:'reserved'}),[rows[0]]);
 assert.deepEqual(filterWorkCollection(rows,{project:'ctrl',state:'working'}),[]);
 assert.equal(rows[0].item.state,'active');
});
