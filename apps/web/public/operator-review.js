import {preparePreviewImage} from '../../../packages/shared-ui/preview-image.js';
import {glyph} from '../../../packages/shared-ui/glyphs.js';
import {compactCharts} from '../../../packages/shared-ui/compact-charts.js';
import {summaryText} from '../../../packages/shared-ui/presentation-copy.js';
import {mountFeedbackForm} from '../../../packages/shared-ui/feedback-form.js';
import {projectMembers} from '../../../packages/shared-ui/project-groups.js';
import {bindWorkViewer} from "../../../packages/shared-ui/work-viewer.js";
import {evidenceItem} from "../../../packages/shared-ui/work-view-model.js";
import { showLoading } from "./loading.js";
import { brand, featureAccent } from "./brand.js";
import { iconSlot, hydrateProjectIcons } from "./project-icons.js";

import { openQa } from "./qa.js";
import { esc, projectName } from "./operator-projects.js";

let reviewItems = [];
let reviewMode = "needs";
let reviewUi = null;
let cardPreviewMode = "relay";

const cardPreviews = Object.freeze({
  relay: {
    feature: "relay",
    kicker: "relay",
    title: "the release is moving",
    summary: "runner is shipping the last 1.9.9 pieces while inspector keeps the visual work honest.",
    label: "working",
    tone: "info",
    signal: "working",
    metric: "1.9.9",
    metricLabel: "current release",
    staff: "ellis",
    team: "runner",
    progress: null,
    rows: [["source", "v71"], ["checks", "green"]],
    next: "verify the card in a real ChatGPT consumer"
  },
  runner: {
    feature: "runner",
    kicker: "runner reporting",
    title: "runner is moving the release forward",
    summary: "the branch is admitted, checks are green, and the current deployment is being verified.",
    label: "working",
    tone: "good",
    signal: "working",
    metric: "82%",
    metricLabel: "declared milestone",
    staff: "ellis",
    team: "runner",
    progress: 82,
    rows: [["branch", "1.9.9"], ["handoff", "inspector next"]],
    next: "capture the final consumer proof"
  },
  inspector: {
    feature: "inspector",
    kicker: "inspector reporting",
    title: "three screens need your eye",
    summary: "fresh visual evidence is ready. the technical checks passed; these need a human call.",
    label: "needs you",
    tone: "act",
    signal: "attention",
    metric: "3",
    metricLabel: "screens waiting",
    staff: "valentina",
    team: "inspector",
    progress: null,
    rows: [["latest", "just now"], ["review", "visual QA"]],
    next: "open the newest capture"
  },
  "night-shift": {
    feature: "night-shift",
    kicker: "night shift reporting",
    title: "everything boring is still being watched",
    summary: "four automatic checks are running quietly. nothing needs you right now.",
    label: "watching",
    tone: "quiet",
    signal: "external",
    metric: "4",
    metricLabel: "checks watching",
    staff: "relay",
    team: "night shift",
    progress: null,
    rows: [["last pass", "8m ago"], ["next pass", "soon"]],
    next: "leave it alone unless something changes"
  }
});

function renderChatCardPreview() {
  const target = document.querySelector("#chat-card-preview");
  const tabs = document.querySelector("#chat-card-tabs");
  if (!target || !tabs) return;

  tabs.innerHTML = Object.entries(cardPreviews).map(([id, card]) => {
    const active = id === cardPreviewMode;
    return '<button type="button" role="tab" aria-selected="' + active + '" class="' + (active ? "active" : "") + '" data-card-preview="' + esc(id) + '">' + esc(card.feature.replace("-", " ")) + '</button>';
  }).join("");

  const card = cardPreviews[cardPreviewMode] || cardPreviews.relay;
  const accent = featureAccent[card.feature] || featureAccent.relay;
  const rows = card.rows.map(([label, value]) =>
    '<div class="chat-card-row"><strong>' + esc(label) + '</strong><span>' + esc(value) + '</span></div>'
  ).join("");

  target.innerHTML = `
    <article class="chat-card-preview" data-feature="${esc(card.feature)}" data-signal="${esc(card.signal)}" style="--card-accent:${esc(accent)}">
      <section class="chat-card-hero">
        <div class="chat-card-mark" aria-hidden="true"><img src="${esc(brand[card.feature] || brand.relay)}" alt=""></div>
        <div class="chat-card-copy">
          <h3>${esc(card.feature.replace("-", " "))}</h3>
          <strong>${esc(card.title)}</strong>
          <p>${esc(card.summary)}</p>
          <span class="chat-card-staff"><span class="chat-card-avatar" aria-hidden="true"></span><span>${esc(card.staff)}</span><small>${esc(card.team)}</small></span>
        </div>
      </section>
      <aside class="chat-card-insight">
        <span class="chat-card-state" data-tone="${esc(card.tone)}"><span class="status-light" aria-hidden="true"></span><span>${esc(card.label)}</span></span>
        <div class="chat-card-metric">${esc(card.metric)}</div>
        <div class="chat-card-metric-label">${esc(card.metricLabel)}</div>
        ${card.progress == null ? "" : '<div class="chat-card-meter" aria-label="' + esc(card.progress + "% complete") + '"><span style="width:' + card.progress + '%"></span></div>'}
        <div class="chat-card-rows">${rows}</div>
        <p class="chat-card-next">next: ${esc(card.next)}</p>
        <div class="chat-card-actions" aria-label="Preview actions"><button type="button" disabled>refresh</button><button type="button" class="primary" disabled>open relay</button></div>
      </aside>
    </article>
  `;

  tabs.querySelectorAll("[data-card-preview]").forEach(button => {
    button.addEventListener("click", () => {
      cardPreviewMode = button.dataset.cardPreview;
      renderChatCardPreview();
    });
  });
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options, signal: options.signal ? AbortSignal.any([options.signal,AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; }
  catch { body = { error: text || "Unexpected response." }; }
  if (!response.ok) throw Object.assign(new Error(body.error || "Request failed."), { status: response.status });
  return body;
}

function relative(value) {
  if (!value) return "recently";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "recently";
  const delta = parsed - Date.now();
  const abs = Math.abs(delta);
  const unit = abs < 3_600_000 ? "minute" : abs < 86_400_000 ? "hour" : "day";
  const divisor = unit === "minute" ? 60_000 : unit === "hour" ? 3_600_000 : 86_400_000;
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(delta / divisor), unit);
}

let clearFeaturedReply=null,featuredIdentity='';
function renderReviewFocus(items) {
 const root=document.querySelector('#inspector-review-focus');if(!root)return;
 const item=items[0];
 if(!item){clearFeaturedReply?.();clearFeaturedReply=null;featuredIdentity='';root.className='review-focus review-focus-clear';root.innerHTML='<h2>no capture available yet</h2><p>your full evidence list is below.</p>';return;}
 const nextIdentity=[item.evidence_id,item.reviewHydration,item.screenshot_url].join(':');if(nextIdentity===featuredIdentity)return;featuredIdentity=nextIdentity;clearFeaturedReply?.();clearFeaturedReply=null;
 const project=item.context?.project,ready=item.reviewHydration==='ready';
 const retained=root.querySelector('.review-focus-media'),retainedImage=retained?.querySelector('img');
 const template=document.createElement('template');
 root.className='review-focus'+(item.screenshot_url?' has-evidence':'');
 template.innerHTML='<div class="review-focus-copy"><div class="review-focus-meta">'+(project?'<button type="button" class="project-id-badge" data-work-project="'+esc(project)+'">'+iconSlot(project)+'<span>'+esc(projectName(project))+'</span></button>':'')+'</div><span class="review-focus-kicker">latest captured evidence</span><h2>'+esc(evidenceTitle(item))+'</h2><p>'+esc(item.context?.surface||'Inspect this captured screen and leave your review.')+'</p><div class="review-reply-host"></div><details class="review-focus-provenance"><summary>preview details</summary><p class="review-focus-note">'+(ready?'review notes can be saved in Inspector. worker receipt requires a confirmed Relay feedback binding.':item.reviewHydration==='failed'?'review status unavailable. the capture remains accessible.':'checking review status.')+'</p></details></div>'+(item.screenshot_url?'<button type="button" class="review-focus-media preview-surface" data-focus-review aria-label="View Fullscreen" title="View Fullscreen" data-preview-device="'+(item.viewport?.width<=600?'phone':item.viewport?.width<=1100?'tablet':'desktop')+'"><img src="'+esc(item.screenshot_url)+'" alt="Latest captured evidence" loading="eager"><span class="preview-expand" aria-hidden="true">'+glyph('expand')+'</span></button>':'');
 const media=template.content.querySelector('.review-focus-media'),image=media?.querySelector('img');
 if(image&&retainedImage?.getAttribute('src')===image.getAttribute('src'))media.replaceWith(retained);
 else if(image){media.dataset.imageState='loading';media.style.aspectRatio=String((item.viewport?.width||16)/(item.viewport?.height||9));const readyImage=()=>{if(image.naturalWidth)media.dataset.imageState='ready';};image.addEventListener('load',readyImage,{once:true});image.addEventListener('error',()=>{media.dataset.imageState='error';},{once:true});if(image.complete)readyImage();}
 root.replaceChildren(template.content);
 root.querySelector('[data-focus-review]')?.addEventListener('click',()=>openQa(item.evidence_id));
 preparePreviewImage(root.querySelector('.review-focus-media'),root.querySelector('.review-focus-media img'));
 if(item.qaMetadata)clearFeaturedReply=mountFeedbackForm(root.querySelector('.review-reply-host'),item,{metadata:item.qaMetadata});
 else root.querySelector('.review-reply-host').textContent=item.reviewHydration==='failed'?'reply routing unavailable':'checking reply routing';
 void hydrateProjectIcons(root);
}

function evidenceKey(item) {
  const context = item.context || {};
  return [
    context.project || item.target_url || "",
    item.step_label || item.step_id || context.surface || "",
    item.viewport?.width || "",
    item.viewport?.height || "",
    context.commit_sha || context.pr_number || item.run_id || ""
  ].join("|");
}

function evidenceTitle(item) {
  const context = item.context || {};
  return summaryText(item.step_label || context.surface,'screen review');
}


let viewer=null,loadGeneration=0,reviewController=null,reviewPass=null,reviewScope=null;
let telemetryPartial=true;
export function renderReviewTelemetry(partial=telemetryPartial){
 telemetryPartial=partial;
 const chart=document.querySelector('#inspector-telemetry'),root=document.querySelector('#review-list');if(!chart||!root)return;
 const done=Number(root.dataset.summaryCompleted||0),unknown=Number(root.dataset.summaryUnknown||0),needs=Number(root.dataset.summaryNeeds||0),other=Number(root.dataset.summaryOther||0),total=Number(root.dataset.summaryTotal||0);
 const pending=partial||unknown>0||root.dataset.summaryState!=='ready';
 chart.className='';chart.removeAttribute('role');
 chart.innerHTML=`<section class="inspector-mini-telemetry" aria-label="capture signals" data-pending="${pending}"><button type="button" data-capture-filter="pending"><span aria-hidden="true">${glyph('inspect')}</span><span><strong>${needs}</strong> need review${pending?' · checking':''}</span><span aria-hidden="true">›</span></button><button type="button" data-capture-filter="stale"><span aria-hidden="true">${glyph('branch')}</span><span><strong>${Number(root.dataset.summaryStale||0)}</strong> stale captures <span aria-hidden="true">›</span></span></button><p>${total} loaded captures · ${done} reviews complete · ${unknown} status unknown. Counts describe this page, not all project work.</p></section>`;
 for(const button of chart.querySelectorAll('[data-capture-filter]'))button.addEventListener('click',()=>{viewer?.inspect(button.dataset.captureFilter,button);});
}
export function cancelReviewLoad(){loadGeneration++;reviewController?.abort();reviewController=null;reviewPass=null;reviewScope=null;}
export function bindReviewFilters() {
 renderChatCardPreview();
 const root=document.querySelector('#review-list');
 if(root)viewer=bindWorkViewer(root,{id:'inspector',defaultView:'visual',onOpen:item=>item&&openQa(item.id)});
}
export async function loadReview(ui,projectId='',options={}) {
 if(reviewPass&&reviewScope===projectId)return reviewPass;
 if(reviewScope!==null&&reviewScope!==projectId)cancelReviewLoad();
 reviewScope=projectId;const pass=performReviewLoad(ui,projectId,options);reviewPass=pass;
 try{return await pass;}finally{if(reviewPass===pass)reviewPass=null;}
}
async function performReviewLoad(ui,projectId='',{quiet=false}={}) {
 reviewController?.abort();reviewController=new AbortController();const signal=reviewController.signal;
 reviewUi=ui;const gen=++loadGeneration;
 const root=document.querySelector('#review-list'),count=document.querySelector('#review-count');
 if(!quiet&&root.dataset.reviewProject!==projectId){root.dataset.summaryState='loading';showLoading(root,'review','Loading captures');}root.dataset.reviewProject=projectId;
 try {
  const scope=projectMembers(projectId);
  const results=await Promise.all((scope.length?scope:['']).map(id=>api('/api/visual'+(id?'?project='+encodeURIComponent(id):''),{signal})));
  const payload={evidence:results.flatMap(result=>result.evidence||[]),partial:results.some(result=>result.partial||result.truncated||result.cursor)};
  const raw=Array.isArray(payload.evidence)?payload.evidence:[],seen=new Set(),sources=[];
  raw.sort((a,b)=>(Date.parse(b.captured_at||b.created_at)||0)-(Date.parse(a.captured_at||a.created_at)||0));
  for(const item of raw){const key=evidenceKey(item);if(seen.has(key))continue;seen.add(key);sources.push(item);}
  const prepared=sources.map(item=>({...item,reviewHydration:'pending'}));
  const partial=raw.length>=60||Boolean(payload.partial||payload.truncated||payload.cursor);
  const publish=async()=>{const models=await Promise.all(prepared.map(evidenceItem));if(gen!==loadGeneration||signal.aborted)return false;reviewItems=prepared;renderReviewFocus(prepared);viewer?.update(models,{project:projectId,incomplete:partial});count.textContent=String(models.length)+' loaded captures';renderReviewTelemetry(partial);return true;};
  if(!await publish())return;
  // Evidence is usable immediately. Review organization waits for confirmed state.
  await (async()=>{
   for(let index=0;index<prepared.length;index+=4){
    if(gen!==loadGeneration||signal.aborted)return;
    await Promise.all(prepared.slice(index,index+4).map(async item=>{
     try{const qa=await api('/api/visual/'+encodeURIComponent(item.evidence_id)+'/qa',{signal});item.qaMetadata=qa;item.qaReview=qa.review||null;item.reviewHydration='ready';}
     catch{item.reviewHydration='failed';}
    }));
    if(!await publish())return;
    // Known modern records and confirmed absence remain stable; update derives legacy hydration.
   }
  })().catch(()=>{});
  ui.setConnection('connected','good');

 }catch(error){if(gen!==loadGeneration)return;if(!quiet){root.dataset.summaryState='error';root.innerHTML='<div class="operator-empty">Review items could not load. Refresh to try again.</div>';}else ui.notify('Review updates could not refresh. Your current view stays available.','warn');ui.setConnection(error.status===403?'access needed':'couldn’t connect','bad');}
}
