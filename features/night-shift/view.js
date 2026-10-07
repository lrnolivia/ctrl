import {showLoading} from '../../apps/web/public/loading.js';
import {iconSlot,hydrateProjectIcons} from '../../apps/web/public/project-icons.js';
import {esc,projectName} from '../../apps/web/public/operator-projects.js';
import {featureIconMarkup} from '../../packages/shared-ui/feature-icons.js';
import {loadExecutionReceipts,nightShiftSummary,observerDiagnostic} from '../../packages/shared-ui/night-shift-state.js';

const retained=new WeakMap();
async function json(url){const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Records could not refresh.');return response.json();}
export async function loadNightShift(ui,projectId='') {
  const target=document.querySelector('#night-shift-work');
  if(!target)return;
  const stored=retained.get(target),previous=stored?.projectId===projectId?stored:null,token={};retained.set(target,{...previous,projectId,token});
  if(!previous?.pages)showLoading(target,'night','Loading saved away work');
  // Optional model observers never provide the canonical ledger or its connection state.
  const observers=json('/api/workers').then(workers=>({workers,available:true}),()=>({workers:previous?.workers||[],available:false}));
  try {
    const catalogue=await json('/api/projects');
    if(!Array.isArray(catalogue.projects))throw Error('Project records unavailable.');
    const projects=catalogue.projects.filter(project=>project.managed!==false&&(!projectId||project.id===projectId));
    const pages=await Promise.all(projects.map(async project=>{
      const prior=previous?.pages?.find(page=>page.project===project.id);
      try {
        const metadata=await json('/api/projects/'+encodeURIComponent(project.id));
        if(!Array.isArray(metadata.coordination?.claims))throw Error('Assignment records unavailable.');
        const assignment=metadata.coordination.claims[0]?.id;
        if(!assignment)return {project:project.id,items:[],oversight:{available:false,reason:'No existing assignment can read this catalogue.'},error:'Away-work catalogue is unconfirmed.'};
        const result=await json('/api/night-shift/items?'+new URLSearchParams({project:project.id,assignment,cursor:'0',limit:'20'}));
        if(!result.ok||!Array.isArray(result.items))throw Error('Saved away-work records unavailable.');
        let executions=prior?.executions||[],executionError;
        try{executions=await loadExecutionReceipts(project.id,json);}catch{executionError='Execution receipts unavailable.';}
        return {...result,project:project.id,assignment,executions,executionError};
      }catch{return {...prior,project:project.id,items:prior?.items||[],error:'Saved away-work records could not refresh.'};}
    }));
    const observer=await observers;
    if(retained.get(target)?.token!==token)return;
    retained.set(target,{pages,workers:observer.workers,projectId,token});
    const summary=nightShiftSummary(pages,{scopeAvailable:projects.length>0});
    ui.setOverviewDetail(summary.records.length+' saved away-work records'+(summary.incomplete?' · some evidence unconfirmed':''));
    const rows=summary.records.map(({page,item,semantics})=>`<article class="task-row" data-work-state="${esc(semantics.kind)}" data-tone="${esc(semantics.tone)}"><div class="task-state status-badge" data-tone="${esc(semantics.tone)}">${featureIconMarkup('night-shift',{compact:true})}<span>${esc(semantics.label)}</span></div><div class="task-copy"><strong class="project-name">${iconSlot(page.project)}${esc(projectName(page.project))}</strong><p>${esc(item.summary||'Recorded away work')}</p><small>Declared away window: ${esc(item.declared_away_window?.start||'unknown')} to ${esc(item.declared_away_window?.end||'unknown')}</small><p><a href="/#/night-shift?project=${encodeURIComponent(page.project)}">Open saved work and Shift controls</a></p></div></article>`).join('');
    const errors=pages.filter(page=>page.error||page.executionError).map(page=>`<p role="status">${esc(projectName(page.project))}: ${esc(page.error||page.executionError)} Previously loaded records remain available.</p>`).join('');
    const visibleObservers=observer.workers.filter(worker=>!projectId||worker.id===projectId);
    const diagnostics=visibleObservers.map(worker=>{const diagnostic=observerDiagnostic(worker);return `<p>${esc(projectName(worker.id))} · ${esc(diagnostic.error||worker.runtime?.last_summary||'No observer result recorded.')}</p>`;}).join('');
    target.innerHTML=`<p>Saved source and execution receipts. Declared away times do not measure working time or confirm completion.</p>${errors}${rows||'<div class="operator-empty">'+(summary.incomplete?'Away-work records are not fully confirmed.':'No away-work receipts have been recorded.')+'</div>'}<details><summary>historical observer diagnostics</summary><p>Optional model checks are independent of saved work and current execution.</p>${!observer.available?'<p>Observer updates unavailable; previous results are retained.</p>':''}${diagnostics}</details>`;
    hydrateProjectIcons(target);
    ui.setConnection(summary.incomplete?'records incomplete':'connected',summary.incomplete?'quiet':'good');
  }catch(error){
    await observers;
    if(retained.get(target)?.token!==token)return;
    if(!previous?.pages)target.innerHTML='<div class="operator-empty">'+esc(error.message)+'</div>';
    ui.setOverviewDetail('Saved away-work records could not refresh'+(previous?.pages?' · previous records retained':''));
    ui.setConnection('records unavailable','quiet');
  }
}
