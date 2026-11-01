import {useEffect,useRef,type RefObject} from 'react';
import {Link} from 'react-router-dom';
import type {ConnectionState,DashboardSnapshot} from '../types';
import {assignmentsForStaff,formatCrewTime,teamLabels,type Staff} from './crew-model';

export function CrewGlyph({name}:{name:'info'|'clock'|'identification-card'}) {
  return <img className="crew-glyph" src={'/crew/icons/'+name+'.svg'} alt="" aria-hidden="true"/>;
}
export function CrewEmblem({name}:{name:string}) {
  return <span className="crew-emblem-images" aria-hidden="true"><img className="crew-dark" src={'/crew/emblems/'+name+'-dark.svg'} alt=""/><img className="crew-light" src={'/crew/emblems/'+name+'-light.svg'} alt=""/></span>;
}
export function CrewPortrait({staff}:{staff:Staff}) {
  return <span className="crew-avatar"><img className="crew-face" src={'/crew/'+staff.avatar} alt="" width="512" height="512"/><span className="crew-emblem"><CrewEmblem name={staff.emblem}/></span></span>;
}
export function StaffDetailDrawer({staff,snapshot,state,onClose,opener}:{staff:Staff;snapshot:DashboardSnapshot|null;state:ConnectionState;onClose:()=>void;opener:RefObject<HTMLElement|null>}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const records=assignmentsForStaff(snapshot,staff.id);
  useEffect(()=>{
    const node=dialog.current!;node.showModal();node.querySelector<HTMLButtonElement>('[data-crew-close]')?.focus();
    return ()=>{node.close();if(opener.current?.isConnected)opener.current.focus({preventScroll:true});};
  },[opener]);
  const incomplete=!snapshot||state==='offline'||state==='stale'||!!snapshot.failedProgress?.length||!!snapshot.loadingProgress?.length;
  return <dialog ref={dialog} className="crew-surface crew-drawer" aria-labelledby="crew-person-name" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}>
    <div className="crew-drawer-head"><span>the crew</span><button data-crew-close type="button" onClick={onClose}>Close</button></div>
    <div className="crew-person-content">
      <section className="crew-profile" data-crew-team={staff.team}><CrewPortrait staff={staff}/><h2 id="crew-person-name">{staff.display_name}</h2><p className="crew-role">{staff.role}</p><p><span className="crew-team-badge">{teamLabels[staff.team]}</span>{staff.management&&<span className="crew-lead-label">Leadership</span>}</p></section>
      <section className="crew-profile-section"><h3>Assignment records</h3>
        <p className="crew-source-note">{snapshot?'Checked '+formatCrewTime(snapshot.fetchedAt)+'.':'Assignment data has not loaded yet.'} {incomplete?'Some records may be unavailable or out of date.':'Recorded lead and support assignments; availability is not known.'}</p>
        {records.map(record=><article key={record.key} className="crew-assignment" data-crew-assignment={record.key}>
          <div className="crew-meta"><span>{snapshot?.projects.find(p=>p.id===record.project)?.name||record.project}</span><span>{record.relation}</span><span>{({active:'Active assignment',held:'On hold',queued:'Queued'} as Record<string,string>)[record.state]||'Assignment state unknown'}</span></div>
          <h4>{record.goal}</h4>
          {record.expired&&<p>Lease expired {formatCrewTime(record.leaseUntil)}. Current execution is unverified.</p>}
          {record.progressAt?<p>Last recorded progress: {formatCrewTime(record.progressAt)}{record.progressFreshness==='stale'?' · Out of date':''}.</p>:<p>No verified progress time is available.</p>}
          {record.refresh==='unavailable'&&<p>Could not refresh this project. Retained records are shown.</p>}
          <Link to={'/runner/'+encodeURIComponent(record.project)+'/'+encodeURIComponent(record.assignment)+'?project='+encodeURIComponent(record.project)}>Open assignment in CTRL</Link>
          <details><summary className="crew-disclosure"><CrewGlyph name="clock"/><span>Record &amp; freshness</span><span className="crew-disclosure-state" aria-hidden="true"/></summary>
            <p>Assignment updated: {formatCrewTime(record.updatedAt)}. Lease ends: {formatCrewTime(record.leaseUntil)}.</p>
            <p>Recorded progress state: {record.progressState||'Unknown'}. Progress freshness: {record.progressFreshness||'Unknown'}. Read status: {record.refresh}.</p>
            {record.nextAction&&<p>Next action: {record.nextAction}</p>}
            <p>Assignment routing does not verify contribution. A worker check-in does not verify completed work.</p>
          </details>
        </article>)}
        {!records.length&&<div className="crew-unavailable"><p>{incomplete?'Assignments cannot be confirmed from the available data.':'No assignments are listed in the available records.'} This does not establish availability or activity.</p></div>}
      </section>
      <section className="crew-profile-section"><button disabled aria-describedby="crew-message-note">Ask for an update</button><small id="crew-message-note">Available when a real delivery and acknowledgment path is connected.</small></section>
      <details className="crew-runtime-note"><summary className="crew-disclosure"><CrewGlyph name="identification-card"/><span>Directory &amp; runtime roles</span><span className="crew-disclosure-state" aria-hidden="true"/></summary><p>This is the approved display role. Runtime staffing and permissions are managed separately. A directory entry does not activate a worker or prove contribution. Stable identity: {staff.id}. Fictional staff avatar.</p></details>
    </div>
  </dialog>;
}
