import {useMemo,useEffect,useRef,useState} from 'react';
import {controlTelemetry} from '../../../../packages/shared-ui/control-telemetry.js';
import {ProgressRing} from './Telemetry';
import {ProjectBadge} from './ProjectBadge';
import type {DashboardSnapshot} from '../types';
function Count({value}:{value:number}){
 const previous=useRef(value),[shown,setShown]=useState(value);
 useEffect(()=>{const from=previous.current;previous.current=value;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.presentationMotion==='calm'){setShown(value);return;}
  let frame=0,start=0;const tick=(time:number)=>{if(!start)start=time;const t=Math.min(1,(time-start)/350);setShown(Math.round(from+(value-from)*(1-(1-t)**3)));if(t<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[value]);
 return <><span aria-hidden="true">{shown}</span><span className="sr-only">{value}</span></>;
}
export function TelemetryMosaic({snapshot}:{snapshot:DashboardSnapshot|null}){
 const model=useMemo(()=>controlTelemetry(snapshot,snapshot?Date.parse(snapshot.fetchedAt):Date.now()),[snapshot]);
 const max=Math.max(2,...model.activity.bins.map((b:any)=>b.count));
 const points=model.activity.bins.map((b:any,i:number)=>`${30+i*100},${150-b.count/max*110}`).join(' ');
 return <section className="control-mosaic" aria-label="work overview">
  <article className="mosaic-panel mosaic-progress"><h2>progress</h2><p>{model.pending?'checking your work':'work completed'}</p><div className="mosaic-progress-body"><ProgressRing percent={model.percent} label={model.pending?'checking':model.total?`${model.completed} of ${model.total} complete`:'no work yet'}/><dl><div><dt>working</dt><dd><Count value={model.moving}/>{model.pending?' so far':''}</dd></div><div><dt>waiting</dt><dd><Count value={model.waiting}/>{model.pending?' so far':''}</dd></div></dl></div><details className="telemetry-details"><summary>details</summary><p>completed assignments in Relay's current record; includes active and held work. {model.pending?'some projects are loading or unavailable.':''}</p></details></article>
  <article className="mosaic-panel mosaic-motion"><h2>in motion</h2><strong className="mosaic-count"><Count value={model.activeProjects.length}/>{model.pending?' so far':''}</strong><p>products with current work</p><div className="mosaic-projects">{model.activeProjects.map((id:string)=><ProjectBadge key={id} project={id}/>)}</div><dl className="mosaic-overview"><div><dt>newest product</dt><dd>{model.newest?<ProjectBadge project={model.newest}/>:model.pending?'checking':'not available yet'}</dd></div><div><dt>most active in this history</dt><dd>{model.mostUpdates?<ProjectBadge project={model.mostUpdates.project}/>:model.pending?'checking':'no updates yet'}</dd></div></dl><details className="telemetry-details"><summary>details</summary><p>newest uses reported registration dates; activity compares events in the loaded history.</p></details></article>
  <article className="mosaic-panel mosaic-activity"><div className="mosaic-heading"><div><h2>activity</h2><p>past six hours{model.pending?' · checking':''}</p></div><strong className="mosaic-count"><Count value={model.activity.count}/></strong></div>{model.activity.count?<svg viewBox="0 0 560 190" role="img" aria-label="events per hour over the past six hours">{[0,1,2].map(i=><g key={i}><line x1="30" x2="530" y1={150-i*55} y2={150-i*55}/><text x="4" y={154-i*55}>{Math.round(max*i/2)}</text></g>)}<polyline points={points}/>{model.activity.bins.map((bin:any,i:number)=><g key={bin.at}><circle cx={30+i*100} cy={150-bin.count/max*110} r="4"><title>{new Date(bin.at).toLocaleTimeString()}: {bin.count} events</title></circle><text x={30+i*100} y="180" textAnchor="middle">{6-i}h</text></g>)}</svg>:<div className="mosaic-no-history">no recent updates</div>}<details className="telemetry-details"><summary>details</summary><p>timestamped events observed in the loaded history; not a complete activity ledger.{model.pending?' some projects are loading or unavailable.':''}{model.activity.undated?` ${model.activity.undated} undated events excluded.`:''}</p></details></article>
 </section>;
}
