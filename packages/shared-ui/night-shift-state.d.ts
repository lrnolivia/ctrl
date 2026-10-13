import type {WorkState} from './work-state.js';
export function nightShiftState(item?:any,options?:{executions?:any[];executionAvailable?:boolean}):WorkState & {requestSaved:boolean;startReported:boolean;finishedReported:boolean;finishedChecked:boolean;needsAction:boolean;startedAt:string|null;finishedAt:string|null;recipientAcknowledged:boolean;sourceVerified:boolean;awayWindow:any;workDuration:null;source:any;job:any;next:string};
export function nightShiftSummary(pages?:any[],options?:{loading?:boolean;scopeAvailable?:boolean}):{records:any[];incomplete:boolean;requests:any[];starts:any[];finished:any[];needsAction:any[]};
export function observerDiagnostic(worker?:any):{state:WorkState;error:string;label:string;hasError:boolean;projectStateAffected:false};
export function declaredAwayWindow(start:string,end:string,now?:number):{start:string;end:string};
export function loadExecutionReceipts(project:string,api:(url:string)=>Promise<any>):Promise<any[]>;
