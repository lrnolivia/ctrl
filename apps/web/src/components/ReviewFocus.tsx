import {useMemo,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {reviewFocus} from '../../../../packages/shared-ui/control-telemetry.js';
import {projectHref} from '../../../../packages/shared-ui/project-context.js';
import {ProjectBadge} from './ProjectBadge';
import type {DashboardSnapshot,ObservedProgress} from '../types';
export function ReviewFocus({snapshot,project='',team}:{snapshot:DashboardSnapshot|null;project?:string;team?:string}){
 const focus=useMemo(()=>reviewFocus(Object.entries(snapshot?.progress||{}).flatMap(([id,payload])=>(payload.progress||[]).filter(item=>!team||item.primary_team===team).map(item=>({project:id,item})))),[snapshot,team]);
 const identity=focus?[focus.project,focus.item.assignment,focus.item.identities?.head_sha||''].join(':'):'';
 const [capture,setCapture]=useState<{identity:string;item:any}|null>(null);
 useEffect(()=>{
  if(!focus||!focus.item.identities?.head_sha)return;
  const controller=new AbortController(),selected=focus;
  void fetch('/api/visual?project='+encodeURIComponent(selected.project),{headers:{Accept:'application/json'},signal:controller.signal}).then(response=>{if(!response.ok)throw Error('evidence unavailable');return response.json();}).then(payload=>{
   const item=(payload.evidence||[]).filter((e:any)=>e.context?.project===selected.project&&(e.context?.assignment||e.context?.assignment_id)===selected.item.assignment&&e.context?.commit_sha===selected.item.identities.head_sha&&e.screenshot_url).sort((a:any,b:any)=>(Date.parse(b.captured_at||b.created_at)||0)-(Date.parse(a.captured_at||a.created_at)||0))[0];
   if(!controller.signal.aborted)setCapture(item?{identity,item}:null);
  }).catch(()=>{if(!controller.signal.aborted)setCapture(null);});
  return()=>controller.abort();
 },[identity]);
 const evidence=capture?.identity===identity?capture.item:null;
 const incomplete=!snapshot||Boolean(snapshot.loadingProgress?.length||snapshot.failedProgress?.length);
 if(!focus)return <section className="review-focus review-focus-clear" aria-label="review focus"><h2>{incomplete?'checking what needs you':'nothing is waiting on your decision'}</h2><p>{incomplete?'your work is still visible below.':'your work and checks are below.'}</p></section>;
 const item=focus.item as ObservedProgress,decision=item.attention_request?.kind?item.attention_request.kind==='decision':item.state==='waiting-for-human';
 const href=projectHref('/runner/'+encodeURIComponent(focus.project)+'/'+encodeURIComponent(item.assignment),project);
 return <section className={'review-focus'+(evidence?' has-evidence':'')} aria-label="review focus"><div className="review-focus-copy"><div className="review-focus-meta"><ProjectBadge project={focus.project}/>{item.primary_staff&&<span>{item.primary_staff}</span>}</div><span className="review-focus-kicker">{decision?'your decision is needed':'ready for your review'}</span><h2>{item.goal||item.assignment.replace(/[-_]+/g,' ')}</h2><p>{item.waiting_reason||item.next_action||'Open the reported work to inspect the requested decision.'}</p><div className="review-focus-actions"><Link className="operator-button" to={href}>{decision?'inspect this decision':'inspect this work'}</Link><a className="operator-button secondary" href={projectHref('/inspector#review'+(evidence?'?evidence='+encodeURIComponent(evidence.evidence_id):''),focus.project)}>{evidence?'review capture and reply':'open project evidence'}</a></div><details className="review-focus-provenance"><summary>preview details</summary><p className="review-focus-note">{evidence?'capture matches this assignment and source commit. review notes are saved in Inspector; worker receipt requires a confirmed Relay feedback binding.':'a matching preview is not available yet. open project evidence to see other captures.'}</p></details></div>{evidence&&<div className="review-focus-media" data-preview-device={evidence.viewport?.width<=600?'phone':evidence.viewport?.width<=1100?'tablet':'desktop'} data-preview-width={evidence.viewport?.width} data-preview-height={evidence.viewport?.height}><img src={evidence.screenshot_url} alt="preview of the work awaiting your review"/></div>}</section>;
}
