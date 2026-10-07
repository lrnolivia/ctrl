import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../public/operator.css";
import "../../../packages/shared-ui/tokens.css";
import "../../../packages/shared-ui/components.css";
import "../public/operator-1.8.css";
import "./styles.css";
import "../../../packages/shared-ui/telemetry.css";
import "../../../packages/shared-ui/notifications.css";

if (/^\/inspector(?:\/|\.html)?$/.test(location.pathname)) {
 const query=location.hash.split('?')[1]||location.search.slice(1);
 history.replaceState(null,'','/#/inspector'+(query?'?'+query:''));
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

import "../../../packages/shared-ui/responsive-shell.css";

import "../../../packages/shared-ui/motion.css";

import '../../../packages/shared-ui/relay-utility.css';

import '../../../packages/shared-ui/momo.css';

import '../../../packages/shared-ui/polish.css';
import '../../../packages/shared-ui/control-center.css';

import '../../../packages/shared-ui/work-controls.css';

import '../public/qa.css';
