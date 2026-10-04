import {reviewFocus} from '../../../../packages/shared-ui/control-telemetry.js';
import {TelemetryMosaic} from "../components/TelemetryMosaic";
import {ReviewFocus} from "../components/ReviewFocus";
import {ProjectBadge} from "../components/ProjectBadge";
import { needsHumanReview } from "../../../../packages/shared-ui/attention.js";
import { WorkViewer } from "../components/WorkViewer";
import { useWorkItems } from "../components/useWorkItems";
import { statusLabel, summaryText, assignmentPresentation } from "../../../../packages/shared-ui/presentation-copy.js";
import { projectHref } from "../../../../packages/shared-ui/project-context.js";
import { Link } from "react-router-dom";
import { ProjectSwitcher } from "../components/ProjectSwitcher";
import { FeatureHeader } from "../components/FeatureHeader";
import { SignalDeck } from "../components/SignalDeck";
import { ProgressNotice } from "../components/ProgressNotice";
import { StatusLight } from "../components/Telemetry";
import { projectLabel } from "../api";
import { useLiveRelay } from "../live";
import type { ObservedProgress } from "../types";

function tone(state?: string) {
  if (["blocked", "failed"].includes(state || "")) return "bad";
  if (state === "waiting-for-human") return "act";
  if (state?.includes("stale")) return "warn";
  if (state === "waiting-on-external-system") return "wait";
  if (state === "working") return "good";
  return "quiet";
}

export function TodayPage() {
  const { snapshot, allSnapshot, state, project: contextProject } = useLiveRelay();
  const workItems = useWorkItems(allSnapshot);
  const all: Array<{ project: string; item: ObservedProgress }> = [];
  for (const [project, payload] of Object.entries(snapshot?.progress || {})) {
    for (const item of payload.progress || []) all.push({ project, item });
  }
  const featured=reviewFocus(all);
  const needs=all.filter(({project,item})=>needsHumanReview(item)&&!(project===featured?.project&&item.assignment===featured.item.assignment));
  const remaining=workItems.filter(item=>!(item.project===featured?.project&&item.id===featured.item.assignment));
  const workers=snapshot?.workers||[];
  const attentionChecks=workers.filter(worker=>worker.runtime?.last_error||["blocked","failed","waiting_credentials"].includes(worker.runtime?.status||""));
  const incomplete=!snapshot||Boolean(snapshot.loadingProgress?.length||snapshot.failedProgress?.length);

  return (
    <div className="page operator-page react-page">
      <FeatureHeader feature="today" title="now" subtitle="focus" />
      <ProjectSwitcher />
      <ProgressNotice />
      <TelemetryMosaic snapshot={snapshot}/>
      <ReviewFocus snapshot={snapshot} project={contextProject}/>
      {attentionChecks.length>0&&<section className="operator-section automatic-attention" aria-label="checks needing attention"><div className="section-heading"><h2>checks needing attention</h2><span>{attentionChecks.length} reported problems</span></div>{attentionChecks.map(worker=><article className="automation-row" data-tone="bad" key={worker.id}><div><ProjectBadge project={worker.id} size="small"/><p>{summaryText(worker.runtime?.last_error,'An automatic check needs help.')}</p><details><summary>reported problem</summary><p>{worker.runtime?.last_error}</p><p>{worker.runtime?.last_summary}</p></details></div><button type="button" className="operator-button secondary" data-work-project={worker.id}>inspect check</button></article>)}</section>}

      {needs.length>0&&<section className="operator-section">
        <h2>also needs you</h2>
        <div className="react-stack">
          {needs.length ? needs.map(({ project, item }) => (
            <article className="attention-card" data-tone={tone(item.state)} key={`${project}:${item.assignment}`}>
              <div className="attention-copy">
                <ProjectBadge project={project}/>
                <strong>{assignmentPresentation(item).title}</strong>
                <p>{assignmentPresentation(item).detail}</p>
              </div>
              <Link className="operator-button secondary" to={projectHref(`/runner/${encodeURIComponent(project)}/${encodeURIComponent(item.assignment)}`, contextProject)}>review</Link>
            </article>
          )) : incomplete ? null : <div className="clear-card"><strong>You’re clear.</strong><span>Nothing needs your attention right now.</span></div>}
        </div>
      </section>}

      <section className="operator-section">
        <div className="section-heading"><h2>current work</h2><span>across your projects</span></div>
        <WorkViewer id="today" items={remaining} project={contextProject} incomplete={!allSnapshot || Boolean(allSnapshot.loadingProgress?.length || allSnapshot.failedProgress?.length)} />
      </section>

      <section className="operator-section">
        <div className="section-heading"><h2>automatic checks</h2><span>relay watches these for you</span></div>
        <div className="react-stack">
          {workers.filter(worker=>!attentionChecks.includes(worker)).length ? workers.filter(worker=>!attentionChecks.includes(worker)).map(worker => {
            const workerTone = worker.runtime?.last_error ? "bad" : worker.runtime?.status === "running" ? "good" : worker.enabled ? "wait" : "quiet";
            return <article className="automation-row" data-tone={workerTone} key={worker.id}>
              <div className="automation-main">
                <div className="automation-title"><strong>{worker.name || projectLabel(worker.id)}</strong><StatusLight tone={workerTone} label={worker.runtime?.last_error ? "needs attention" : statusLabel(worker.runtime?.status || (worker.enabled ? "enabled" : "paused"))} /></div>
                <p>{summaryText(worker.runtime?.last_summary || worker.runtime?.last_error, worker.runtime?.last_error ? "A check needs attention. Open Details for the reported problem." : worker.enabled ? "Relay will check this project automatically." : "Automatic checks are paused.")}</p>
                {(worker.runtime?.last_summary || worker.runtime?.last_error) && <details><summary>details</summary><p>{worker.runtime?.last_summary}</p><p>{worker.runtime?.last_error}</p></details>}
              </div>
              <span className="operator-state">{worker.runtime?.next_run_at ? `next ${new Date(worker.runtime.next_run_at).toLocaleString()}` : worker.enabled ? "schedule enabled" : "paused"}</span>
            </article>;
          }) : <div className="clear-card"><strong>{snapshot ? "No automatic checks." : "Checking automatic schedules."}</strong><span>{snapshot ? "No automatic schedule is available." : "Checking your automatic schedules."}</span></div>}
        </div>
      </section>
    </div>
  );
}
