import {recordedChecklist,projectWork} from './work-checklists.js';
import {assignmentPresentation,statusLabel,eventLabel,summaryText} from './presentation-copy.js';
import {feedbackApi,feedbackFailure,sendFeedback} from './feedback-client.js';
import {glyph} from './glyphs.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={field:'field',relay:'relay',ctrl:'ctrl',rtxforge:'rtxForge',loewfi:'loew.fi','bazzite-custom':'loewOS'};
let active=null,references=0,unlisten=null;
export function detailTarget(href,origin=location.origin){try{const u=new URL(href,origin);if(u.origin!==origin)return null;const path=u.hash.startsWith('#/runner/')?u.hash.slice(1).split('?')[0]:u.pathname;const m=path.match(/^\/runner\/([^/]+)\/([^/]+)$/);return m?{project:decodeURIComponent(m[1]),assignment:decodeURIComponent(m[2])}:null;}catch{return null;}}
export function openWorkDetails({project,assignment=null,filter=null}){
 if(!/^[a-z0-9-]{1,80}$/.test(project||''))return;
 active?.close();const previous=document.activeElement,controller=new AbortController(),signal=controller.signal;
 const dialog=document.createElement('dialog');dialog.className='work-detail-dialog';dialog.setAttribute('aria-labelledby','work-detail-heading');
 const close=()=>{controller.abort();dialog.close();dialog.remove();if(active?.dialog===dialog)active=null;if(previous?.isConnected)previous.focus?.();};active={dialog,close};
 dialog.innerHTML=`<header><h2 id="work-detail-heading">${esc(names[project]||project)} · ${assignment?'work details':'project details'}</h2><button type="button" data-close aria-label="close details">${glyph('close')}</button></header><div class="work-detail-body" aria-busy="true"><p role="status">loading the latest work…</p></div>`;
 document.body.append(dialog);dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();close();},{signal});dialog.querySelector('[data-close]').addEventListener('click',close,{signal});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}},{signal});
 const body=dialog.querySelector('.work-detail-body');
 const get=async url=>{const response=await fetch(url,{headers:{Accept:'application/json'},signal});if(!response.ok)throw Error('Work details are unavailable. Close and try again.');return response.json();};
 void (async()=>{
  try{
   const metadata=await get('/api/projects/'+encodeURIComponent(project));if(signal.aborted)return;
   const {claims,queued:queue}=projectWork(metadata.coordination);
   const assignmentRow=item=>{const copy=assignmentPresentation(item),checks=recordedChecklist(item);return `<li><button type="button" data-assignment="${esc(item.id)}"><span aria-hidden="true">${item.state==='completed'?glyph('check'):glyph('play')}</span><span><strong>${esc(copy.title)}</strong><small>${esc(statusLabel(item.state))}${checks.total?' · '+checks.total+' recorded requirements':''}</small></span>${glyph('next')}</button></li>`;};
   if(!assignment){
    const completed=claims.filter(x=>x.state==='completed').length;
    body.innerHTML=`<p>${claims.length} recorded assignments · ${completed} completed. This measures recorded assignments, not every planned feature.</p><section><h3>work checklist</h3><ul class="work-detail-checklist">${claims.map(assignmentRow).join('')||'<li>no recorded assignments yet</li>'}</ul></section>${queue.length?`<section><h3>planned work</h3><ul class="work-detail-checklist">${queue.map(assignmentRow).join('')}</ul></section>`:''}<section><h3>ideas</h3>${Array.isArray(metadata.project?.ideas)&&metadata.project.ideas.length?`<ul class="work-detail-checklist">${metadata.project.ideas.map((idea,index)=>`<li><details><summary>${esc(summaryText(typeof idea==='string'?idea:idea.title,'idea '+(index+1)))}</summary><p>${esc(summaryText(idea.description,'No further detail recorded.'))}</p></details></li>`).join('')}</ul>`:'<p>No ideas have been itemized in this project record.</p>'}</section><section data-project-checks><h3>automatic checks</h3><p>checking the latest result…</p></section><p class="work-detail-note">Open an item for its goals, itemized requirements and reply actions. Requirements without a completion record stay unverified.</p>`;
    for(const button of body.querySelectorAll('[data-assignment]'))button.addEventListener('click',()=>openWorkDetails({project,assignment:button.dataset.assignment}),{signal});
    void get('/api/workers').then(workers=>{if(signal.aborted)return;const worker=Array.isArray(workers)?workers.find(item=>item.id===project):null,slot=body.querySelector('[data-project-checks]');if(slot)slot.innerHTML='<h3>automatic checks</h3>'+ (worker?'<p>'+esc(statusLabel(worker.runtime?.status))+' · '+(worker.enabled?'scheduled':'paused')+'</p><p>'+esc(summaryText(worker.runtime?.last_summary,worker.runtime?.last_error?'The last check needs attention.':'No result summary reported.'))+'</p><details class="work-detail-record"><summary>technical result</summary><pre>'+esc(JSON.stringify(worker,null,2))+'</pre></details>':'<p>No automatic check is recorded for this project.</p>');}).catch(()=>{if(!signal.aborted){const slot=body.querySelector('[data-project-checks]');if(slot)slot.innerHTML='<h3>automatic checks</h3><p>Check results could not refresh.</p>';}});
   }else{
    const claim=claims.find(x=>x.id===assignment)||queue.find(x=>x.id===assignment);if(!claim)throw Error('This assignment is no longer in this project. Open the project to see current work.');
    const payload=claim.state==='queued'?{progress:[]}:await get('/api/progress/'+encodeURIComponent(project)+'?assignment='+encodeURIComponent(assignment));if(signal.aborted)return;
    const progress=payload.progress?.find(x=>x.assignment===assignment)||{},item={...claim,...progress},copy=assignmentPresentation(item);
    const checks=recordedChecklist(claim);
    body.innerHTML=`<button type="button" class="work-detail-back">${glyph('previous')}all project work</button><h3>${esc(copy.title)}</h3><span class="status-chip">${esc(statusLabel(item.state==='active'?'working':item.state))}</span><p>${esc(copy.detail)}</p><section><h3>next step</h3><p>${esc(copy.next)}</p></section><section><h3>deliverables</h3>${checks.total?`<p>${checks.percent==null?'Completion is not itemized yet.':`${checks.percent}% · ${checks.completed} of ${checks.total} items recorded complete.`} ${checks.structured?'This reflects the saved checklist.':'These requirements come from the recorded acceptance criteria; their individual completion has not been reported.'}</p><ul class="work-detail-checklist">${checks.items.map(check=>`<li><details><summary><span aria-hidden="true">${glyph(check.completed?'check':'play')}</span>${esc(check.title)}<small>${esc(check.status)}</small></summary><p>${esc(check.description)}</p><details class="work-detail-record"><summary>recorded wording</summary><p>${esc(check.original)}</p></details></details></li>`).join('')}</ul>`:'<p>No deliverables or acceptance checklist is recorded for this assignment.</p>'}</section><section><h3>recent changes</h3><ul>${(item.events||[]).filter(e=>e.type!=='runner-heartbeat').slice(0,4).map(e=>`<li>${esc(eventLabel(e.type))}${e.at?' · '+esc(new Date(e.at).toLocaleString()):''}</li>`).join('')||'<li>no recent change recorded</li>'}</ul></section><section class="work-detail-reply"><h3>send a decision or reply</h3><p class="work-detail-note">Your reply is saved with this assignment. Delivery and acknowledgment are tracked separately.</p><textarea rows="3" maxlength="8192" aria-label="reply to this assignment" placeholder="what should happen next?"></textarea><div class="work-detail-actions"><button type="button" data-answer="looks good" disabled>looks good</button><button type="button" data-answer="needs changes" disabled>needs changes</button><button type="button" data-send disabled>send reply</button></div><p role="status" data-reply-status>checking reply connection…</p><button type="button" data-recheck>recheck reply connection</button><details class="work-detail-record" data-reply-diagnostic hidden><summary>connection details</summary><pre></pre></details></section><details class="work-detail-record"><summary>technical record</summary><pre>${esc(JSON.stringify({claim,progress},null,2))}</pre></details>`;
    body.querySelector('.work-detail-back').addEventListener('click',()=>openWorkDetails({project}),{signal});
    const input=body.querySelector('textarea'),status=body.querySelector('[data-reply-status]'),buttons=[...body.querySelectorAll('[data-answer],[data-send]')];
    const key='ctrl.assignment.reply.v2.'+project+'.'+assignment;let binding=null,busy=false;
    try{input.value=sessionStorage.getItem(key+'.draft')||'';}catch{}
    input.addEventListener('input',()=>{try{sessionStorage.setItem(key+'.draft',input.value);}catch{}},{signal});
    const send=async text=>{if(busy||!binding)return;busy=true;buttons.forEach(b=>b.disabled=true);status.textContent='saving your reply';try{const result=await sendFeedback({key,binding,text});if(!signal.aborted)status.textContent=result.label;}catch(error){if(!signal.aborted)status.textContent=error.message;}finally{busy=false;if(!signal.aborted)buttons.forEach(b=>b.disabled=!binding);}};
    for(const button of buttons)button.addEventListener('click',()=>void send(button.dataset.answer?(button.dataset.answer+(input.value.trim()?'\n\n'+input.value:'')):input.value),{signal});
    const recheck=body.querySelector('[data-recheck]'),diagnostic=body.querySelector('[data-reply-diagnostic]');
    const connect=async(refresh=false)=>{
     recheck.disabled=true;binding=null;buttons.forEach(b=>b.disabled=true);status.textContent='checking reply connection…';diagnostic.hidden=true;
     let head=progress.identities?.head_sha||claim.merged_head_sha;
     try{
      if(refresh&&claim.state!=='queued'){const latest=await get('/api/progress/'+encodeURIComponent(project)+'?assignment='+encodeURIComponent(assignment));head=latest.progress?.find(x=>x.assignment===assignment)?.identities?.head_sha;}
      if(!/^[a-f0-9]{40}$/.test(head||'')){status.textContent=claim.state==='queued'?'reply available after this work is picked up':'reply unavailable until the current work version is confirmed';return;}
      const candidate=await feedbackApi('/api/feedback/binding?'+new URLSearchParams({project,assignment,head_sha:head}),{signal});
      if(!candidate.available||!candidate.args)throw Object.assign(Error(candidate.reason||'Reply routing unavailable.'),{responseClass:'unavailable'});
      if(!signal.aborted){binding=candidate;status.textContent='ready to send';buttons.forEach(b=>b.disabled=false);}
     }catch(error){if(!signal.aborted){status.textContent=feedbackFailure(error);diagnostic.hidden=false;diagnostic.querySelector('pre').textContent=JSON.stringify({status:error.status||null,response_class:error.responseClass||error.name||'network',message:error.message,displayed_head:head||null},null,2);}}
     finally{if(!signal.aborted)recheck.disabled=false;}
    };
    recheck.addEventListener('click',()=>{if(!busy)void connect(true);},{signal});
    await connect();
   }
   body.setAttribute('aria-busy','false');
  }catch(error){if(!signal.aborted){body.textContent=error.message;body.setAttribute('aria-busy','false');}}
 })();
 return close;
}
function summaryTextSafe(value){return assignmentPresentation({next_action:value}).next;}
export function bindWorkDetails(){
 references++;
 // Capture matching links before React Router handles their default navigation.
 // Its Link handler respects preventDefault; modified clicks still open normally.
 if(!unlisten){const listener=event=>{if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const target=event.target.closest?.('[data-work-project],a[href]');if(!target)return;let detail;if(target.dataset.workProject)detail={project:target.dataset.workProject,assignment:target.dataset.workAssignment||null};else detail=detailTarget(target.getAttribute('href'));if(!detail)return;event.preventDefault();openWorkDetails(detail);};document.addEventListener('click',listener,true);unlisten=()=>document.removeEventListener('click',listener,true);}
 return()=>{if(--references===0){unlisten?.();unlisten=null;active?.close();}};
}
