// Private WebKit-engine QA; this does not operate or claim real Safari.
import {webkit} from 'playwright';
import {telemetryLayoutChecks} from './telemetry-layout-browser.mjs';
import {interactionChecks} from './telemetry-interactions-browser.mjs';
const browser=await webkit.launch({headless:true});
try{await telemetryLayoutChecks(browser,'webkit');await interactionChecks(browser,'webkit');console.log('CTRL_WEBKIT_ENGINE_PASS portrait/landscape, resized visual viewport, rings, hierarchy, count/list, focus, header, drawer');}finally{await browser.close();}
