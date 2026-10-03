import {useEffect,useRef} from "react";
import {iconSlot,hydrateProjectIcons} from "../../public/project-icons.js";
import {projectLabel} from "../api";
export function ProjectBadge({project}:{project:string}){
 const root=useRef<HTMLSpanElement>(null);
 useEffect(()=>{if(root.current)void hydrateProjectIcons(root.current);},[project]);
 return <span className="project-id-badge" ref={root}><span dangerouslySetInnerHTML={{__html:iconSlot(project)}}/><span>{projectLabel(project)}</span></span>;
}
