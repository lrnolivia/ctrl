export function statusLabel(value?: string | null): string;
export function phaseLabel(value?: string | null): string;
export function eventLabel(value?: string | null): string;
export function summaryText(value: string | null | undefined, fallback: string): string;
export function assignmentPresentation(item?: {attention_request?: {kind?: string; status?: string; title?: string; question?: string}; display_name?: string; title?: string; goal?: string | null; stage?: string; state?: string; waiting_reason?: string | null; recovery_action?: string | null; next_action?: string | null}): {title:string;detail:string;next:string;phase:string};
