import {feedbackApi,sendFeedback} from './feedback-client.js';
export function mountFeedbackForm(root,evidence,{metadata}={}){
 const controller=new AbortController(),signal=controller.signal,key='ctrl.reply.v2.'+evidence.evidence_id,draftKey=key+'.draft';
 let binding=null,busy=false;
 root.innerHTML='<form class="review-reply"><label>your reply<textarea maxlength="8192" rows="2" placeholder="what would you change?" aria-label="your reply"></textarea></label><div class="review-reply-actions"><button type="button" data-quick="looks good" disabled>looks good</button><button type="button" data-quick="needs changes" disabled>needs changes</button><button type="submit" disabled>send reply</button></div><p role="status" aria-live="polite">checking reply routing</p><details class="review-reply-receipt" hidden><summary>reply details</summary><pre></pre></details></form>';
 const form=root.querySelector('form'),input=root.querySelector('textarea'),status=root.querySelector('[role=status]'),buttons=[...root.querySelectorAll('button')],details=root.querySelector('details');
 try{input.value=sessionStorage.getItem(draftKey)||'';}catch{}
 const retain=()=>{try{sessionStorage.setItem(draftKey,input.value);}catch{status.textContent='reload recovery unavailable · keep this reply open';}};
 const setBusy=value=>{busy=value;buttons.forEach(button=>button.disabled=busy||!binding?.available);input.readOnly=busy;form.setAttribute('aria-busy',String(busy));};
 input.addEventListener('input',retain,{signal});
 for(const button of buttons.filter(b=>b.dataset.quick))button.addEventListener('click',()=>{input.value=button.dataset.quick+(input.value.trim()?'\n\n'+input.value:'');retain();input.focus();},{signal});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!binding?.available)return;setBusy(true);retain();status.textContent='saving your reply';
  try{const result=await sendFeedback({key,binding,text:input.value});if(signal.aborted)return;
   status.textContent=result.reconcile?'reply retained · assignment needs reconciliation':result.label;
   details.hidden=false;details.querySelector('pre').textContent=JSON.stringify({report_id:result.receipt.report_id,identity:result.receipt.identity,status:result.receipt.status},null,2);
  }catch(error){if(!signal.aborted)status.textContent=error.message;}
  finally{if(!signal.aborted)setBusy(false);}
 },{signal});
 void (metadata?Promise.resolve(metadata):feedbackApi('/api/visual/'+encodeURIComponent(evidence.evidence_id)+'/qa',{signal})).then(payload=>{
  if(signal.aborted)return;
  const candidate=payload.feedback_binding,c=evidence.context||{},args=candidate?.args;
  const sameCapture=payload.evidence?.evidence_id===evidence.evidence_id&&payload.evidence.context?.commit_sha===c.commit_sha;
  const matched=args?.project===c.project&&args?.assignment===(c.assignment||c.assignment_id)&&args?.artifact?.commit_sha===c.commit_sha&&args?.expected_owner===c.owner&&args?.expected_branch===c.branch;
  binding=sameCapture&&matched&&candidate.available?candidate:null;
  status.textContent=binding?'reply to the owner of this work':'reply routing unavailable for this capture';setBusy(false);
  if(binding){let pending;try{pending=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
   if(pending&&!pending.receipt){input.value=pending.args.original_text;status.textContent='earlier reply unconfirmed · retry preserves it';}
   else if(pending?.receipt){details.hidden=false;details.querySelector('pre').textContent=JSON.stringify({report_id:pending.receipt.report_id,status:pending.receipt.status},null,2);}
  }
 }).catch(()=>{if(!signal.aborted){status.textContent='reply routing unavailable · try reopening this capture';setBusy(false);}});
 return()=>controller.abort();
}
