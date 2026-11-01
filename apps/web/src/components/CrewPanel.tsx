import {useRef,useState} from 'react';
import {useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {useLiveRelay} from '../live';
import {directory,matchingStaff,teamLabels,teamEmblems,type Staff} from './crew-model';
import {CrewGlyph,CrewEmblem,CrewPortrait,StaffDetailDrawer} from './StaffDetailDrawer';
import './crew.css';

export function CrewPanel(){
  const {allSnapshot,state,refreshing,refresh}=useLiveRelay();
  const [team,setTeam]=useState('all'),[query,setQuery]=useState('');
  const [params,setParams]=useSearchParams();const navigate=useNavigate(),location=useLocation();
  const opener=useRef<HTMLElement|null>(null);
  const selected=directory.staff.find(s=>s.id===params.get('staff'));
  const visible=matchingStaff(team,query),ids=new Set(visible.map(s=>s.id));
  const leaders=directory.management_order.map(id=>directory.staff.find(s=>s.id===id)!).filter(s=>ids.has(s.id));
  function open(staff:Staff,element:HTMLElement){opener.current=element;const next=new URLSearchParams(params);next.set('staff',staff.id);setParams(next,{state:{crewDrawer:true}});}
  function close(){if(location.state?.crewDrawer){void navigate(-1);return;}const next=new URLSearchParams(params);next.delete('staff');setParams(next,{replace:true});}
  const person=(s:Staff)=><button key={s.id} type="button" className="crew-person" data-crew-person={s.id} data-crew-team={s.team} aria-haspopup="dialog" aria-label={s.display_name+', '+s.role} onClick={e=>open(s,e.currentTarget)}><CrewPortrait staff={s}/><span className="crew-person-copy"><span className="crew-person-name">{s.display_name}</span><span className="crew-person-role">{s.role}</span></span></button>;
  return <>
    <section className="crew-surface crew-panel" aria-labelledby="crew-title">
      <header className="crew-intro"><div><h1 id="crew-title">the whole crew<span className="crew-period">.</span></h1><p>Find your people. See where they fit.</p></div><div className="crew-ceo"><img src="/crew/ceo-original.jpeg" alt="Lauren Olivia" width="56" height="56"/><div><strong>Lauren Olivia</strong><span>CEO</span></div></div></header>
      <div className="crew-directory-bar"><p>21 fictional staff <span aria-hidden="true">·</span> 6 teams</p><label className="crew-search"><span>Find</span><input type="search" aria-label="Find a person or role" placeholder="Name, role or team" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
      <div className="crew-filters" role="group" aria-label="Filter crew by team">{[['all','Everyone'],...Object.entries(teamLabels)].map(([id,label])=><button key={id} className="crew-filter" type="button" aria-pressed={team===id} onClick={()=>setTeam(id)}>{label}</button>)}</div>
      <p className="crew-sr-only" role="status">{visible.length} of 21 people shown</p>
      {!!leaders.length&&<section aria-labelledby="crew-leadership"><div className="crew-section-title"><h2 id="crew-leadership">Leadership</h2><span>Direction, planning &amp; craft</span></div><div className="crew-leaders">{leaders.map(person)}</div></section>}
      <div className={'crew-teams'+(team!=='all'||query.trim()?' crew-filtered':'')}>{['design','engineering','quality','platform-delivery','knowledge'].map(id=>{
        const members=directory.teams[id as keyof typeof directory.teams].map(key=>directory.staff.find(s=>s.id===key)!).filter(s=>!s.management&&ids.has(s.id));
        if(!members.length)return null;const lead=id==='design'?'valentina':id==='engineering'?'dominique':null;
        return <section key={id} className="crew-team" data-crew-team={id} aria-labelledby={'crew-team-'+id}><div className="crew-team-title"><CrewEmblem name={teamEmblems[id]}/><h2 id={'crew-team-'+id}>{teamLabels[id]}</h2><span>{members.length}</span></div>{lead&&<p className="crew-team-note">Direction from <button type="button" aria-haspopup="dialog" onClick={e=>open(directory.staff.find(s=>s.id===lead)!,e.currentTarget)}>{lead==='valentina'?'Valentina':'Dominique'}</button></p>}{members.map(person)}</section>;
      })}</div>
      {!visible.length&&<div className="crew-empty"><h2>No one matches yet</h2><p>Try another name, role or team.</p><button type="button" onClick={()=>{setTeam('all');setQuery('');}}>Reset filters</button></div>}
      <footer className="crew-footer"><div><p>Display roles describe the organization. Assignment records show routing, not verified contribution.</p><button type="button" onClick={()=>void refresh()} disabled={refreshing}>{refreshing?'Refreshing records…':'Refresh assignments'}</button><span className="crew-read-status" role="status">{allSnapshot?.failedProgress?.length?'Some records unavailable':state==='live'?'Records connected':state==='connecting'?'Connecting records':state==='reconnecting'?'Reconnecting records':state==='stale'?'Records may be out of date':'Records unavailable'}</span></div><details><summary className="crew-disclosure"><CrewGlyph name="info"/><span>About this directory</span><span className="crew-disclosure-state" aria-hidden="true"/></summary><p>The approved 21-person display organization uses stable identities. Runtime roles, permissions and activation are separate. Staff portraits are fictional; Lauren’s portrait is her original photo.</p></details></footer>
    </section>
    {selected&&<StaffDetailDrawer staff={selected} snapshot={allSnapshot} state={state} onClose={close} opener={opener}/>}
  </>;
}
