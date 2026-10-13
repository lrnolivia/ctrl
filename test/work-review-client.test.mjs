import test from 'node:test';
import assert from 'node:assert/strict';
import {requestWorkReview} from '../packages/shared-ui/work-review-client.js';
const items=[{project:'ctrl',kind:'assignment',id:'first-review'}];
test('first review absence stays a successful null record with the canonical read endpoint',async()=>{
 const original=globalThis.fetch;try{globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/work-review');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{action:'read',items});return Response.json({ok:true,results:[{ok:true,key:'ctrl/assignment/first-review',record:null,etag:null}]});};const result=await requestWorkReview('read',items);assert.equal(result.ok,true);assert.equal(result.results[0].record,null);}finally{globalThis.fetch=original;}
});
test('provider rate limit retains exact diagnostic body and is distinct from access denial',async()=>{
 const original=globalThis.fetch;try{const body={error:'API rate limit exceeded for installation ID test.'};globalThis.fetch=async()=>Response.json(body,{status:403});await assert.rejects(requestWorkReview('read',items),e=>e.status===403&&e.message.includes('rate-limited')&&e.result.error===body.error&&e.method==='POST');globalThis.fetch=async()=>Response.json({error:'Forbidden'},{status:403});await assert.rejects(requestWorkReview('read',items),e=>e.message.includes('access')&&!e.message.includes('rate-limited'));}finally{globalThis.fetch=original;}
});
test('real 404 remains an error and never becomes an empty initial review',async()=>{
 const original=globalThis.fetch;try{const body=JSON.stringify({error:'Not found'});globalThis.fetch=async()=>new Response(body,{status:404});await assert.rejects(requestWorkReview('read',items),e=>e.status===404&&e.responseBody===body&&e.url==='/api/work-review');}finally{globalThis.fetch=original;}
});
