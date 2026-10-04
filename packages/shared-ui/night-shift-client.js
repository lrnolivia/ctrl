import {feedbackApi} from './feedback-client.js';
export function recordableJob(job){
 return Boolean(job&&['succeeded','failed','cancelled'].includes(job.state)&&job.process&&job.started_at&&job.finished_at&&job.result?.head_sha&&job.result?.evidence);
}
export function recordableSource(source){
 return Boolean(source&&source.assignment&&source.owner&&source.branch&&Number.isInteger(source.pr)&&source.pr>0&&/^[a-f0-9]{40}$/.test(source.head_sha||'')&&/^[a-f0-9]{40}$/.test(source.merge_commit_sha||'')&&Number.isFinite(Date.parse(source.completed_at))&&source.requires_source_verification===true);
}
export async function requestNightShift({key,args,api=feedbackApi,storage=sessionStorage,uuid=()=>crypto.randomUUID()}){
 let previous;try{previous=JSON.parse(storage.getItem(key)||'null');}catch{}
 const intent=JSON.stringify(args);
 if(previous&&!previous.confirmed&&!previous.rejected&&previous.intent!==intent)throw Error('An earlier request is unconfirmed. Retry that exact request before changing it.');
 const pending=previous?.intent===intent&&!previous.rejected?previous:{intent,args:{...args,operation_id:uuid()}};
 storage.setItem(key,JSON.stringify(pending));
 if(pending.confirmed)return pending.result;
 let result;try{result=await api('/api/night-shift/request',{method:'POST',body:JSON.stringify(pending.args)});}catch(error){
  if(error.result){pending.result=error.result;pending.rejected=error.result.write_started===false;storage.setItem(key,JSON.stringify(pending));}throw error;
 }
 pending.result=result;pending.confirmed=result.ok===true;storage.setItem(key,JSON.stringify(pending));
 if(!pending.confirmed)throw Error(result.error?.message||'Request outcome is unconfirmed. Retry with the preserved operation ID.');
 return result;
}
