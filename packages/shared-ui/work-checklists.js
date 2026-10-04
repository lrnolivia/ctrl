import {summaryText} from './presentation-copy.js';

// A completed assignment never manufactures completion for its requirements.
export function recordedChecklist(record={}) {
 const structured=Array.isArray(record.checklist)?record.checklist:Array.isArray(record.deliverables)?record.deliverables:null;
 const source=structured || (typeof record.acceptance==='string'?record.acceptance.split(/(?:\r?\n|;|\.\s+(?=[A-Z]))+/).map(text=>text.trim()).filter(Boolean):[]);
 const items=source.map((value,index)=>{
  const item=typeof value==='string'?{title:value}:value||{};
  const original=item.title||item.label||item.description||'Recorded requirement';
  const verified=item.status==='verified'||item.verified===true;
  const completed=verified||item.status==='completed'||item.status==='complete';
  return {title:summaryText(original,'requirement '+(index+1)),description:summaryText(item.description,'Recorded for this assignment.'),original,
   completed,verified,status:verified?'verified':completed?'recorded complete · verification not reported':'completion not reported'};
 });
 const completed=items.filter(item=>item.completed).length;
 return {items,completed,total:items.length,structured:Boolean(structured),percent:structured&&items.length?Math.round(completed/items.length*100):undefined};
}

export function projectWork(record={}) {
 const claims=(record.claims||[]).filter(item=>!['cancelled','superseded','retired'].includes(item.state));
 const ids=new Set(claims.map(item=>item.id));
 const queued=(record.queue||[]).filter(item=>item.state==='queued'&&!ids.has(item.id));
 return {claims,queued};
}
