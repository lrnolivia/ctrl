import {openWorkDetails} from '../../../../packages/shared-ui/work-details.js';
import {useEffect,useRef} from "react";
import {iconSlot,hydrateProjectIcons} from "../../public/project-icons.js";
import {projectLabel} from "../api";
export function ProjectBadge({project}:{project:string}){
 const root=useRef<HTMLSpanElement>(null);
 useEffect(()=>{if(root.current)void hydrateProjectIcons(root.current);},[project]);
 return <span className="project-id-badge" ref={root} role="button" tabIndex={0} aria-label={"open "+projectLabel(project)+" details"} onClick={event=>{if(!(event.target as HTMLElement).closest("a,button")){event.preventDefault();event.stopPropagation();openWorkDetails({project});}}} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openWorkDetails({project});}}}><span dangerouslySetInnerHTML={{__html:iconSlot(project)}}/><span>{projectLabel(project)}</span></span>;
}
