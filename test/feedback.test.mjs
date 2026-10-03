import test from 'node:test';import assert from 'node:assert/strict';
import {sendFeedback,feedbackLabel,deliverReview} from '../packages/shared-ui/feedback-client.js';
import {permitted} from '../worker/index.js';
const binding={available:true,args:{project:'ctrl',assignment:'review',expected_owner:'owner',expected_branch:'branch',artifact:{repository:'lrnolivia/ctrl',commit_sha:'a'.repeat(40),kind:'runtime'}}};
const store=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}};
const report={report_id:'fbr_'+'b'.repeat(64),status:{saved:{at:'2026-10-03'},queued:true,delivered:null,seen:null}};
test('interrupted reply retries retain exact operation and text; changed intent cannot replace uncertainty',async()=>{
 const storage=store(),calls=[];let uncertain=true;
 const api=async(url,options)=>{if(url.includes('/status'))return {ok:true,feedback:report};const args=JSON.parse(options.body);calls.push(args);if(uncertain)throw Error('response lost');return {ok:true,feedback:report};};
 await assert.rejects(sendFeedback({key:'reply',binding,text:'Keep User Text',storage,api,uuid:()=> 'operation-one'}),/response lost/);
 await assert.rejects(sendFeedback({key:'reply',binding,text:'different',storage,api}),/earlier reply is unconfirmed/);
 uncertain=false;await sendFeedback({key:'reply',binding,text:'Keep User Text',storage,api,uuid:()=> 'must-not-replace'});assert.deepEqual(calls[0],calls[1]);assert.equal(calls[1].operation_id,'operation-one');
 await sendFeedback({key:'reply',binding,text:'a follow-up',storage,api,uuid:()=> 'operation-two'});assert.equal(calls[2].related_report_id,report.report_id);
});
test('local persistence failure prevents the network write, and missing binding never guesses a recipient',async()=>{
 let calls=0;const api=async()=>{calls++;};await assert.rejects(sendFeedback({key:'x',binding,text:'reply',api,storage:{getItem:()=>null,setItem:()=>{throw Error('storage unavailable')}}}),/storage unavailable/);assert.equal(calls,0);
 const result=await deliverReview({evidence:{evidence_id:'vis_test'},review:{notes:'note'},binding:{available:false},api});assert.equal(result.sent,false);assert.equal(calls,0);
});
test('a retained raced write is preserved without submitting it again; caller acknowledgment stays distinct from delivery',async()=>{
 const storage=store();let writes=0;const error=Object.assign(Error('owner changed'),{result:{report}});const api=async url=>{if(url.includes('/submit')){writes++;throw error;}return {ok:true,feedback:report};};
 await assert.rejects(sendFeedback({key:'x',binding,text:'reply',api,storage}),/owner changed/);const result=await sendFeedback({key:'x',binding,text:'reply',api,storage});assert.equal(writes,1);assert.equal(result.reconcile,true);
 assert.match(feedbackLabel({status:{seen:{actor:'caller'}}}),/native delivery unverified/);assert.match(feedbackLabel(report),/acknowledgement pending/);
});
test('ctrl proxy exposes only the committed feedback methods',()=>{
 assert.equal(permitted('/api/feedback/submit','POST'),true);assert.equal(permitted('/api/feedback/status','GET'),true);
 for(const [path,method] of [['/api/feedback/ack','POST'],['/api/feedback/status','POST'],['/api/feedback/submit','GET'],['/api/feedback/submit','DELETE']])assert.equal(permitted(path,method),false);
});
