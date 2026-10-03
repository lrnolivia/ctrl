import { relayTelemetry, bindRelayUtility } from '../../../packages/shared-ui/relay-utility.js';
import { bindMotion } from "../../../packages/shared-ui/motion.js";
import { useEffect } from "react";
import { presentationMenu, bindPresentation } from "../../../packages/shared-ui/presentation.js";
import { bindTheme } from "../public/theme.js";
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { projectHref } from "../../../packages/shared-ui/project-context.js";
import { LiveRelayProvider, useLiveRelay } from "./live";
import { TodayPage } from "./pages/TodayPage";
import { RunnerPage } from "./pages/RunnerPage";
import { RunnerWorkPage } from "./pages/RunnerWorkPage";
import { NightShiftPage } from "./pages/NightShiftPage";
import { NotificationCenter } from './components/NotificationCenter';

const navItems = [
  { to: "/now", label: "now", detail: "focus", feature: "today", icon: "/brand/today.png" },
  { to: "/runner", label: "runner", detail: "coordinate", feature: "runner", icon: "/brand/runner.png" },
  { to: "/night-shift", label: "night shift", detail: "monitor", feature: "night-shift", icon: "/brand/night-shift.png" }
];

function NavArtwork({feature,src}:{feature:string;src:string}){
 const name=feature==='today'?'now':feature;
 return <picture><source media="(max-width: 900px)" srcSet={'/brand-nav/'+name+'.svg'}/><img className="tool-mark" src={src} alt=""/></picture>;
}

function Shell() {
  useEffect(() => { const presentation = bindPresentation(); const theme = bindTheme(); const motion = bindMotion(); const relay = bindRelayUtility(); return () => { relay(); presentation(); theme?.(); motion(); }; }, []);
  const { state, project } = useLiveRelay();
  const location = useLocation();
  const pageLabel = location.pathname.startsWith("/runner") ? "runner" : location.pathname.startsWith("/night-shift") ? "night shift" : "now";
  const tone = state === "live" ? "good" : state === "offline" ? "bad" : "quiet";

  return (
    <>
      <div className="terra-accent" aria-hidden="true"><span/><span/><span/><span/><span/></div>
      <header className="operator-topbar react-operator-topbar">
        <a className="operator-brand react-brand" href={projectHref("#/now", project)}>
          <img src="/brand/ctrl.png" alt="" width="52" height="52" />
          <strong>ctrl</strong>
          <span>project control</span>
        </a>
        <div className="nav-label">work</div>
        <nav className="operator-nav react-operator-nav" aria-label="ctrl">
          {navItems.slice(0, 1).map(item => (
            <NavLink key={item.to} to={projectHref(item.to, project)} data-feature={item.feature} className={({ isActive }) => isActive ? "active" : ""}>
              <span className="glyph-chip"><NavArtwork feature={item.feature} src={item.icon}/></span>
              <span className="nav-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
              <span className="nav-chevron" aria-hidden="true">›</span>
            </NavLink>
          ))}
          <NavLink to={projectHref("/runner",project)} data-feature="runner" className={({isActive})=>isActive?"active":""}><span className="glyph-chip"><NavArtwork feature="runner" src="/brand/runner.png"/></span><span className="nav-copy"><strong>runner</strong><small>coordinate</small></span><span className="nav-chevron" aria-hidden="true">›</span></NavLink>
          <a href={projectHref("/inspector#review", project)} data-feature="inspector">
            <span className="glyph-chip"><NavArtwork feature="inspector" src="/brand/inspector.png"/></span>
            <span className="nav-copy"><strong>inspector</strong><small>review</small></span>
            <span className="nav-chevron" aria-hidden="true">›</span>
          </a>
          {navItems.slice(2).map(item => (
            <NavLink key={item.to} to={projectHref(item.to, project)} data-feature={item.feature} className={({ isActive }) => isActive ? "active" : ""}>
              <span className="glyph-chip"><NavArtwork feature={item.feature} src={item.icon}/></span>
              <span className="nav-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
              <span className="nav-chevron" aria-hidden="true">›</span>
            </NavLink>
          ))}
        </nav>
        <div className="operator-utility" dangerouslySetInnerHTML={{ __html: presentationMenu() }} />
      </header>

      <main className="operator-shell react-operator-shell">
        <div className="workspace-context">
          <div className="workspace-left"><span>your workspace <span aria-hidden="true">/</span> {pageLabel}</span></div>
          <div className="connection-tools"><NotificationCenter /><span dangerouslySetInnerHTML={{__html:relayTelemetry()}} /></div>
        </div>
        <Routes>
          <Route path="/now" element={<TodayPage />} />
          <Route path="/today" element={<Navigate to={projectHref("/now",project)} replace />} />
          <Route path="/runner" element={<RunnerPage />} />
          <Route path="/runner/:project/:assignment" element={<RunnerWorkPage />} />
          <Route path="/night-shift" element={<NightShiftPage />} />
          <Route path="*" element={<Navigate to="/now" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return <HashRouter><LiveRelayProvider><Shell /></LiveRelayProvider></HashRouter>;
}
