import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pwaInstallGuidance,pwaHasUnsavedInput} from '../packages/shared-ui/pwa.js';
test('install guidance distinguishes installed, prompt, and iOS manual paths',()=>{assert.equal(pwaInstallGuidance({standalone:true}),'Installed app');assert.equal(pwaInstallGuidance({supported:true}),'Install ctrl');assert.match(pwaInstallGuidance({ios:true}),/Add to Home Screen/);});
test('an update preserves active written inputs',()=>{const root=values=>({querySelectorAll:()=>values});assert.equal(pwaHasUnsavedInput(root([{value:'Draft',disabled:false,readOnly:false}])),true);assert.equal(pwaHasUnsavedInput(root([{value:'  ',disabled:false}])),false);assert.equal(pwaHasUnsavedInput(root([{value:'Read only',readOnly:true}])),false);});
test('worker has no private data cache or fetch interception',()=>{const sw=fs.readFileSync(new URL('../apps/web/public/sw.js',import.meta.url),'utf8');assert.doesNotMatch(sw,/caches\.|addEventListener\(['"]fetch|respondWith/);assert.match(sw,/CTRL_ACTIVATE_UPDATE/);assert.doesNotMatch(sw,/addEventListener\('install',[^\n]*skipWaiting/);});
test('manifest uses existing canonical CTRL artwork and bounded same-origin scope',()=>{const manifest=JSON.parse(fs.readFileSync(new URL('../apps/web/public/manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/#/now');assert.equal(manifest.icons[0].src,'/brand/ctrl.png');assert.equal(manifest.display,'standalone');});
