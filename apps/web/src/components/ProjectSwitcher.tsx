import {captureMotionLayout,settleMotionLayout} from '../../../../packages/shared-ui/field-springs.js';
import {groupedProjects,groupedActivity,projectGroup} from "../../../../packages/shared-ui/project-groups.js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { glyph } from "../../../../packages/shared-ui/glyphs.js";
import { projectActivity, partitionProjects } from "../../../../packages/shared-ui/work-activity.js";
import { iconSlot, hydrateProjectIcons } from "../../public/project-icons.js";
import { projectLabel } from "../api";
import { useLiveRelay } from "../live";

export function ProjectSwitcher() {
  const { allSnapshot, projectStrip, refreshing, project, selectProject } = useLiveRelay();
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState<Record<string,number>>(() => {
    try { const value=JSON.parse(localStorage.getItem('relay.project-seen.v1') || '{}'); return value && typeof value==='object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
  });
  const [displayed,setDisplayed]=useState(projectStrip);
  const before=useRef<Map<string,any>>(new Map());
  useLayoutEffect(()=>{if(projectStrip!==displayed){if(root.current)before.current=captureMotionLayout(root.current,'[data-project-id]');setDisplayed(projectStrip);}},[projectStrip,displayed]);
  useLayoutEffect(()=>{if(root.current){settleMotionLayout(root.current,before.current,'[data-project-id]');void hydrateProjectIcons(root.current);}before.current=new Map();},[displayed,seen]);
  const activity = groupedActivity(displayed?.activity || {});
  const groups=groupedProjects(displayed?.projects || []);
  const activeGroup=groups.find(group=>group.id===projectGroup(project));
  const {recent,rest} = partitionProjects(groups,activity,seen,Date.now(),projectLabel);

  const choose = (id:string) => {
    if(root.current)before.current=captureMotionLayout(root.current,'[data-project-id]');
    if (id && activity[id]) { const next={...seen,[id]:activity[id]}; setSeen(next); try {localStorage.setItem('relay.project-seen.v1',JSON.stringify(next));} catch {} }
    selectProject(id);
  };
  const button = (id:string, fresh=false) => <button className={`project-tab${projectGroup(project)===id?' active':''}${fresh?' project-tab-updated':''}`} type="button" data-project-id={id} aria-label={id?projectLabel(id):"all projects"} aria-pressed={projectGroup(project)===id} key={id} onClick={()=>choose(id)} title={fresh?'New activity within the last 24 hours':''}>
    <span className="project-tab-all" dangerouslySetInnerHTML={{__html:id?iconSlot(id):glyph('projects')}}/><span>{id?projectLabel(id):'all projects'}</span>{fresh&&<span className="project-update-label">updated</span>}
  </button>;
  return <div className="project-context" ref={root}>
    <span className="project-context-label">project <span className="project-loading-indicator" data-loading={refreshing} role="status" aria-label={refreshing?"Updating projects":"Projects up to date"}/></span>
    {!displayed ? <div className="project-strip-skeleton" aria-label="Loading projects" role="status">{Array.from({length:6},(_,i)=><span key={i} className="skeleton-tab"/>)}</div> : <>
    {recent.length>0&&<div className="project-updates-row" role="group" aria-label="Recently updated projects">{recent.map(item=>button(item.id,true))}</div>}
    <div className="project-tabs" role="group" aria-label="All projects in alphabetical order">{button('')}{rest.map(item=>button(item.id))}</div>
    {activeGroup && activeGroup.children.length>0 && <div className="project-child-tabs" role="group" aria-label={projectLabel(activeGroup.id)+' projects'}><button type="button" aria-pressed={project===activeGroup.id} onClick={()=>choose(activeGroup.id)}>All {projectLabel(activeGroup.id)} work</button>{activeGroup.children.map(child=><button type="button" key={child.id} aria-pressed={project===child.id} onClick={()=>selectProject(child.id)}>{projectLabel(child.id)}</button>)}</div>}
    </>}
  </div>;
}
