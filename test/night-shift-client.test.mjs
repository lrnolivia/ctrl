import test from 'node:test';import assert from 'node:assert/strict';
import {recordableJob,recordableSource,requestNightShift} from '../packages/shared-ui/night-shift-client.js';
import worker,{permitted} from '../worker/index.js';
const store=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};};
const args={action:'shift',project:'ctrl',assignment:'actor',expected_owner:'owner',expected_branch:'branch',expected_revision:1,item_id:'item',summary:'Keep exact text',recipient:{assignment:'recipient',owner:'actual owner',branch:'actual branch',head_sha:'a'.repeat(40)}};
test('away records require concrete terminal execution receipts',()=>{
 const job={state:'succeeded',process:{},started_at:'start',finished_at:'end',result:{head_sha:'a'.repeat(40),evidence:'receipt'}};
 assert.equal(recordableJob(job),true);assert.equal(recordableJob({...job,state:'queued'}),false);assert.equal(recordableJob({...job,result:{head_sha:'a'.repeat(40)}}),false);
});
test('native source choices require the exact completed catalogue identity',()=>{
 const source={assignment:'completed-source',owner:'original-owner',branch:'original/branch',pr:7,head_sha:'a'.repeat(40),merge_commit_sha:'b'.repeat(40),completed_at:'2026-10-03T01:00:00Z',requires_source_verification:true};
 assert.equal(recordableSource(source),true);
 for(const patch of [{owner:null},{pr:null},{head_sha:'missing'},{merge_commit_sha:null},{completed_at:null},{requires_source_verification:false}])assert.equal(recordableSource({...source,...patch}),false);
});
test('uncertain Shift preserves exact operation and intent until reconciled',async()=>{
 const storage=store(),calls=[];let lost=true;const api=async(url,options)=>{calls.push(JSON.parse(options.body));if(lost)throw Error('response lost');return {ok:true,shift:{job_id:'actual queued job',executor_started:false}};};
 await assert.rejects(requestNightShift({key:'shift',args,storage,api,uuid:()=> 'one-operation'}),/response lost/);
 await assert.rejects(requestNightShift({key:'shift',args:{...args,summary:'replacement'},storage,api}),/earlier request is unconfirmed/);
 lost=false;const result=await requestNightShift({key:'shift',args,storage,api,uuid:()=> 'must-not-replace'});assert.deepEqual(calls[0],calls[1]);assert.equal(result.shift.executor_started,false);
 await requestNightShift({key:'shift',args,storage,api});assert.equal(calls.length,2);
});
test('only explicit no-write proof releases rejected intent; retained receipts do not',async()=>{
 for(const proof of [false,true,null]){
  const storage=store();let fail=true;const api=async()=>{if(fail)throw Object.assign(Error('revision conflict'),{result:{write_started:proof}});return {ok:true};};
  await assert.rejects(requestNightShift({key:'x',args,storage,api,uuid:()=> 'original'}));fail=false;
  const next={...args,expected_revision:2};
  if(proof===false)assert.equal((await requestNightShift({key:'x',args:next,storage,api,uuid:()=> 'after-proven-rejection'})).ok,true);
  else await assert.rejects(requestNightShift({key:'x',args:next,storage,api}),/unconfirmed/);
 }
});
test('Night Shift proxy remains restricted and protects original browser Origin',async()=>{
 assert.equal(permitted('/api/night-shift/items','GET'),true);assert.equal(permitted('/api/night-shift/request','POST'),true);assert.equal(permitted('/api/execution/jobs','GET'),true);
 assert.equal(permitted('/api/execution/request','POST'),false);assert.equal(permitted('/api/night-shift/record','POST'),false);assert.equal(permitted('/api/night-shift/request','GET'),false);
 let calls=0;const env={CTRL_ENABLED:'true',ASSETS:{},RELAY:{fetch:()=>{calls++;}}};
 const response=await worker.fetch(new Request('https://ctrl.loew.fi/api/night-shift/request',{method:'POST',headers:{'cf-access-jwt-assertion':'test','Origin':'https://other.loew.fi','Content-Type':'application/json'},body:'{}'}),env);
 assert.equal(response.status,403);assert.equal(calls,0);
});
