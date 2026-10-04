import {needsHumanReview} from './attention.js';
const terminal=new Set(['complete','completed','cancelled','superseded','archived']);
export const meaningfulEvents=(events=[])=>Array.isArray(events)?events.filter(event=>!['runner-heartbeat','worker-heartbeat','heartbeat'].includes(event.type)):[];
export function activitySeries(progress={},now=Date.now(),hours=6){
 const seen=new Set(),bins=Array.from({length:hours},(_,i)=>({at:now-(hours-i)*3600000,count:0}));let undated=0;
 for(const [project,payload] of Object.entries(progress))for(const item of payload.progress||[]){
  for(const event of meaningfulEvents([...(item.events||[]),...(item.latest_event?[item.latest_event]:[])])){
   const key=project+':'+item.assignment+':'+(event.id||[event.at,event.type].join(':'));
   if(seen.has(key))continue;seen.add(key);
   const at=Date.parse(event.at||'');
   if(!Number.isFinite(at)){undated++;continue;}
   const index=Math.floor((at-(now-hours*3600000))/3600000);
   if(index>=0&&index<hours)bins[index].count++;
  }
 }
 return {bins,count:bins.reduce((sum,b)=>sum+b.count,0),undated};
}
export function controlTelemetry(snapshot,now=Date.now()){
 const progress=snapshot?.progress||{},all=Object.entries(progress).flatMap(([project,payload])=>(payload.progress||[]).map(item=>({project,item})));
 const current=all.filter(({item})=>!terminal.has(item.state)),needs=all.filter(({item})=>needsHumanReview(item));
 const pending=!snapshot||!!(snapshot.loadingProgress?.length||snapshot.failedProgress?.length);
 const claims=Object.values(snapshot?.coordination||{}).flatMap(record=>record.claims||[]).filter(c=>['active','held','completed'].includes(c.state));
 const completed=claims.filter(c=>c.state==='completed').length,total=claims.length;
 const observed=Object.entries(progress).map(([project,payload])=>({project,count:(payload.progress||[]).reduce((n,item)=>n+meaningfulEvents(item.events).length,0)})).filter(row=>row.count>0).sort((a,b)=>b.count-a.count||a.project.localeCompare(b.project));
 const dated=(snapshot?.projects||[]).filter(p=>Number.isFinite(Date.parse(p.created_at||''))).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 return {pending,completed,total,percent:!pending&&total?Math.round(completed/total*100):undefined,
 activeProjects:[...new Set(current.map(row=>row.project))],current,needs,
 moving:current.filter(({item})=>item.state==='working').length,
 waiting:current.filter(({item})=>['waiting-for-human','waiting-on-external-system'].includes(item.state)).length,
 newest:dated[0]?.id||null,mostUpdates:observed[0]||null,
 activity:activitySeries(progress,now)};
}
export function reviewFocus(items=[]){
 const rank=value=>({critical:4,high:3,normal:2,low:1})[String(value||'').toLowerCase()]||0;
 return [...items].filter(({item})=>needsHumanReview(item)).sort((a,b)=>rank(b.item.priority)-rank(a.item.priority)||(Date.parse(b.item.last_meaningful_progress_at||'')||0)-(Date.parse(a.item.last_meaningful_progress_at||'')||0)||a.item.assignment.localeCompare(b.item.assignment))[0]||null;
}
