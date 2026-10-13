import {useEffect,useRef} from 'react';
import {FeatureHeader} from '../components/FeatureHeader';
import {ProjectSwitcher} from '../components/ProjectSwitcher';
import {ProgressNotice} from '../components/ProgressNotice';
import {useLiveRelay} from '../live';
import {useLocation} from 'react-router-dom';
import {subscribeRelayStream} from '../../../../packages/shared-ui/relay-stream.js';
import {bindReviewFilters,loadReview,destroyReview,renderReviewTelemetry,openEvidenceReview} from '../components/evidence-controller.js';
import {publishNotification} from '../../../../packages/shared-ui/notifications.js';
const ui={setConnection:()=>{},notify:(message:string)=>publishNotification({id:'inspector-refresh',title:'Inspector',message,severity:'warning'})};
export function InspectorPage(){
 const {project}=useLiveRelay();
 const location=useLocation();
 const mounted=useRef(false);
 useEffect(()=>{bindReviewFilters();mounted.current=true;const root=document.getElementById('review-list');const observer=new MutationObserver(()=>renderReviewTelemetry());if(root)observer.observe(root,{attributes:true,attributeFilter:['data-summary-state','data-summary-needs','data-summary-total','data-summary-completed','data-summary-unknown','data-summary-stale']});return()=>{mounted.current=false;observer.disconnect();destroyReview();};},[]);
 useEffect(()=>{
  let active=true,pending=false;
  const refresh=()=>{if(!active)return;if(document.querySelector('.qa-stage')){pending=true;return;}pending=false;void loadReview(ui,project,{quiet:true});};
  if(mounted.current)void loadReview(ui,project);
  const unsubscribe=subscribeRelayStream(event=>{if(event.kind==='resync'||event.kind==='change'&&event.event?.topics.some(topic=>['evidence','reviews'].includes(topic)))refresh();});
  const observer=new MutationObserver(()=>{if(pending&&!document.querySelector('.qa-stage'))refresh();});
  observer.observe(document.body,{childList:true});
  const timer=setInterval(()=>{if(!document.hidden)refresh();},60000);
  return()=>{active=false;unsubscribe();observer.disconnect();clearInterval(timer);};
 },[project]);
 useEffect(()=>{const evidence=new URLSearchParams(location.search).get('evidence');if(evidence&&/^vis_[a-zA-Z0-9-]{8,128}$/.test(evidence))void openEvidenceReview(evidence);},[location.search]);
 return <><FeatureHeader feature="inspector" title="inspector" subtitle="review"/><ProjectSwitcher/><ProgressNotice/>
 <div id="inspector-telemetry" className="compact-telemetry-skeleton" role="status">loading capture signals…</div>
 <section id="inspector-review-focus" className="review-focus" aria-label="review focus"><h2>checking the latest capture</h2><p>evidence appears here when it is available.</p></section>
 <div className="inspector-status"><strong id="review-count"/></div>
 <section className="operator-section inspector-review-queue" aria-labelledby="review-queue-heading"><div className="section-heading"><div><h2 id="review-queue-heading">evidence review</h2><span>screens and captures waiting for your call</span></div></div><div id="review-list" className="review-list"/></section></>;
}
