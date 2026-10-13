export function feedbackApi(url:string,options?:RequestInit): Promise<any>;
export function feedbackFailure(error:unknown): string;
export function feedbackLabel(receipt:any): string;
export function sendFeedback(options:any): Promise<any>;
export function refreshFeedback(options:any): Promise<any>;
export function deliverReview(options:any): Promise<any>;
export function reviewText(evidence:any,review:any): string;
