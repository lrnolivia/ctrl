// Schema-2 contract: relay@cfaebb6f, src/feedback-browser.js and feedback-control.js.
// Saved/queued/caller acknowledgement never imply verified native delivery.
export function feedbackLabel(receipt){
 const status=receipt?.status;
 if(status?.verified)return 'verified';
 if(status?.fixed)return 'fix reported · verification pending';
 if(status?.incorporated)return 'included in work';
 if(status?.seen)return 'reply acknowledged · native delivery unverified';
 if(status?.historical_review)return 'saved with completed work';
 if(status?.queued)return 'saved in Relay · acknowledgement pending';
 return 'saved · routing unconfirmed';
}
export function feedbackFailure(error){
 if(error?.status===409)return 'work changed · recheck before replying';
 if([401,403].includes(error?.status))return 'sign in again to reconnect replies';
 if(error?.name==='AbortError'||error?.name==='TimeoutError')return 'reply connection timed out · recheck when ready';
 return 'reply connection unavailable · your text stays here';
}
export async function feedbackApi(url,options={}){
 const headers=new Headers(options.headers);headers.set('Accept','application/json');
 if(options.body!=null)headers.set('Content-Type','application/json');
 const response=await fetch(url,{...options,headers,signal:options.signal||AbortSignal.timeout(15000)});
 let body;try{body=await response.json();}catch{throw Object.assign(Error('Reply service returned an unreadable response. Your reply is still here.'),{status:response.status,responseClass:'invalid-response'});}
 if(!response.ok){const error=Error(body.error?.message||body.reason||(typeof body.error==='string'?body.error:null)||'Reply service unavailable. Your reply is still here.');error.result=body;error.status=response.status;error.responseClass=body.error?.class||body.response_class||'http';throw error;}
 return body;
}
export async function sendFeedback({key,binding,text,api=feedbackApi,storage=sessionStorage,uuid=()=>crypto.randomUUID()}){
 if(!binding?.available)throw Error('Reply routing is unavailable for this preview.');
 if(!text.trim()||text.length>8192)throw Error('Write a reply of up to 8,192 characters.');
 let previous;try{previous=JSON.parse(storage.getItem(key)||'null');}catch{}
 const intent=JSON.stringify({...binding.args,original_text:text});
 // An interrupted operation must be reconciled before changed intent can replace it.
 if(previous&&!previous.receipt&&previous.intent!==intent)throw Error('An earlier reply is unconfirmed. Restore and retry that reply before sending another.');
 const pending=previous?.intent===intent?previous:{intent,args:{...binding.args,original_text:text,operation_id:uuid(),...(previous?.receipt?.report_id?{related_report_id:previous.receipt.report_id}:{})}};
 storage.setItem(key,JSON.stringify(pending));
 if(!pending.receipt){
  let result;try{result=await api('/api/feedback/submit',{method:'POST',body:JSON.stringify(pending.args)});}catch(error){
   if(error.result?.report?.report_id){pending.receipt=error.result.report;pending.reconcile=true;storage.setItem(key,JSON.stringify(pending));}throw error;
  }
  const receipt=result.feedback||result.report;
  if(receipt?.report_id){pending.receipt=receipt;pending.reconcile=!result.ok;storage.setItem(key,JSON.stringify(pending));}
  if(!result.ok||!pending.receipt)throw Error(result.error?.message||'Reply was not confirmed. Retry with the preserved operation ID.');
 }
 const query=new URLSearchParams({project:pending.args.project,assignment:pending.args.assignment,report_id:pending.receipt.report_id,...(pending.args.review_mode?{review_mode:pending.args.review_mode}:{})});
 try{
  const result=await api('/api/feedback/status?'+query);
  if(!result.ok||result.feedback?.report_id!==pending.receipt.report_id)throw Error('status unavailable');
  pending.receipt=result.feedback;storage.setItem(key,JSON.stringify(pending));
 }catch{return {receipt:pending.receipt,label:feedbackLabel(pending.receipt)+' · latest status unavailable',reconcile:pending.reconcile};}
 return {receipt:pending.receipt,label:feedbackLabel(pending.receipt),reconcile:pending.reconcile};
}
export async function refreshFeedback({key,api=feedbackApi,storage=sessionStorage}){
 const pending=JSON.parse(storage.getItem(key)||'null');
 if(!pending?.receipt?.report_id)throw Error('No saved reply receipt is available yet. Retry the preserved reply to reconcile it.');
 const query=new URLSearchParams({project:pending.args.project,assignment:pending.args.assignment,report_id:pending.receipt.report_id,...(pending.args.review_mode?{review_mode:pending.args.review_mode}:{})});
 const result=await api('/api/feedback/status?'+query);
 if(!result.ok||result.feedback?.report_id!==pending.receipt.report_id)throw Error('Reply status was not confirmed. The original receipt stays saved.');
 const current=JSON.parse(storage.getItem(key)||'null');
 if(current?.args?.operation_id!==pending.args.operation_id)throw Error('Another reply is now current. Recheck its saved receipt.');
 pending.receipt=result.feedback;storage.setItem(key,JSON.stringify(pending));
 return {receipt:pending.receipt,label:feedbackLabel(pending.receipt)};
}
export function reviewText(evidence,review){return `Review of ${evidence.evidence_id}\n\n${review.notes||''}\n\nAnswers: ${JSON.stringify(review.answers||{})}\nOverall: ${review.overall||'not answered'}\nDisposition: ${review.disposition||'not set'}`;}
export async function deliverReview({evidence,review,binding,api,storage}){
 if(!binding?.available)return {sent:false,label:'review notes saved · reply routing unavailable'};
 return {sent:true,...await sendFeedback({key:'relay.qa.delivery.v2.'+evidence.evidence_id,binding,text:reviewText(evidence,review),api,storage})};
}
