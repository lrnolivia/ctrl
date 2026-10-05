import {feedbackApi,sendFeedback} from './feedback-client.js';
import {glyph} from './glyphs.js';
export function mountFeedbackForm(root,evidence,{metadata}={}){
 const controller=new AbortController(),signal=controller.signal,key='ctrl.reply.v2.'+evidence.evidence_id,draftKey=key+'.draft';
 let binding=null,busy=false,decision='';
 const decisionKey=key+'.decision';
 root.innerHTML='<form class="review-reply"><fieldset class="review-decision"><legend>Your decision</legend><label><input type="radio" name="decision" value="good"><span>'+glyph('check')+'Looks good</span></label><label><input type="radio" name="decision" value="changes"><span>'+glyph('repair')+'Needs changes</span></label></fieldset><label class="review-note-label">Note <span>(optional with a decision)</span><textarea maxlength="8000" rows="2" placeholder="Add a detail or ask a question…" aria-label="Review note"></textarea></label><div class="review-reply-actions"><button type="submit" disabled>'+glyph('save')+'Send review</button></div><p role="status" aria-live="polite">checking reply routing</p><details class="review-reply-receipt" hidden><summary>reply details</summary><pre></pre></details></form>';
 const form=root.querySelector('form'),input=root.querySelector('textarea'),status=root.querySelector('[role=status]'),buttons=[...root.querySelectorAll('button')],details=root.querySelector('details');
 try{input.value=sessionStorage.getItem(draftKey)||'';const saved=sessionStorage.getItem(decisionKey);decision=['good','changes'].includes(saved)?saved:'';}catch{}
 const choices=[...root.querySelectorAll('input[name=decision]')];
 const selectDecision=value=>{decision=value;for(const choice of choices)choice.checked=choice.value===decision;};
 selectDecision(decision);
 const reviewText=()=>decision?({good:'Looks good',changes:'Needs changes'}[decision]+(input.value.trim()?'\n\n'+input.value:'')):input.value;
 const retain=()=>{try{sessionStorage.setItem(draftKey,input.value);sessionStorage.setItem(decisionKey,decision);}catch{status.textContent='reload recovery unavailable · keep this reply open';}};
 const setBusy=value=>{busy=value;buttons.forEach(button=>button.disabled=busy||!binding?.available||!reviewText().trim());for(const choice of choices)choice.disabled=busy;input.readOnly=busy;form.setAttribute('aria-busy',String(busy));};
 input.addEventListener('input',()=>{retain();setBusy(busy);},{signal});
 for(const choice of choices)choice.addEventListener('change',()=>{selectDecision(choice.value);retain();setBusy(busy);},{signal});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!binding?.available||!reviewText().trim())return;setBusy(true);retain();status.textContent='saving your reply';
  try{const result=await sendFeedback({key,binding,text:reviewText()});if(signal.aborted)return;
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
   if(pending&&!pending.receipt){input.value=pending.args.original_text;selectDecision('');status.textContent='earlier reply unconfirmed · retry preserves it';}
   else if(pending?.receipt){details.hidden=false;details.querySelector('pre').textContent=JSON.stringify({report_id:pending.receipt.report_id,status:pending.receipt.status},null,2);}
  }
  setBusy(false);
 }).catch(()=>{if(!signal.aborted){status.textContent='reply routing unavailable · try reopening this capture';setBusy(false);}});
 return()=>controller.abort();
}
