export function bindWorkDetails():()=>void;
export function openWorkDetails(target:{project:string;assignment?:string|null;filter?:string|null;back?:(()=>void)|null}):(()=>void)|undefined;
export function detailTarget(href:string,origin?:string):{project:string;assignment:string}|null;

export function openWorkCollection(target:{title:string;rows:any[]}):()=>void;
