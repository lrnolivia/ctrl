export function bindWorkDetails():()=>void;
export function openWorkDetails(target:{project:string;assignment?:string|null;filter?:string|null}):(()=>void)|undefined;
export function detailTarget(href:string,origin?:string):{project:string;assignment:string}|null;
