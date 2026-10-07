import {NightShiftLedger} from '../components/NightShiftLedger';
import {ReviewFocus} from '../components/ReviewFocus';
import {WorkViewer} from '../components/WorkViewer';
import {useWorkItems} from '../components/useWorkItems';
import {ProjectSwitcher} from '../components/ProjectSwitcher';
import {FeatureHeader} from '../components/FeatureHeader';
import {observerDiagnostic} from '../../../../packages/shared-ui/night-shift-state.js';
import {projectLabel} from '../api';
import {useLiveRelay} from '../live';

export function NightShiftPage() {
  const {snapshot,allSnapshot,project:contextProject}=useLiveRelay();
  const workItems=useWorkItems(allSnapshot,'check');
  const diagnostics=(snapshot?.workers||[]).map(worker=>({worker,diagnostic:observerDiagnostic(worker)})).filter(({diagnostic})=>diagnostic.hasError);
  return (
    <div className="page operator-page react-page">
      <FeatureHeader feature="night-shift" title="night shift" subtitle="away work" />
      <ProjectSwitcher />
      <NightShiftLedger snapshot={snapshot} afterTelemetry={<ReviewFocus snapshot={snapshot} project={contextProject} team="night-shift"/>}/>
      <details className="operator-section night-shift-observer-diagnostics">
        <summary>historical observer diagnostics</summary>
        <p>Optional model checks are separate from the saved work ledger. Their results do not establish project progress or current execution.</p>
        {snapshot?.observerState==='stale'&&<p role="status">Observer updates are unavailable. Previously loaded results are retained.</p>}
        {snapshot?.observerState==='unavailable'&&<p role="status">Observer results are unavailable. Canonical work records above remain independent.</p>}
        {diagnostics.map(({worker,diagnostic})=><p key={worker.id}>{projectLabel(worker.id)} · {diagnostic.error}</p>)}
        <WorkViewer id="night-shift" items={workItems} project={contextProject} incomplete={!allSnapshot||snapshot?.observerState==='unavailable'} />
      </details>
    </div>
  );
}
