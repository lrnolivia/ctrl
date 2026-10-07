import {fileManagerChecks} from './file-manager-browser.mjs';
import {telemetryLayoutChecks} from './telemetry-layout-browser.mjs';
import {interactionChecks} from './telemetry-interactions-browser.mjs';
import {nightShiftChecks} from './night-shift-browser.mjs';
import {workDetailsChecks} from './work-details-browser.mjs';
import {followupChecks} from './followup-browser.mjs';
import {controlPreviewChecks} from './control-preview.mjs';
import {reviewLoadingChecks} from './review-browser.mjs';
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {fixture} from './fixture.mjs';
const app=await fixture(),browser=await chromium.launch({headless:true});const captures=[],errors=[];let activePage;await fs.mkdir('qa-evidence',{recursive:true});
try{for(const width of [1440,390,320]){const page=await browser.newPage({viewport:{width,height:900},colorScheme:'dark',reducedMotion:width===320?'reduce':'no-preference'});activePage=page;page.on('pageerror',e=>errors.push({width,message:e.message}));let sockets=[];await page.routeWebSocket('**/api/events*',ws=>{sockets.push(ws);ws.onClose(()=>{sockets=sockets.filter(s=>s!==ws);});ws.onMessage(data=>{if(data==='ping')ws.send('pong');});ws.send(JSON.stringify({type:'resync',cursor:'0'}));});
await page.goto(app.origin+'/#/today?project=field');await page.getByRole('heading',{name:'now',exact:true}).waitFor();await page.waitForURL('**/#/now?project=field');await page.locator('.work-viewer[data-summary-state=ready]').waitFor();assert.equal(await page.locator('.operator-nav [data-feature]').count(),4);const momo=await page.evaluate(async()=>{const faces=await document.fonts.load('24px "Momo Trust Display"');await document.fonts.ready;return {loaded:faces.filter(face=>face.status==='loaded').length,ready:document.fonts.check('24px "Momo Trust Display"')};});assert.ok(momo.loaded>0,'the actual embedded Momo face loaded');assert.equal(momo.ready,true);
await page.waitForFunction(()=>[...document.querySelectorAll('.operator-nav .tool-mark')].every(img=>img.complete&&img.naturalWidth>0));
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');if(width<=390){
 const nav=page.locator('.operator-nav');const first=nav.locator('[data-feature]').first();
 const size=await first.boundingBox();assert.ok(size.height>=44,'comfortable mobile target');
 assert.equal(await first.locator('.nav-copy').evaluate(el=>getComputedStyle(el).clipPath),'none','mobile destination labels remain visible');
 const dock=await nav.boundingBox(),gear=await page.locator('.operator-utility').boundingBox(),banner=await page.locator('.operator-topbar').boundingBox();assert.ok(Math.abs(dock.height-64)<1&&Math.abs(dock.width-(width-32))<1,'full-width mobile dock: '+JSON.stringify(dock));assert.ok(gear.width>=44&&gear.height>=44&&gear.y>=banner.y&&gear.y+gear.height<=banner.y+banner.height+1&&Math.abs(gear.x+gear.width-(width-16))<2,'Settings target in banner right: '+JSON.stringify({gear,banner}));
 assert.equal(await nav.evaluate(el=>getComputedStyle(el).backgroundColor),await page.locator('.operator-topbar').evaluate(el=>getComputedStyle(el).backgroundColor),'dock and banner share a surface');
 const night=nav.locator('[data-feature=night-shift] .nav-copy strong');assert.equal(await night.textContent(),'night shift');assert.ok(await night.evaluate(el=>el.scrollWidth<=el.closest('a,button').clientWidth),'full night shift label fits');
 await first.dispatchEvent('pointerdown',{pointerType:'touch',clientX:size.x+size.width/2,clientY:size.y+size.height/2});
 await page.locator('.mobile-nav-label[data-open=true]').waitFor();await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.mobile-nav-label')).opacity)>.99);
 await page.waitForFunction(()=>document.querySelector('.mobile-nav-label').getBoundingClientRect().bottom<document.querySelector('.operator-nav [data-feature]').getBoundingClientRect().top);
 const label=await page.locator('.mobile-nav-label').boundingBox();assert.ok(label.y+label.height<size.y,'label appears above finger');
 await page.screenshot({path:`qa-evidence/mobile-nav-label-${width}.png`});captures.push(`mobile-nav-label-${width}.png`);
 await first.dispatchEvent('pointercancel',{pointerType:'touch'});await page.locator('.mobile-nav-label').waitFor({state:'hidden'});
}
if(width>900){
 await page.mouse.move(width-8,100);
 await page.waitForFunction(()=>{const bar=document.querySelector('.operator-topbar').getBoundingClientRect(),gear=document.querySelector('.presentation-menu > summary').getBoundingClientRect();return Math.abs((gear.left+gear.width/2)-(bar.left+bar.width/2))<2;});
 const edges=await page.evaluate(()=>{const header=document.querySelector('.workspace-context').getBoundingClientRect(),content=document.querySelector('.feature-heading').getBoundingClientRect();return {left:Math.abs(header.left-content.left),right:Math.abs(header.right-content.right)};});
 assert.ok(edges.left<2&&edges.right<2,'header spans the same content edges');
 await page.locator('.operator-topbar').hover();
 await page.waitForFunction(()=>{const utility=document.querySelector('.operator-utility').getBoundingClientRect(),gear=document.querySelector('.presentation-menu > summary').getBoundingClientRect();return Math.abs(utility.right-gear.right-12)<2;});
 await page.screenshot({path:`qa-evidence/sidebar-expanded-${width}.png`});captures.push(`sidebar-expanded-${width}.png`);
 await page.mouse.move(width-8,100);
 await page.waitForFunction(()=>{const bar=document.querySelector('.operator-topbar').getBoundingClientRect(),gear=document.querySelector('.presentation-menu > summary').getBoundingClientRect();return Math.abs((gear.left+gear.width/2)-(bar.left+bar.width/2))<2;});
}
await page.screenshot({path:`qa-evidence/now-${width}.png`});captures.push(`now-${width}.png`);
await page.locator('.notification-bell').click();
await page.locator('.notification-menu:popover-open').waitFor();
assert.ok(await page.locator('.notification-menu').evaluate(menu=>{const r=menu.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&menu.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));}),'notification panel is visible in the top layer');
await page.screenshot({path:`qa-evidence/notification-layer-${width}.png`});
await page.keyboard.press('Escape');await page.locator('.notification-menu').waitFor({state:'hidden'});
assert.ok(await page.locator('.notification-bell').evaluate(el=>document.activeElement===el),'notification dismissal restores focus');

const trigger=page.locator('.workspace-context [data-relay-open]');await trigger.click();const dialog=page.getByRole('dialog',{name:'relay',exact:true});await dialog.waitFor();await dialog.locator('[data-relay-version]').filter({hasText:'2.0.fixture'}).waitFor();await page.waitForFunction(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;});
await page.locator('dialog[data-motion=settled]').waitFor();assert.ok(await dialog.evaluate(el=>{const h=el.querySelector('.relay-engine-heading'),actions=h.querySelector('.relay-engine-actions').getBoundingClientRect(),title=h.querySelector('h2').getBoundingClientRect(),close=h.querySelector('[data-relay-close]').getBoundingClientRect();return actions.top>=Math.max(title.bottom,close.bottom)-1&&title.right<=close.left+1&&el.scrollWidth<=el.clientWidth+1;}),'Relay heading, actions and close do not overlap');assert.ok(await dialog.locator('.relay-engine-actions').evaluate(el=>{const boxes=[...el.children].map(n=>n.getBoundingClientRect());return boxes.every(r=>Math.abs(r.top-boxes[0].top)<1)&&boxes.every(r=>r.right<=el.getBoundingClientRect().right+1);}), 'Relay actions stay together on one row');await page.screenshot({path:`qa-evidence/relay-panel-${width}.png`});captures.push(`relay-panel-${width}.png`);await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await trigger.evaluate(el=>{if(document.activeElement!==el)throw Error('focus did not return');});assert.ok(page.url().includes('/now?project=field'));
await trigger.click();await dialog.waitFor();await page.goBack();await dialog.waitFor({state:'hidden'});assert.ok(page.url().includes('/now?project=field'));
await trigger.click();await dialog.waitFor();await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('dialog[open]').contains(document.activeElement)));await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
// Event invalidation must refresh source immediately, well before the fallback minute.
await page.locator('.project-loading-indicator[data-loading=false]').waitFor();
const idsBefore=await page.locator('.project-context [data-project-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.projectId));
let releaseProgress;const progressGate=new Promise(resolve=>{releaseProgress=resolve;});
const progressRoute=/\/api\/progress\/field(?:\?|$)/;
await page.route(progressRoute,async route=>{await progressGate;await route.continue();});
app.progress.field[0].next_action='Instant update '+width;for(const socket of sockets)socket.send(JSON.stringify({type:'change',id:'1',topics:['project:field']}));await page.locator('.project-loading-indicator[data-loading=true]').waitFor();
assert.deepEqual(await page.locator('.project-context [data-project-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.projectId)),idsBefore,'strip remains settled during partial refresh');
assert.equal(await page.locator('[data-progress-notice]').count(),0,'no separate loading activity bar');
releaseProgress();
await page.getByText('Instant update '+width,{exact:true}).first().waitFor({timeout:10000});
await page.locator('.project-loading-indicator[data-loading=false]').waitFor();await page.unroute(progressRoute);
await page.locator('.operator-nav a[data-feature=inspector]').click();await page.getByRole('heading',{name:'inspector',exact:true}).waitFor();await page.locator('.work-viewer').waitFor();assert.ok(app.requests.includes('/api/visual?project=field'),'project filter must reach the evidence API before its60-item limit');await page.locator('.workspace-context [data-relay-open]').click();await page.getByRole('dialog',{name:'relay',exact:true}).waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'relay',exact:true}).waitFor({state:'hidden'});assert.ok(page.url().includes('/inspector#review'));
// Settings are a functional top-layer panel, not decorative controls.
await page.getByLabel('Settings',{exact:true}).click();
const settings=page.locator('.presentation-panel');await settings.waitFor({state:'visible'});

const settingsInside=async()=>{await page.waitForFunction(()=>{const p=document.querySelector('.presentation-panel'),r=p.getBoundingClientRect();return p.matches(':popover-open')&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;});};
await settingsInside();
for(const [name,values] of Object.entries({desktop:['bottom','rail'],nav:['sidebar','bottom'],motion:['calm','full']})){
 for(const value of values){await settings.locator(`[name=${name}][value=${value}]`).check();assert.equal(await page.locator('html').getAttribute('data-presentation-'+name),value);await settingsInside();}
}
await settings.locator('[name=motion][value=calm]').check();
await page.screenshot({path:`qa-evidence/settings-${width}.png`});captures.push(`settings-${width}.png`);
await page.keyboard.press('Escape');await settings.waitFor({state:'hidden'});
await page.reload();await page.getByRole('heading',{name:'inspector',exact:true}).waitFor();
assert.equal(await page.locator('html').getAttribute('data-presentation-motion'),'calm','presentation persists after reload');
await page.getByLabel('Settings',{exact:true}).click();await settings.waitFor({state:'visible'});
await settings.locator('[data-presentation-reset]').click();assert.equal(await page.locator('html').getAttribute('data-presentation-motion'),'full');
await page.keyboard.press('Escape');await settings.waitFor({state:'hidden'});
const viewer=page.locator('#review-list');await viewer.locator('.work-item').first().waitFor();
assert.equal(await viewer.locator('.work-item').count(),4,'populated evidence fixture');
const filters=viewer.locator('[data-control-menu=filters]'),filterTrigger=filters.locator(':scope > summary');
for(let n=0;n<2;n++){await filterTrigger.click();assert.equal(await filters.getAttribute('open'),'');await filterTrigger.click();assert.equal(await filters.getAttribute('open'),null);}
await filterTrigger.focus();await page.keyboard.press('Enter');assert.equal(await filters.getAttribute('open'),'');await page.keyboard.press('Escape');assert.equal(await filters.getAttribute('open'),null);
await filterTrigger.click();await viewer.locator('[data-view=list]').click();const listKeys=await viewer.locator('[data-work-key]').evaluateAll(ns=>ns.map(n=>n.dataset.workKey));
await filters.locator('[data-close-menu]').click();assert.equal(await filters.getAttribute('open'),null);
await viewer.locator('.work-item').first().scrollIntoViewIfNeeded();await page.mouse.move(width-5,4);await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(350);if(width>900){const rail=await page.locator('.operator-topbar').boundingBox();assert.ok(rail.width<350,'Inspector rail bounded: '+JSON.stringify(rail));}await page.screenshot({path:`qa-evidence/inspector-list-${width}.png`});captures.push(`inspector-list-${width}.png`);
await filterTrigger.click();await viewer.locator('[data-view=visual]').click();assert.deepEqual(await viewer.locator('[data-work-key]').evaluateAll(ns=>ns.map(n=>n.dataset.workKey)),listKeys);
await filters.locator('[data-close-menu]').click();const imageBox=await viewer.locator('.work-item-visual').first().boundingBox(),cardBox=await viewer.locator('.work-item').first().boundingBox();assert.ok(Math.abs(imageBox.width-cardBox.width)<2,'visual image fills card width');
await page.mouse.move(width-5,4);await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(350);if(width>900){const rail=await page.locator('.operator-topbar').boundingBox();assert.ok(rail.width<350,'Inspector rail bounded: '+JSON.stringify(rail));}await page.screenshot({path:`qa-evidence/inspector-visual-${width}.png`});captures.push(`inspector-visual-${width}.png`);
const select=viewer.locator('[data-select]').first();await select.check();const organize=viewer.locator('[data-control-menu=organize]');await organize.locator(':scope > summary').click();await organize.locator(':scope > summary').click();assert.equal(await organize.getAttribute('open'),null,'selection does not force disclosure open');
await page.locator('.feature-heading:visible').scrollIntoViewIfNeeded();
await page.screenshot({path:`qa-evidence/inspector-${width}.png`});captures.push(`inspector-${width}.png`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
if(width===1440){await page.locator('.presentation-menu summary').first().click();await page.locator('[name=desktop][value=bottom]').check();await page.locator('.presentation-menu summary').first().click();await page.keyboard.press('Escape');await page.mouse.move(width-5,4);await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(350);await page.screenshot({path:'qa-evidence/desktop-bottom-dark.png'});captures.push('desktop-bottom-dark.png');await page.emulateMedia({colorScheme:'light'});await page.screenshot({path:'qa-evidence/desktop-bottom-light.png'});captures.push('desktop-bottom-light.png');await page.emulateMedia({colorScheme:'dark'});await page.locator('.workspace-context [data-relay-open]').click();await page.getByRole('dialog',{name:'relay',exact:true}).waitFor();await page.locator('dialog[data-motion=settled]').waitFor();await page.screenshot({path:'qa-evidence/relay-desktop-bottom.png'});captures.push('relay-desktop-bottom.png');await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'relay',exact:true}).waitFor({state:'hidden'});}
if(width===390){await page.emulateMedia({colorScheme:'light'});await page.locator('.workspace-context [data-relay-open]').click();await page.locator('dialog[data-motion=settled]').waitFor();await page.screenshot({path:'qa-evidence/relay-panel-light-390.png'});captures.push('relay-panel-light-390.png');await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'relay',exact:true}).waitFor({state:'hidden'});}
await page.close();}
await fileManagerChecks(browser,app.origin);await telemetryLayoutChecks(browser);await interactionChecks(browser);await workDetailsChecks(browser);await followupChecks(browser);await nightShiftChecks(browser);await reviewLoadingChecks(browser,app.origin);captures.push(...await controlPreviewChecks(browser));assert.deepEqual(errors,[]);await fs.writeFile('qa-evidence/result.json',JSON.stringify({ok:true,source_sha:process.env.CTRL_SOURCE_SHA||process.env.GITHUB_SHA,captures,checks:['Now alias and project context','four-item navigation plus separate Relay utility','dialog Escape/Back/focus','mobile bounds','stream invalidation','Inspector navigation','desktop bottom layout','Momo embedded font','no page errors']},null,2));console.log('CTRL_BROWSER_PASS',JSON.stringify(captures));}catch(error){if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:'qa-evidence/failure.png'}).catch(()=>{});await fs.writeFile('qa-evidence/failure.json',JSON.stringify({error:String(error),errors,body:await activePage.locator('body').innerText().catch(()=>''),url:activePage.url()},null,2));}throw error;}finally{await browser.close();await app.close();}

