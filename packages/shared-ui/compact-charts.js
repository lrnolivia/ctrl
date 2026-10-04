import {activitySeries} from './control-telemetry.js';
import {glyph} from './glyphs.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function compactCharts({title='work signals',rows=[],progress={},now=Date.now(),pending=false,completion,activityLabel='meaningful work updates',note='Counts describe the loaded records.'}={}){
 const total=rows.reduce((sum,row)=>sum+row.value,0),max=Math.max(1,...rows.map(row=>row.value));
 const activity=activitySeries(progress,now),peak=Math.max(1,...activity.bins.map(bin=>bin.count));
 const percent=completion?.total>0&&!pending?Math.round(completion.done/completion.total*100):null;
 const ring=percent==null?'':`<circle class="ring-value" cx="50" cy="50" r="42" strokeDasharray="${2*Math.PI*42*percent/100} ${2*Math.PI*42}"/>`;
 return `<section class="compact-telemetry" aria-label="${esc(title)}" data-pending="${pending}" aria-busy="${pending}">
 <article><header>${glyph('projects')}<h2>${esc(title)}</h2><strong>${total}${pending?' so far':''}</strong></header><dl class="compact-distribution">${rows.map(row=>`<div><dt>${esc(row.label)}</dt><dd><span>${row.value}</span><i aria-hidden="true" style="--bar-ratio:${row.value/max}"></i></dd></div>`).join('')}</dl><p>${esc(note)}${pending?' Some records are loading or unavailable.':''}</p></article>
 <article><header>${glyph('branch')}<h2>${esc(activityLabel)}</h2><strong>${activity.count}${pending?' so far':''}</strong></header><div class="compact-hourly" role="img" aria-label="${activity.bins.map((bin,i)=>`${6-i} hours ago: ${bin.count} updates`).join('; ')}">${activity.bins.map((bin,i)=>`<span><i style="--bar-ratio:${bin.count/peak}" aria-hidden="true"></i><small>${6-i}h</small></span>`).join('')}</div><p>past six hours · loaded history. Routine heartbeats are excluded.</p></article>
 ${completion?`<article class="compact-completion"><header>${glyph('check')}<h2>${esc(completion.label)}</h2></header><div class="progress-ring" aria-label="${percent==null?'completion unavailable':percent+'% · '+completion.done+' of '+completion.total+' '+esc(completion.label)}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="42"/>${ring}</svg><div class="ring-copy"><strong>${percent==null?'—':percent+'%'}</strong><span>${completion.done} of ${completion.total}</span></div></div><p>${esc(completion.note)}</p></article>`:''}
 </section>`;
}
