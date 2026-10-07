import {featureIconMarkup} from './feature-icons.js';
import {renderWorkControls,workControlLabels,applyWorkControlChoice} from './work-controls.js';
import {bindWorkDetails} from './work-details.js';
import {preparePreviewImage} from './preview-image.js';
import {captureMotionLayout,settleMotionLayout} from "./field-springs.js";
import {projectInGroup} from "./project-groups.js";
import {glyph} from './glyphs.js';
import {summaryText,statusLabel} from './presentation-copy.js';
import {reviewKey,effectiveReview,selectWork,reviewTransition,reviewConfirmationIsCurrent} from './work-view-model.js';
import {iconSlot,hydrateProjectIcons} from '../../apps/web/public/project-icons.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels=workControlLabels;
const names={relay:'relay',field:'field',loewfi:'loew.fi',rtxforge:'rtxForge','bazzite-custom':'loewOS',gamebridge:'GameBridge'};
const name=id=>names[id]||id.replace(/[-_]+/g,' ');
export function projectBadge(project){return '<button type="button" class="work-project-badge" data-work-project="'+escape(project)+'">'+iconSlot(project)+'<strong>'+escape(name(project))+'</strong></button>';}
function safeHref(value){try{const url=new URL(value,location.origin);return url.origin===location.origin?url.pathname+url.search+url.hash:'';}catch{return '';}}
async function request(action,items){
 const response=await fetch('/api/work-review',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({action,items}),signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error('Review storage returned '+response.status+'. Refresh before trying again.');
 return response.json();
}
export function bindWorkViewer(root,{id,defaultView='list',onOpen,initialFilter='pending',predicates={},extensionControls=[]}={}){
 const releaseDetails=bindWorkDetails();
 let items=[],records={},loaded=false,incomplete=true,project='',view=defaultView,query={filter:initialFilter,search:'',sort:'time',direction:'desc',extensions:{}},selection=new Set(),scope='selected',pending=null,undo=[],busy=false,message='',generation=0,disposed=false;
 const openMenus=new Set();
 const storageKey='relay.work-view.'+id;let anchorRestored=false;const fresh=new Set();
 try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(saved){view=['list','visual'].includes(saved.view)?saved.view:defaultView;const prior=saved.query||{};query={...query,filter:Object.hasOwn(labels,prior.filter)?prior.filter:initialFilter,search:typeof prior.search==='string'?prior.search:'',sort:['time','importance'].includes(prior.sort)?prior.sort:'time',direction:['asc','desc'].includes(prior.direction)?prior.direction:'desc',extensions:prior.extensions&&typeof prior.extensions==='object'&&!Array.isArray(prior.extensions)?prior.extensions:{}};}}catch{}
 const save=()=>{try{sessionStorage.setItem(storageKey,JSON.stringify({view,query}));}catch{}};
 const visible=()=>selectWork(items,{...query,project},records,predicates);
 const targets=()=>scope==='selected'?items.filter(item=>selection.has(reviewKey(item))):scope==='all-projects'?selectWork(items,{...query,project:''},records,predicates):visible();
 const canOrganize=item=>!['loading','unavailable'].includes(effectiveReview(item,records[reviewKey(item)]).status);
 const confirmationReady=()=>!busy&&pending&&reviewConfirmationIsCurrent(items,pending.items,records,pending.versions,loaded);
 const changedTargets=action=>targets().filter(canOrganize).filter(item=>action==='clear-stale'?effectiveReview(item,records[reviewKey(item)]).status==='stale'&&!effectiveReview(item,records[reviewKey(item)]).archived:action==='clear-complete'?effectiveReview(item,records[reviewKey(item)]).status==='completed'&&!effectiveReview(item,records[reviewKey(item)]).archived:true);
 function render(){
  if(disposed)return;
  const motionBefore=captureMotionLayout(root);
  const focus=root.contains(document.activeElement)?document.activeElement:null,focusName=focus?.getAttribute('data-focus'),start=focus?.selectionStart,end=focus?.selectionEnd;
  const anchor=[...root.querySelectorAll('[data-work-key]')].find(node=>node.getBoundingClientRect().bottom>0);
  const anchorKey=anchor?.dataset.workKey,anchorY=anchor?.getBoundingClientRect().top;
  const rows=visible(),visibleKeys=new Set(rows.map(reviewKey)),hidden=[...selection].filter(key=>!visibleKeys.has(key)).length;
  root.removeAttribute('aria-live');root.className='work-viewer'+(root.id==='review-list'?' review-list':'');root.dataset.summaryState=loaded&&items.every(canOrganize)&&(items.length||!incomplete)?'ready':'loading';root.dataset.summaryNeeds=String(items.filter(item=>projectInGroup(item.project,project)&&!effectiveReview(item,records[reviewKey(item)]).archived&&effectiveReview(item,records[reviewKey(item)]).status==='pending').length);root.dataset.summaryVisible=String(rows.length);const scoped=items.filter(item=>projectInGroup(item.project,project)),states=scoped.map(item=>effectiveReview(item,records[reviewKey(item)]));root.dataset.summaryTotal=String(scoped.length);root.dataset.summaryCompleted=String(states.filter(item=>item.status==='completed').length);root.dataset.summaryUnknown=String(states.filter(item=>['loading','unavailable'].includes(item.status)).length);root.dataset.summaryStale=String(states.filter(item=>item.status==='stale'&&!item.archived).length);root.dataset.summaryOther=String(states.filter(item=>!['completed','pending','loading','unavailable'].includes(item.status)||item.archived&&item.status==='pending').length);root.dataset.view=view;root.setAttribute('aria-busy',String(busy));
  const visuals=new Map([...root.querySelectorAll('[data-work-key]')].map(node=>[node.dataset.workKey,node.querySelector('.work-item-visual')]));
  const menus=[...openMenus],template=document.createElement('template');
  template.innerHTML=`<div class="work-view-controls">${renderWorkControls({query,view,openMenus:menus,selected:selection.size,visible:rows.length,hidden,allVisibleSelected:Boolean(rows.length&&rows.every(item=>selection.has(reviewKey(item)))),busy,loaded,scope,extensionControls,canAct:action=>changedTargets(action).length>0,outerGlyph:glyph})}
   ${incomplete?'<p class="work-query-help">Some updates are still loading. Changes only affect the items shown.</p>':''}
   ${pending?`<div class="work-confirm" role="group" aria-label="confirm review changes"><strong>${escape(pending.label)}: ${pending.items.length} item${pending.items.length===1?'':'s'} in ${new Set(pending.items.map(item=>item.project)).size} project(s)</strong><p>${escape(pending.scope)}. ${escape(query.search?'search: '+query.search+'. ':'')}this only organizes your review list.</p><button type="button" data-confirm ${confirmationReady()?'':'disabled'}>apply to these ${pending.items.length} items</button><button type="button" data-cancel ${busy?'disabled':''}>cancel</button></div>`:''}
   <div class="work-message" role="status">${escape(message)}${!loaded&&!busy?'<button type="button" data-refresh>refresh review state</button>':''}${undo.length?'<button type="button" data-undo '+(busy?'disabled':'')+'>undo last change</button>':''}</div>
  </div>
  <div class="work-results" aria-label="work items">${rows.length?rows.map(item=>{
   const key=reviewKey(item),review=effectiveReview(item,records[key]),url=safeHref(item.href||'');
   const readableTitle=summaryText(item.title.replace(/\b20\d{6}\b/g,'').replace(/[-_]+/g,' ').trim(),name(item.project)+' update');
   const title=item.kind==='check'?`<button type="button" class="work-open" data-work-project="${escape(item.project)}">${escape(readableTitle)}</button>`:item.kind==='evidence'?`<button type="button" class="work-open review-open" aria-label="Open ${escape(readableTitle)}" data-review-id="${escape(item.id)}" data-open="${escape(key)}">${escape(readableTitle)}</button>`:url?`<a class="work-open" href="${escape(url)}" data-anchor="${escape(key)}">${escape(readableTitle)}</a>`:`<strong>${escape(readableTitle)}</strong>`;
   const image=item.screenshot&&safeHref(item.screenshot);
   return `<article class="work-item${item.kind==='evidence'?' review-row':''}" data-work-key="${escape(key)}" data-new-work="${fresh.has(key)}" tabindex="-1"><label class="work-select"><input type="checkbox" data-select="${escape(key)}" ${canOrganize(item)&&loaded?'':'disabled'} data-focus="select-${escape(key)}" ${selection.has(key)?'checked':''} aria-label="Select ${escape(readableTitle)} in ${escape(name(item.project))}"></label>
    ${image?`<button type="button" class="work-item-visual preview-surface" data-open="${escape(key)}" aria-label="View Fullscreen: ${escape(readableTitle)}" title="View Fullscreen"><img src="${escape(image)}" alt="" loading="lazy"><span class="preview-expand" aria-hidden="true">${glyph('expand')}</span></button>`:'<div class="work-item-visual" aria-hidden="true"><span class="work-kind-mark" title="'+(item.kind==='check'?'automatic check':item.kind==='evidence'?'capture':'assignment')+'">'+(item.kind==='check'?featureIconMarkup('night-shift'):item.kind==='evidence'?featureIconMarkup('inspector'):glyph('branch'))+'</span></div>'}
    <div class="work-item-copy">${projectBadge(item.project)}<h3>${title}</h3><p>${escape(summaryText(item.detail,statusLabel(item.sourceState)))}</p>
    <div class="work-item-meta"><span>review: ${review.archived?'archived · ':''}${review.status==='loading'?'checking review status':review.status==='unavailable'?'review status unavailable':labels[review.status]}</span><span>${escape(statusLabel(item.sourceState))}</span><time ${item.time==null?'':`datetime="${new Date(item.time).toISOString()}"`}>${item.time==null?'time unknown':new Date(item.time).toLocaleString()}</time>${item.priority?`<span>${escape(item.priority)}</span>`:''}</div>
    <details><summary>technical details</summary><div class="work-source-detail"><p>${escape(item.title)}</p><p>${escape(item.detail)}</p><p>${escape(item.next)}</p><code>${escape(item.id)}</code>${item.source?.identities?.branch?`<p>Branch: ${escape(item.source.identities.branch)}</p>`:''}${item.source?.identities?.head_sha?`<p>Head: ${escape(item.source.identities.head_sha)}</p>`:''}${item.source?.identities?.pr?`<p>PR: ${escape(item.source.identities.pr)}</p>`:''}<p>${escape(item.source?.next_action||item.source?.runtime?.last_summary||'')}</p></div></details></div></article>`;
  }).join(''):`<div class="empty-card"><strong>${items.length?'No matching work.':incomplete?'Waiting for source results.':'No work to show yet.'}</strong><p>${items.length?'Try all or change your search.':'Work appears when Relay receives source activity.'}</p></div>`}</div>`;
  // Keep decoded images and pending image loads alive across metadata refreshes.
  // Template parsing is inert: unused replacement images never start fetching.
  for(const node of template.content.querySelectorAll('[data-work-key]')){
   const visual=node.querySelector('.work-item-visual'),image=visual?.querySelector('img'),old=visuals.get(node.dataset.workKey);
   if(image&&old?.querySelector('img')?.getAttribute('src')===image.getAttribute('src')){
    old.dataset.open=node.dataset.workKey;visual.replaceWith(old);
   }else if(image){
    visual.dataset.imageState=image.complete&&image.naturalWidth?'ready':'loading';
    image.addEventListener('load',()=>{visual.dataset.imageState='ready';},{once:true});
    image.addEventListener('error',()=>{visual.dataset.imageState='error';},{once:true});
   }
  }
  root.replaceChildren(template.content);
  for(const surface of root.querySelectorAll('.preview-surface'))preparePreviewImage(surface,surface.querySelector('img'));
  settleMotionLayout(root,motionBefore);
  for(const item of rows)fresh.delete(reviewKey(item));
  void hydrateProjectIcons(root);
  if(focusName){const next=[...root.querySelectorAll('[data-focus]')].find(node=>node.dataset.focus===focusName);next?.focus({preventScroll:true});if(start!=null&&typeof next?.setSelectionRange==='function')try{next.setSelectionRange(start,end);}catch{}}
  if(anchorKey&&focusName?.startsWith('view-')){const next=[...root.querySelectorAll('[data-work-key]')].find(node=>node.dataset.workKey===anchorKey);if(next)window.scrollBy(0,next.getBoundingClientRect().top-anchorY);}
 }
 let recordRead=null,recordRefreshPending=false;
 async function loadRecords(){
  if(recordRead){recordRefreshPending=true;return recordRead;}
  if(busy){loaded=false;return;}
  const requested=items.slice(),gen=++generation;loaded=false;render();
  const run=(async()=>{
   try{
    const found={};
    for(let start=0;start<requested.length;start+=100){const response=await request('read',requested.slice(start,start+100).map(({project,kind,id})=>({project,kind,id})));if(response.results.some(row=>!row.ok))throw new Error('some review information could not load. refresh before making changes.');for(const row of response.results){const item=requested.find(candidate=>reviewKey(candidate)===row.key),legacy=item?.source?.qaReview;found[row.key]=row.record?{...row.record,etag:row.etag,read_confirmed:true}:item?.reviewHydration?{etag:null,read_confirmed:true}:legacy?{etag:null,read_confirmed:true,source_revision:item.revision,status:legacy.disposition==='archived'?'stale':['completed','stale'].includes(legacy.disposition)?legacy.disposition:legacy.overall?'completed':'pending',archived:legacy.disposition==='archived'}:{etag:null,read_confirmed:true};}}
    if(disposed||gen!==generation)return;records=found;loaded=true;message='';render();
   }catch(error){if(!disposed&&gen===generation){for(const item of items){const key=reviewKey(item);if(item.kind==='evidence'&&records[key]?.source_revision!==item.revision)records[key]={etag:null,read_failed:true};}message=error.message;render();}}
  })();recordRead=run;
  try{await run;}finally{if(recordRead===run)recordRead=null;if(recordRefreshPending&&!disposed){recordRefreshPending=false;void loadRecords();}}
 }
 async function apply(changes,isUndo=false){
  if(busy)return;busy=true;pending=null;message='Saving review changes…';render();const accepted=[],errors=[];
  try{
   for(let start=0;start<changes.length;start+=100){const batch=changes.slice(start,start+100);const response=await request('set',batch.map(change=>change.payload));
    for(const row of response.results){const change=batch.find(entry=>entry.key===row.key);if(row.ok){records[row.key]={...row.record,etag:row.etag};accepted.push({key:row.key,item:change.item,before:change.before,after:records[row.key]});}else errors.push(row.error);}
   }
   undo=isUndo?[]:accepted;message=`${accepted.length} review item(s) updated.`+(errors.length?' '+errors.length+' not changed: '+errors[0]:'');
  }catch(error){loaded=false;message='The save result is uncertain. refresh review state before trying again. '+error.message;undo=isUndo?[]:accepted;}
  finally{busy=false;render();if(!loaded)void loadRecords();}
 }
 function newWork(event){for(const item of event.detail||[])fresh.add(reviewKey(item));}
 function reveal(){
  const requested=new URLSearchParams(location.hash.split('?')[1]||'').get('item');if(!requested)return;
  const item=items.find(item=>item.id===requested&&projectInGroup(item.project,project));
  if(!item){message='This item is no longer available in the loaded results.';render();return;}
  query.filter='all';query.search='';save();render();const node=[...root.querySelectorAll('[data-work-key]')].find(node=>node.dataset.workKey===reviewKey(item));node?.focus({preventScroll:true});node?.scrollIntoView({block:'center'});
 }
 function closeMenu(name){openMenus.delete(name);render();root.querySelector('[data-focus="menu-'+name+'"]')?.focus({preventScroll:true});}
 function keydown(event){
  const control=event.target.closest('[data-query]');
  if(control&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
   const choices=[...control.closest('[role="radiogroup"]').querySelectorAll('[data-query]')],index=choices.indexOf(control),forward=['ArrowRight','ArrowDown'].includes(event.key);
   const next=event.key==='Home'?choices[0]:event.key==='End'?choices.at(-1):choices[(index+(forward?1:-1)+choices.length)%choices.length];
   event.preventDefault();query=applyWorkControlChoice(query,next.dataset.query,next.dataset.value);pending=null;save();render();root.querySelector('[data-focus="'+next.dataset.focus+'"]')?.focus({preventScroll:true});return;
  }
  if(event.key==='Escape'&&openMenus.size){event.preventDefault();const name=event.target.closest('[data-control-menu]')?.dataset.controlMenu||[...openMenus].at(-1);closeMenu(name);}
 }

 function click(event){
  const summary=event.target.closest('summary');
  if(summary?.parentElement?.dataset.controlMenu){event.preventDefault();const name=summary.parentElement.dataset.controlMenu;openMenus.has(name)?openMenus.delete(name):openMenus.add(name);render();root.querySelector('[data-focus="menu-'+name+'"]')?.focus({preventScroll:true});return;}
  const button=event.target.closest('button,a');if(!button)return;
  if(button.dataset.closeMenu){closeMenu(button.dataset.closeMenu);return;}
  if(button.hasAttribute('data-refresh'))void loadRecords();
  if(button.dataset.filter){query=applyWorkControlChoice(query,'filter',button.dataset.filter);pending=null;save();render();}
  if(button.dataset.query){query=applyWorkControlChoice(query,button.dataset.query,button.dataset.value);pending=null;save();render();}
  if(button.dataset.view){view=button.dataset.view;save();render();}
  if(button.hasAttribute('data-clear-selection')){selection.clear();pending=null;render();}
  if(button.dataset.bulk){const action=button.dataset.bulk;pending={action,label:button.textContent,items:changedTargets(action).map(item=>({...item})),versions:Object.fromEntries(changedTargets(action).map(item=>[reviewKey(item),records[reviewKey(item)]?.etag??null])),scope:scope==='selected'?`${selection.size} selected, including ${[...selection].filter(key=>!visible().some(item=>reviewKey(item)===key)).length} outside these results`:scope==='all-projects'?'all projects, matching loaded results':`Current results in ${project?name(project):'all projects'}`};render();root.querySelector('[data-confirm]')?.focus();}
  if(button.hasAttribute('data-cancel')){pending=null;render();}
  if(button.hasAttribute('data-confirm')&&pending){if(!confirmationReady()){message='review information changed. choose the action again.';pending=null;render();return;}const action=pending.action.startsWith('clear-')?'archive':pending.action;void apply(pending.items.map(item=>{const key=reviewKey(item),before=effectiveReview(item,records[key]),after=reviewTransition(before,action);return {key,item,before,payload:{project:item.project,kind:item.kind,id:item.id,source_revision:item.revision,expected_etag:records[key]?.etag??null,operation_id:crypto.randomUUID(),...after}};}));}
  if(button.hasAttribute('data-undo'))void apply(undo.map(entry=>({key:entry.key,item:entry.item,before:effectiveReview(entry.item,entry.after),payload:{project:entry.item.project,kind:entry.item.kind,id:entry.item.id,source_revision:entry.item.revision,expected_etag:entry.after.etag,operation_id:crypto.randomUUID(),...entry.before}})),true);
  if(button.dataset.open)onOpen?.(items.find(item=>reviewKey(item)===button.dataset.open));
  if(button.dataset.anchor)try{sessionStorage.setItem(storageKey+'.anchor',button.dataset.anchor);}catch{}
 }
 function change(event){
  const control=event.target;
  if(control.matches('[data-select-visible]')){for(const item of visible().filter(canOrganize))control.checked?selection.add(reviewKey(item)):selection.delete(reviewKey(item));pending=null;render();return;}
  if(control.dataset.select){control.checked?selection.add(control.dataset.select):selection.delete(control.dataset.select);pending=null;render();return;}
  if(control.name==='scope'){scope=control.value;pending=null;render();return;}
  if(['sort','direction'].includes(control.name)){query[control.name]=control.value;pending=null;save();render();}
  if(control.name?.startsWith('extension:')){query.extensions[control.name.slice(10)]=control.value;save();render();}
 }
 function input(event){if(event.target.name==='search'){query.search=event.target.value;pending=null;save();render();}}
 window.addEventListener('relay:work-arrivals',newWork);window.addEventListener('hashchange',reveal);root.addEventListener('keydown',keydown);root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',input);
 return {
  update(next,{project:nextProject='',incomplete:partial=false}={}){const identity=next.map(item=>reviewKey(item)+':'+item.revision).join('|'),old=items.map(item=>reviewKey(item)+':'+item.revision).join('|');items=next;project=nextProject;incomplete=partial;if(identity!==old){pending=null;loaded=false;}render();if(identity!==old||(!loaded&&!recordRead))void loadRecords();if(!anchorRestored&&items.length){anchorRestored=true;let saved;try{saved=sessionStorage.getItem(storageKey+'.anchor');}catch{}const requested=new URLSearchParams(location.hash.split('?')[1]||'').get('item');const node=[...root.querySelectorAll('[data-work-key]')].find(node=>requested?items.find(item=>item.id===requested&&reviewKey(item)===node.dataset.workKey):node.dataset.workKey===saved);if(node){node.focus({preventScroll:true});node.scrollIntoView({block:'center'});}}},
  inspect(value,origin){if(!Object.hasOwn(labels,value))return;const rows=selectWork(items,{...query,project,filter:value,search:'',extensions:{}},records);const prior=origin||document.activeElement,dialog=document.createElement('dialog');dialog.className='work-detail-dialog capture-count-dialog';dialog.setAttribute('aria-labelledby','capture-count-heading');dialog.innerHTML=`<header><h2 id="capture-count-heading">${escape(labels[value])} captures · ${rows.length}</h2><button type="button" aria-label="close capture list">${glyph('close')}</button></header><div class="work-detail-body"><p>${rows.length} matching captures in the loaded record.</p><ul class="work-detail-checklist">${rows.map((item,index)=>`<li><button type="button" data-capture-index="${index}"><span aria-hidden="true">${glyph('inspect')}</span><span><strong>${escape(summaryText(item.title,'captured screen'))}</strong><small>${escape(name(item.project))}</small></span>${glyph('next')}</button></li>`).join('')||'<li>No matching captures are reported.</li>'}</ul></div>`;const close=()=>{dialog.close();dialog.remove();if(prior?.isConnected)prior.focus();};document.body.append(dialog);dialog.showModal();dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.querySelector('header button').addEventListener('click',close);for(const button of dialog.querySelectorAll('[data-capture-index]'))button.addEventListener('click',()=>{close();onOpen?.(rows[Number(button.dataset.captureIndex)]);});},
  filter(value){if(!Object.hasOwn(labels,value))return;query.filter=value;query.search="";query.extensions={};pending=null;save();render();root.querySelector('[data-focus="menu-filters"]')?.focus({preventScroll:true});},
  refresh(){void loadRecords();},
  destroy(){releaseDetails();window.removeEventListener('relay:work-arrivals',newWork);window.removeEventListener('hashchange',reveal);disposed=true;generation++;root.removeEventListener('keydown',keydown);root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);}
 };
}
