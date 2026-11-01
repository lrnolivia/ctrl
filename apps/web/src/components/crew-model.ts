import config from '../../public/crew/staff-display-config.json';
import type {DashboardSnapshot, ObservedProgress, AssignmentRecord} from '../types';

// Display organization is intentionally independent of runtime staffing/permissions.
export const directory = config;
export type Staff = typeof config.staff[number];
export const teamLabels: Record<string,string> = {'management-planning':'Management & Planning',design:'Design',engineering:'Engineering',quality:'Quality','platform-delivery':'Platform & Delivery',knowledge:'Knowledge'};
export const teamEmblems: Record<string,string> = {'management-planning':'night-shift',design:'inspector',engineering:'runner',quality:'inspector','platform-delivery':'cloud',knowledge:'skills'};
export function matchingStaff(team:string, query:string): Staff[] {
  const text=query.trim().toLocaleLowerCase();
  return directory.staff.filter(s=>(team==='all'||s.team===team)&&`${s.display_name} ${s.role} ${teamLabels[s.team]}`.toLocaleLowerCase().includes(text));
}
export function formatCrewTime(value?:string|null):string {
  const time=value?Date.parse(value):NaN;
  return Number.isFinite(time)?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(time)+' UTC':'Unknown';
}
export type CrewAssignment = {
  key:string;project:string;assignment:string;goal:string;relation:'Recorded lead'|'Assigned support';
  state:string;updatedAt?:string;leaseUntil?:string;expired:boolean;nextAction?:string|null;
  progressState?:string;progressAt?:string|null;progressFreshness?:string|null;refresh:'loading'|'unavailable'|'available';
};
const terminal=new Set(['completed','cancelled','superseded']);
export function assignmentsForStaff(snapshot:DashboardSnapshot|null,staffId:string,now=Date.now()):CrewAssignment[] {
  if(!snapshot||!directory.staff.some(s=>s.id===staffId))return [];
  const result:CrewAssignment[]=[];
  for(const project of snapshot.projects){
    if(project.managed===false)continue;
    const claims=snapshot.coordination?.[project.id]?.claims||[];
    const payload=snapshot.progress[project.id];
    const observations=new Map((payload?.progress||[]).map(p=>[p.assignment,p]));
    const records=new Map<string,AssignmentRecord>(claims.map(c=>[c.id,c]));
    for(const q of payload?.queue||[]){const id=q.id||q.assignment;if(id&&!records.has(id))records.set(id,{...q,id,state:'queued'});}
    for(const p of observations.values())if(!records.has(p.assignment))records.set(p.assignment,{id:p.assignment,state:'unknown'});
    for(const record of records.values()){
      if(terminal.has(record.state))continue;
      const p:ObservedProgress|undefined=observations.get(record.id);
      // Explicit canonical null/empty staffing clears old progress attribution.
      const primary=Object.hasOwn(record,'primary_staff')?record.primary_staff:p?.primary_staff;
      const supporting=Object.hasOwn(record,'supporting_staff')?record.supporting_staff:p?.supporting_staff;
      const relation=primary===staffId?'Recorded lead':supporting?.includes(staffId)?'Assigned support':null;
      if(!relation)continue;
      const lease=Date.parse(record.lease_until||'');
      result.push({key:project.id+'/'+record.id,project:project.id,assignment:record.id,goal:record.goal||p?.goal||record.id,relation,
        state:record.state,updatedAt:record.updated_at,leaseUntil:record.lease_until,expired:Number.isFinite(lease)&&lease<=now,
        nextAction:record.next_action||p?.next_action,progressState:p?.state,progressAt:p?.last_meaningful_progress_at,progressFreshness:p?.progress_freshness,
        refresh:snapshot.failedProgress?.includes(project.id)?'unavailable':snapshot.loadingProgress?.includes(project.id)?'loading':'available'});
    }
  }
  return result.sort((a,b)=>a.project.localeCompare(b.project)||a.assignment.localeCompare(b.assignment));
}
