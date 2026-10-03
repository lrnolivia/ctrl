import {activitySeries} from "../../../../packages/shared-ui/control-telemetry.js";
import type { ProgressEvent } from "../types";

export function StatusLight({ tone = "quiet", label }: { tone?: string; label: string }) {
  return <span className="status-badge status-chip" data-tone={tone}><span className="status-light" aria-hidden="true" />{label}</span>;
}

export function ProgressRing({ percent, label }: { percent?: number; label: string }) {
  const safe = percent == null ? null : Math.max(0, Math.min(100, percent));
  const circumference = 2 * Math.PI * 42;
  const dash = safe == null ? 0 : circumference * (safe / 100);
  return (
    <div className="progress-ring" aria-label={safe == null ? label : `${safe}% — ${label}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r="42" />
        {safe != null && safe > 0 && <circle className="ring-value" cx="50" cy="50" r="42" strokeDasharray={`${dash} ${circumference}`} />}
      </svg>
      <div className="ring-copy"><strong>{safe == null ? "—" : `${safe}%`}</strong><span>{label}</span></div>
    </div>
  );
}

export function ActivitySparkline({ events = [] }: { events?: ProgressEvent[] }) {
  const series=activitySeries({work:{progress:[{assignment:'work',events}]}});
  const max=Math.max(1,...series.bins.map((bin:any)=>bin.count));
  const points=series.bins.map((bin:any,index:number)=>`${index*20},${24-bin.count/max*20}`).join(' ');
  return (
    <div className="sparkline" aria-label={`${series.count} timestamped observed events in the past six hours`}>
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
        {series.count > 0 && <polyline points={points} />}
      </svg>
      <span>{series.count} events</span>
    </div>
  );
}
