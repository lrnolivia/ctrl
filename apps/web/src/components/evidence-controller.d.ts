export function bindReviewFilters(): void;
export function renderReviewTelemetry(): void;
export function destroyReview(): void;
export function openEvidenceReview(evidence:string):Promise<void>;
export function loadReview(ui:{setConnection:(...args:any[])=>void;notify:(message:string,...args:any[])=>void},project?:string,options?:{quiet?:boolean}):Promise<void>;
