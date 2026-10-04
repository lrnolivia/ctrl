import {compactCharts} from '../../../../packages/shared-ui/compact-charts.js';
import {needsHumanReview} from '../../../../packages/shared-ui/attention.js';
import type {DashboardSnapshot} from '../types';
export function PageTelemetry({snapshot,kind}:{snapshot:DashboardSnapshot|null;kind:'runner'|'night-shift'}){
 const current=Object.values(snapshot?.progress||{}).flatMap(payload=>payload.progress||[]);
 const pending=!snapshot||Boolean(snapshot.loadingProgress?.length||snapshot.failedProgress?.length);
 if(!snapshot)return <div className="compact-telemetry-skeleton" role="status">loading work signals…</div>;
 const claims=Object.values(snapshot.coordination||{}).flatMap(record=>record.claims||[]).filter(claim=>['active','held','completed'].includes(claim.state));
 const workers=snapshot.workers||[],run=workers.filter(worker=>worker.runtime?.last_run_at);
 const model=kind==='runner'?{
  title:'current work',pending,progress:snapshot.progress,now:Date.parse(snapshot.fetchedAt),
  rows:[{label:'in progress',value:current.filter(item=>item.state==='working'&&!needsHumanReview(item)).length},{label:'needs your review',value:current.filter(needsHumanReview).length},{label:'needs help',value:current.filter(item=>['failed','blocked'].includes(item.state||'')&&!needsHumanReview(item)).length},{label:'waiting or ready',value:current.filter(item=>item.state!=='working'&&!needsHumanReview(item)&&!['failed','blocked'].includes(item.state||'')&&!needsHumanReview(item)).length}],
  completion:{done:claims.filter(item=>item.state==='completed').length,total:claims.length,label:'recorded assignments complete',note:'Completed assignments divided by active, held and completed assignments. This does not measure all planned features.'}
 }:{title:'automatic checks',pending:false,now:Date.parse(snapshot.fetchedAt),activityLabel:'reported check results',
  rows:[{label:'succeeded',value:run.filter(item=>['completed','succeeded','success'].includes(item.runtime?.status||'')).length},{label:'needs help',value:run.filter(item=>['failed','blocked','waiting_credentials'].includes(item.runtime?.status||'')).length},{label:'other reported results',value:run.filter(item=>!['completed','succeeded','success','failed','blocked','waiting_credentials'].includes(item.runtime?.status||'')).length}],
  progress:{checks:{progress:run.map(item=>({assignment:item.id,events:[{type:'check-result',at:item.runtime?.last_run_at}]}))}},note:'Latest reported result per automatic check; checks are distinct from away-work assignments.',
  completion:{done:workers.filter(item=>item.enabled).length,total:workers.length,label:'checks scheduled',note:'Enabled schedules divided by reported schedules. This is scheduling coverage, not project completion.'}
 };
 return <div dangerouslySetInnerHTML={{__html:compactCharts(model)}}/>;
}
