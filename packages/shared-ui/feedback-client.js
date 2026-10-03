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
export async function feedbackApi(url,options={}){
 const response=await fetch(url,{...options,headers:{Accept:'application/json','Content-Type':'application/json'},signal:options.signal||AbortSignal.timeout(15000)});
 const body=await response.json().catch(()=>({}));
 if(!response.ok){const error=Error(body.error?.message||body.error||'Reply service unavailable. Your reply is still here.');error.result=body;throw error;}
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
export function reviewText(evidence,review){return `Review of ${evidence.evidence_id}\n\n${review.notes||''}\n\nAnswers: ${JSON.stringify(review.answers||{})}\nOverall: ${review.overall||'not answered'}\nDisposition: ${review.disposition||'not set'}`;}
export async function deliverReview({evidence,review,binding,api,storage}){
 if(!binding?.available)return {sent:false,label:'review notes saved · reply routing unavailable'};
 return {sent:true,...await sendFeedback({key:'relay.qa.delivery.v2.'+evidence.evidence_id,binding,text:reviewText(evidence,review),api,storage})};
}
