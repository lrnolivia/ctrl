import {feedbackApi,feedbackFailure,sendFeedback,refreshFeedback,feedbackLabel} from './feedback-client.js';
import {glyph} from './glyphs.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function assignmentReplyText({decision='',note='',exactText=null}={}) {
 if(exactText!==null)return String(exactText);
 const prefix={good:'Looks good',changes:'Needs changes'}[decision]||'';
 return prefix?prefix+(String(note).trim()?'\n\n'+note:''):String(note);
}
export function selectAssignmentDecision(state,value) {
 const decision=['good','changes'].includes(value)?value:'';
 return {...state,decision,exactText:null,notesOpen:decision==='changes'||Boolean(state.note?.trim())||(decision===''&&state.notesOpen)};
}
export function clearAssignmentDecision(state) {
 return {...state,decision:'',exactText:null,notesOpen:Boolean(state.note?.trim())||state.notesOpen};
}
export function replySubmissionAllowed(state,binding,busy=false) {
 const text=assignmentReplyText(state);return !busy&&binding?.available===true&&text.trim().length>0&&text.length<=8192;
}
export function replyFormMarkup(){return `<form class="review-reply assignment-reply-form"><p class="assignment-reply-intro">Choose a decision, add a note, or both. Nothing is sent until you choose Send reply.</p><fieldset class="review-decision"><legend>Your decision</legend><label><input type="radio" name="decision" value="good"><span>${glyph('check')}Looks good</span></label><label><input type="radio" name="decision" value="changes"><span>${glyph('repair')}Needs changes</span></label></fieldset><div class="assignment-reply-note-tools"><button type="button" data-toggle-note aria-expanded="false">Add a note</button><button type="button" data-clear-decision hidden>Remove selection</button></div><label class="review-note-label" data-note-region hidden>Note<textarea rows="3" maxlength="8192" aria-label="reply to this assignment" placeholder="Add a detail or ask a question…"></textarea><small>Up to 8,192 characters, including your decision.</small></label><div class="review-reply-actions"><button type="submit" data-send disabled>${glyph('save')}<span>Send reply</span></button><button type="button" class="assignment-reply-done" data-reply-done>Done</button></div><div class="assignment-reply-status"><p role="status" data-reply-status>checking reply connection…</p><button type="button" data-recheck>Recheck reply connection</button><button type="button" data-refresh-status hidden>Check for updates</button><details class="work-detail-record" data-reply-receipt hidden><summary>reply details</summary><pre></pre></details><details class="work-detail-record" data-reply-diagnostic hidden><summary>connection details</summary><pre></pre></details></div></form>`;}

export function mountAssignmentReplyForm(root,{project,assignment,claim,progress={},get,onDone=()=>{},signal:parentSignal,api=feedbackApi,storage=sessionStorage,send=sendFeedback,refresh=refreshFeedback}={}) {
 const controller=new AbortController(),signal=controller.signal;
 if(parentSignal?.aborted){controller.abort();return()=>{};}
 parentSignal?.addEventListener('abort',()=>controller.abort(),{once:true});
 const key='ctrl.assignment.reply.v2.'+project+'.'+assignment;
 let binding=null,busy=false,disposed=false,state={decision:'',note:'',notesOpen:false,exactText:null},savedText=null,readGeneration=0;
 const readSaved=()=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
 try{state.note=storage.getItem(key+'.draft')||'';state.decision=storage.getItem(key+'.decision')||'';}catch{}
 state=selectAssignmentDecision(state,state.decision);
 const saved=readSaved();if(saved?.args?.original_text&&!saved.receipt){state={...state,decision:'',note:saved.args.original_text,notesOpen:true,exactText:saved.args.original_text};}
 if(saved?.receipt)savedText=saved.args?.original_text??null;
 root.innerHTML=replyFormMarkup();
 const form=root.querySelector('form'),input=root.querySelector('textarea'),status=root.querySelector('[data-reply-status]'),submit=root.querySelector('[data-send]'),noteRegion=root.querySelector('[data-note-region]'),noteToggle=root.querySelector('[data-toggle-note]'),clear=root.querySelector('[data-clear-decision]'),recheck=root.querySelector('[data-recheck]'),refreshButton=root.querySelector('[data-refresh-status]'),receipt=root.querySelector('[data-reply-receipt]'),diagnostic=root.querySelector('[data-reply-diagnostic]'),choices=[...root.querySelectorAll('[name=decision]')];
 const retain=()=>{try{storage.setItem(key+'.draft',state.note);storage.setItem(key+'.decision',state.decision);}catch{status.textContent='Reload recovery is unavailable. Keep this reply open.';}};
 function render(){
  if(disposed||signal.aborted)return;
  input.value=state.note;input.readOnly=busy;noteRegion.hidden=!state.notesOpen;noteToggle.textContent=state.notesOpen?'Hide note':'Add a note';noteToggle.setAttribute('aria-expanded',String(state.notesOpen));noteToggle.disabled=busy;clear.hidden=!state.decision;clear.disabled=busy;
  for(const choice of choices){choice.checked=choice.value===state.decision;choice.disabled=busy;}
  const isSaved=savedText!==null&&savedText===assignmentReplyText(state);
  submit.disabled=!replySubmissionAllowed(state,binding,busy)||isSaved;submit.querySelector('span').textContent=busy?'Saving reply…':isSaved?'Reply saved':'Send reply';form.setAttribute('aria-busy',String(busy));
  const pending=readSaved();refreshButton.hidden=!pending?.receipt?.report_id;refreshButton.disabled=busy;recheck.disabled=busy;receipt.hidden=!pending;
  if(pending)receipt.querySelector('pre').textContent=JSON.stringify({report_id:pending.receipt?.report_id||null,operation_id:pending.args?.operation_id,original_text:pending.args?.original_text,recipient:{owner:pending.args?.expected_owner,branch:pending.args?.expected_branch,artifact:pending.args?.artifact},receipt:pending.receipt||null},null,2);
 }
 for(const choice of choices)choice.addEventListener('change',()=>{if(busy)return;state=selectAssignmentDecision(state,choice.value);retain();render();},{signal});
 clear.addEventListener('click',()=>{if(busy)return;state=clearAssignmentDecision(state);retain();render();},{signal});
 noteToggle.addEventListener('click',()=>{if(busy)return;state={...state,notesOpen:!state.notesOpen};render();if(state.notesOpen)input.focus();},{signal});
 input.addEventListener('input',()=>{state={...state,note:input.value,exactText:null};retain();render();},{signal});
 root.querySelector('[data-reply-done]').addEventListener('click',()=>{retain();onDone();},{signal});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!replySubmissionAllowed(state,binding,busy)||savedText===assignmentReplyText(state))return;
  const text=assignmentReplyText(state);busy=true;retain();status.textContent='Saving your reply…';render();
  try{const result=await send({key,binding,text,api,storage});if(signal.aborted)return;savedText=text;status.textContent=result.label;}
  catch(error){if(!signal.aborted)status.textContent=error.message;}
  finally{busy=false;render();}
 },{signal});
 refreshButton.addEventListener('click',async()=>{if(busy)return;busy=true;render();status.textContent='Checking the saved reply…';try{const result=await refresh({key,api,storage});if(!signal.aborted)status.textContent=result.label;}catch(error){if(!signal.aborted)status.textContent=error.message;}finally{busy=false;render();}},{signal});
 async function connect(refreshHead=false){
  const generation=++readGeneration;binding=null;recheck.disabled=true;status.textContent='Checking reply connection…';diagnostic.hidden=true;render();
  let head=progress.identities?.head_sha||claim?.merged_head_sha;
  try{
   if(refreshHead&&claim?.state!=='queued'){const latest=await get('/api/progress/'+encodeURIComponent(project)+'?assignment='+encodeURIComponent(assignment));head=latest.progress?.find(item=>item.assignment===assignment)?.identities?.head_sha;}
   if(signal.aborted||generation!==readGeneration)return;
   if(!/^[a-f0-9]{40}$/.test(head||'')){status.textContent=claim?.state==='queued'?'Reply is available after this work is picked up.':'Reply is unavailable until the current work version is confirmed.';return;}
   const candidate=await api('/api/feedback/binding?'+new URLSearchParams({project,assignment,head_sha:head}),{signal});
   if(signal.aborted||generation!==readGeneration)return;
   if(!candidate.available||!candidate.args)throw Object.assign(Error(candidate.reason||'Reply routing unavailable.'),{responseClass:'unavailable'});
   const args=candidate.args;
   if(args.project!==project||args.assignment!==assignment||args.expected_owner!==claim?.owner||args.expected_branch!==claim?.branch||args.artifact?.commit_sha!==head)throw Error('Reply routing does not match this work. Recheck before replying.');
   binding=candidate;const pending=readSaved();status.textContent=pending?.receipt?(pending.args?.original_text===assignmentReplyText(state)?feedbackLabel(pending.receipt):'ready to send'):pending?'Earlier reply is unconfirmed. Retry preserves its exact text.':'ready to send';
  }catch(error){if(!signal.aborted&&generation===readGeneration){status.textContent=feedbackFailure(error);diagnostic.hidden=false;diagnostic.querySelector('pre').textContent=JSON.stringify({status:error.status||null,response_class:error.responseClass||error.name||'network',message:error.message,displayed_head:head||null},null,2);}}
  finally{if(!signal.aborted&&generation===readGeneration){recheck.disabled=false;render();}}
 }
 recheck.addEventListener('click',()=>{if(!busy)void connect(true);},{signal});render();void connect();
 return()=>{disposed=true;readGeneration++;controller.abort();};
}
