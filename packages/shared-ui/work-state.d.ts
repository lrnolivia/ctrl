export type WorkState={kind:string;label:string;tone:string;raw:string;executing:boolean;progress:null};
export function workState(item?:any,options?:{available?:boolean}):WorkState;
export function evidenceNextAction(item?:any):{label:string;basis:string};
export function projectWorkState(snapshot:any):{rows:Array<{project:string;item:any;origin:string;semantics:WorkState;next:{label:string;basis:string}}> ;counts:Record<string,number>;incomplete:boolean;progress:null};
