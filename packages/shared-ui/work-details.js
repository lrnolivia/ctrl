import {workState} from './work-state.js';
import {mountAssignmentReplyForm} from './assignment-reply-form.js';
import {recordedChecklist,projectWork} from './work-checklists.js';
import {assignmentPresentation,statusLabel,eventLabel,summaryText} from './presentation-copy.js';
import {feedbackApi,feedbackFailure,sendFeedback,refreshFeedback} from './feedback-client.js';
import {glyph} from './glyphs.js';
import {renderControlShell,renderControlFooter} from './work-controls.js';
import {needsHumanReview} from './attention.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={field:'field',relay:'relay',ctrl:'ctrl',rtxforge:'rtxForge',loewfi:'loew.fi','bazzite-custom':'loewOS'};
let active=null,references=0,unlisten=null;
export function detailTarget(href,origin=location.origin){try{const u=new URL(href,origin);if(u.origin!==origin)return null;const path=u.hash.startsWith('#/runner/')?u.hash.slice(1).split('?')[0]:u.pathname;const m=path.match(/^\/runner\/([^/]+)\/([^/]+)$/);return m?{project:decodeURIComponent(m[1]),assignment:decodeURIComponent(m[2])}:null;}catch{return null;}}
export function openWorkDetails({project,assignment=null,filter=null,back=null}){
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

   if(!assignment){
    const completed=claims.filter(x=>x.state==='completed').length;
    body.innerHTML=`<div class="work-detail-intro"><p>See what is recorded, what needs attention and what to open next.</p><dl class="work-detail-stats"><div><dt>recorded work</dt><dd>${claims.length}</dd></div><div><dt>completed</dt><dd>${completed}</dd></div><div><dt>queued</dt><dd>${queue.length}</dd></div></dl><p class="work-detail-note">Counts cover saved assignments, not every planned feature. Reserved work does not confirm a worker has started.</p></div><section><h3>explore project work</h3><div data-project-work></div></section>${Array.isArray(metadata.project?.ideas)&&metadata.project.ideas.length?`<section><h3>ideas to explore</h3><ul class="work-detail-checklist">${metadata.project.ideas.map((idea,index)=>`<li><details><summary>${esc(summaryText(typeof idea==='string'?idea:idea.title,'idea '+(index+1)))}</summary><p>${esc(summaryText(idea.description,'No further detail recorded.'))}</p></details></li>`).join('')}</ul></section>`:''}<section data-project-checks><h3>automatic checks</h3><p>checking the latest result…</p></section>`;
    mountWorkCollection(body.querySelector('[data-project-work]'),[...claims,...queue].map(item=>({project,item:{...item,assignment:item.id}})),row=>openWorkDetails({project,assignment:row.item.assignment}),{signal});
    void get('/api/workers').then(workers=>{if(signal.aborted)return;const worker=Array.isArray(workers)?workers.find(item=>item.id===project):null,slot=body.querySelector('[data-project-checks]');if(slot)slot.innerHTML='<h3>automatic checks</h3>'+ (worker?'<p>'+esc(statusLabel(worker.runtime?.status))+' · '+(worker.enabled?'scheduled':'paused')+'</p><p>'+esc(summaryText(worker.runtime?.last_summary,worker.runtime?.last_error?'The last check needs attention.':'No result summary reported.'))+'</p><details class="work-detail-record"><summary>technical result</summary><pre>'+esc(JSON.stringify(worker,null,2))+'</pre></details>':'<p>No automatic check is recorded for this project.</p>');}).catch(()=>{if(!signal.aborted){const slot=body.querySelector('[data-project-checks]');if(slot)slot.innerHTML='<h3>automatic checks</h3><p>Check results could not refresh.</p>';}});
   }else{
    const claim=claims.find(x=>x.id===assignment)||queue.find(x=>x.id===assignment);if(!claim)throw Error('This assignment is no longer in this project. Open the project to see current work.');
    const payload=claim.state==='queued'?{progress:[]}:await get('/api/progress/'+encodeURIComponent(project)+'?assignment='+encodeURIComponent(assignment));if(signal.aborted)return;
    const progress=payload.progress?.find(x=>x.assignment===assignment)||{},item={...claim,...progress},copy=assignmentPresentation(item);
    const checks=recordedChecklist(claim);
    body.innerHTML=`<button type="button" class="work-detail-back">${glyph('previous')}${back?'back to list':'all project work'}</button><h3 class="work-detail-title">${esc(copy.title)}</h3><span class="status-chip">${esc(workState(item).label)}</span><p>${esc(copy.detail)}</p><section><h3>next step</h3><p>${esc(copy.next)}</p></section><section><h3>deliverables</h3>${checks.total?`<p>${checks.percent==null?'Completion is not itemized yet.':`${checks.percent}% · ${checks.completed} of ${checks.total} items recorded complete.`} ${checks.structured?'This reflects the saved checklist.':'These requirements come from the recorded acceptance criteria; their individual completion has not been reported.'}</p><ul class="work-detail-checklist">${checks.items.map(check=>`<li><details><summary><span aria-hidden="true">${glyph(check.completed?'check':'play')}</span>${esc(check.title)}<small>${esc(check.status)}</small></summary><p>${esc(check.description)}</p><details class="work-detail-record"><summary>recorded wording</summary><p>${esc(check.original)}</p></details></details></li>`).join('')}</ul>`:'<p>No deliverables or acceptance checklist is recorded for this assignment.</p>'}</section><section><h3>recent changes</h3><ul>${(item.events||[]).filter(e=>e.type!=='runner-heartbeat').slice(0,4).map(e=>`<li>${esc(eventLabel(e.type))}${e.at?' · '+esc(new Date(e.at).toLocaleString()):''}</li>`).join('')||'<li>no recent change recorded</li>'}</ul></section><section class="work-detail-reply" data-assignment-reply></section><details class="work-detail-record"><summary>technical record</summary><pre>${esc(JSON.stringify({claim,progress},null,2))}</pre></details>`;
    body.querySelector('.work-detail-back').addEventListener('click',()=>back?back():openWorkDetails({project}),{signal});
    mountAssignmentReplyForm(body.querySelector('[data-assignment-reply]'),{project,assignment,claim,progress,get,onDone:close,signal});
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

// Filters inspect the exact loaded cohort; they never change review or task status.
const collectionOptions=[['all','everything'],['review','needs your review'],['working','working'],['waiting','waiting'],['queued','queued'],['reserved','reserved'],['held','on hold'],['problem','needs attention'],['complete','completed']];
export function filterWorkCollection(rows,{search='',state='all',project=''}={}){
 const needle=search.trim().toLocaleLowerCase();
 return rows.filter(row=>{
  const item=row.item,kind=workState(item).kind,copy=assignmentPresentation(item);
  const matches=state==='all'||(state==='review'?needsHumanReview(item):state==='problem'?['failed','blocked','stale','unavailable','unknown'].includes(kind):kind===state);
  return matches&&(!project||row.project===project)&&(!needle||[copy.title,copy.detail,row.project,item.assignment||item.id].join(' ').toLocaleLowerCase().includes(needle));
 });
}
function mountWorkCollection(root,rows,onOpen,{signal,query={search:'',state:'all',project:''}}={}){
 const projects=[...new Set(rows.map(row=>row.project))];
 const filterContent=`<p class="work-control-label">assignment state</p><div class="work-filter-bar" role="group" aria-label="assignment state">${collectionOptions.map(([value,label])=>`<button type="button" data-state="${value}" aria-pressed="${query.state===value}">${label}</button>`).join('')}</div>${projects.length>1?`<label class="work-control-extension">project<select data-project><option value="">all projects</option>${projects.map(project=>`<option value="${esc(project)}" ${query.project===project?'selected':''}>${esc(names[project]||project)}</option>`).join('')}</select></label>`:''}${renderControlFooter({hint:'Filters only change this list. Source states stay unchanged.'})}`;
 root.innerHTML=`<div class="work-view-controls work-detail-controls">${renderControlShell({search:query.search,placeholder:'find an assignment',searchLabel:'search assignments',viewOptions:[],hideOrganize:true,filterTitle:'filter assignments',filterContent})}</div><p class="work-detail-results" role="status" aria-live="polite"></p><ul class="work-detail-checklist"></ul>`;
 const list=root.querySelector('ul'),status=root.querySelector('.work-detail-results');
 const render=()=>{const visible=filterWorkCollection(rows,query);status.textContent=`${visible.length} of ${rows.length} loaded assignments`;list.innerHTML=visible.map(row=>{const index=rows.indexOf(row),copy=assignmentPresentation(row.item),semantics=workState(row.item);return `<li><button type="button" data-collection-row="${index}" data-assignment="${esc(row.item.assignment||row.item.id)}"><span aria-hidden="true">${glyph(semantics.kind==='complete'?'check':'branch')}</span><span><strong>${esc(copy.title)}</strong><small>${esc(names[row.project]||row.project)} · ${esc(semantics.label)}</small><span class="work-detail-row-next">${esc(copy.next)}</span></span>${glyph('next')}</button></li>`;}).join('')||'<li class="work-detail-empty">No assignments match these filters. Try another state or clear your search.</li>';};
 root.addEventListener('input',event=>{if(event.target.name==='search'){query.search=event.target.value;render();}},{signal});
 root.addEventListener('change',event=>{if(event.target.matches('[data-project]')){query.project=event.target.value;render();}},{signal});
 root.addEventListener('click',event=>{const choice=event.target.closest('[data-state]'),row=event.target.closest('[data-collection-row]');if(choice){query.state=choice.dataset.state;for(const button of root.querySelectorAll('[data-state]'))button.setAttribute('aria-pressed',String(button===choice));render();}else if(row)onOpen(rows[Number(row.dataset.collectionRow)]);else if(event.target.closest('[data-close-menu]'))root.querySelector('details').open=false;},{signal});
 render();return query;
}
export function openWorkCollection({title,rows,query}){
 active?.close();const previous=document.activeElement,dialog=document.createElement('dialog'),controller=new AbortController();
 dialog.className='work-detail-dialog work-collection-dialog';dialog.setAttribute('aria-labelledby','work-collection-heading');
 const close=()=>{controller.abort();dialog.close();dialog.remove();if(active?.dialog===dialog)active=null;if(previous?.isConnected)previous.focus?.();};active={dialog,close};
 dialog.innerHTML=`<header><h2 id="work-collection-heading">${esc(title)}</h2><button type="button" aria-label="close details">${glyph('close')}</button></header><div class="work-detail-body"><p class="work-detail-intro">Find the work you want to inspect, then open it for its next step and recorded evidence.</p><div data-collection></div></div>`;
 document.body.append(dialog);dialog.showModal();dialog.querySelector('header button').addEventListener('click',close);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 const current=mountWorkCollection(dialog.querySelector('[data-collection]'),rows,row=>openWorkDetails({project:row.project,assignment:row.item.assignment||row.item.id,back:()=>openWorkCollection({title,rows,query:current})}),{signal:controller.signal,query});
 return close;
}
