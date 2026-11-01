import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {fixture} from './fixture.mjs';

export async function crewChecks(browser){
 const app=await fixture();const captures=[];const errors=[];
 try{
 for(const [width,theme] of [[1440,'dark'],[1440,'light'],[760,'dark'],[390,'dark'],[320,'light']]){
  const page=await browser.newPage({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));await page.routeWebSocket('**/api/events*',ws=>ws.onMessage(()=>{}));
  let stage=0,fail=false,hold=null;let claims=[{id:'design-task',state:'active',primary_staff:'valentina',supporting_staff:['nico'],goal:'Synthetic fixture: review the crew layout',updated_at:'2026-10-01T00:00:00Z',lease_until:'2026-10-02T00:00:00Z',next_action:'Synthetic next action; not live work.'},{id:'done-task',state:'completed',primary_staff:'valentina',goal:'Terminal fixture must not appear'}];
  await page.route('**/api/projects',r=>r.fulfill({json:{projects:[{id:'ctrl',name:'ctrl',managed:true}]}}));
  await page.route('**/api/workers',r=>r.fulfill({json:[]}));
  await page.route('**/api/projects/ctrl',async r=>{if(hold)await hold;if(fail)return r.fulfill({status:503,json:{error:'synthetic failure'}});return r.fulfill({json:{coordination:{claims,queue:[]}}});});
  await page.route('**/api/progress/ctrl?*',r=>r.fulfill({json:{project:'ctrl',progress:[{assignment:'design-task',primary_staff:'valentina',supporting_staff:['nico'],state:stage?'awaiting-verification':'failed',progress_freshness:'stale',last_meaningful_progress_at:'2026-10-01T00:00:00Z',next_action:stage?'Synthetic refresh reached drawer':'Synthetic initial next action'}]}}));
  await page.goto(app.origin+'/#/crew?project=ctrl');await page.locator('.crew-panel [data-crew-person]').last().waitFor();await page.getByRole('button',{name:'Refresh assignments',exact:true}).waitFor();
  await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('.operator-nav [data-feature]').count(),4,'Crew does not replace product destinations');
  assert.equal(await page.locator('[data-crew-person]').count(),21);assert.ok(await page.locator('.crew-panel img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');
  assert.ok(await page.evaluate(async()=>{const faces=await document.fonts.load('21px "Momo Trust Display"');return faces.some(f=>f.status==='loaded');}),'existing Momo bytes load');
  await page.screenshot({path:`qa-evidence/crew-${width}-${theme}.png`,fullPage:true});captures.push(`crew-${width}-${theme}.png`);
  await page.getByRole('button',{name:'Engineering',exact:true}).click();assert.equal(await page.locator('[data-crew-person]').count(),6);await page.getByRole('button',{name:'Everyone',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'Find a person or role'});await search.fill('nico');assert.equal(await page.locator('[data-crew-person]').count(),1);await search.fill('no such staff');await page.getByRole('heading',{name:'No one matches yet'}).waitFor();await page.getByRole('button',{name:'Reset filters'}).click();assert.equal(await page.locator('[data-crew-person]').count(),21);
  const valentina=page.locator('[data-crew-person=valentina]');await valentina.click();const dialog=page.getByRole('dialog',{name:'Valentina',exact:true});await dialog.waitFor();
  assert.equal(await dialog.locator('[data-crew-assignment]').count(),1);await dialog.getByText('Recorded lead',{exact:true}).waitFor();await dialog.getByText(/Lease expired/).waitFor();assert.equal(await dialog.getByRole('button',{name:'Ask for an update'}).isDisabled(),true);
  assert.equal(await dialog.evaluate(e=>getComputedStyle(e).animationName),'none');await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(e=>e.contains(document.activeElement)));
  await dialog.locator('summary').filter({hasText:'Record & freshness'}).focus();await page.keyboard.press('Enter');assert.equal(await dialog.locator('.crew-assignment details').getAttribute('open'),'');await page.keyboard.press('Space');assert.equal(await dialog.locator('.crew-assignment details').getAttribute('open'),null);
  await page.screenshot({path:`qa-evidence/crew-drawer-${width}-${theme}.png`});captures.push(`crew-drawer-${width}-${theme}.png`);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.ok(await valentina.evaluate(e=>document.activeElement===e),'Escape restores opener');
  await valentina.click();await dialog.waitFor();await page.goBack();await dialog.waitFor({state:'hidden'});await page.goForward();await dialog.waitFor();await dialog.getByRole('button',{name:'Close',exact:true}).click();await dialog.waitFor({state:'hidden'});
  if(width===1440&&theme==='dark'){
    await valentina.click();await dialog.waitFor();await dialog.locator('summary').filter({hasText:'Record & freshness'}).click();
    stage=1;claims[0].next_action='Synthetic refresh reached drawer';
    // Existing provider's visibility resume is the actual production refresh path.
    const focusBefore=await dialog.getByRole('button',{name:'Close',exact:true}).evaluate(e=>{e.focus();return document.activeElement===e;});assert.equal(focusBefore,true);
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await dialog.getByText('Next action: Synthetic refresh reached drawer',{exact:true}).waitFor();assert.ok(await dialog.getByRole('button',{name:'Close',exact:true}).evaluate(e=>document.activeElement===e));
    fail=true;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await dialog.getByText('Could not refresh this project. Retained records are shown.').waitFor();assert.equal(await dialog.locator('[data-crew-assignment]').count(),1);
    fail=false;claims[0].primary_staff='nico';claims[0].supporting_staff=[];await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await dialog.locator('[data-crew-assignment]').waitFor({state:'detached'});await dialog.getByRole('button',{name:'Close',exact:true}).click();
    await page.locator('[data-crew-person=nico]').click();const nico=page.getByRole('dialog',{name:'Nico',exact:true});await nico.getByText('Recorded lead',{exact:true}).waitFor();claims[0].state='completed';await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await nico.locator('[data-crew-assignment]').waitFor({state:'detached'});await page.keyboard.press('Escape');
    // Direct-link dismissal must not navigate away from Crew, including invalid staff IDs.
    await page.goto(app.origin+'/#/crew?staff=julian');await page.getByRole('dialog',{name:'Julian',exact:true}).waitFor();await page.keyboard.press('Escape');await page.waitForURL('**/#/crew');
    await page.goto(app.origin+'/#/crew?staff=not-a-person');assert.equal(await page.locator('.crew-drawer').count(),0);
    // Initial unavailable project data is not represented as no work or offline staff.
    fail=true;await page.reload();await page.getByRole('button',{name:'Refresh assignments',exact:true}).waitFor();await page.locator('[data-crew-person=theo]').click();await page.getByText(/Assignments cannot be confirmed/).waitFor();await page.screenshot({path:'qa-evidence/crew-unavailable.png'});captures.push('crew-unavailable.png');await page.keyboard.press('Escape');
  }
  await page.close();
 }
 const config=JSON.parse(await fs.readFile('apps/web/public/crew/staff-display-config.json','utf8'));
 for(const asset of config.assets)assert.equal(createHash('sha256').update(await fs.readFile('dist/crew/'+asset.path)).digest('hex'),asset.sha256,'built '+asset.path);
 const digest=createHash('sha256');for(const name of ['index.html','assets/ctrl.js','assets/ctrl.css'])digest.update(await fs.readFile('dist/'+name));for(const name of ['staff-display-config.json',...config.assets.map(a=>a.path)].sort())digest.update('crew/'+name+'\0').update(await fs.readFile('dist/crew/'+name));
 assert.equal(JSON.parse(await fs.readFile('dist/build.json','utf8')).build,digest.digest('hex'),'build identity binds every crew asset');
 assert.deepEqual(errors,[]);console.log('CREW_BROWSER_PASS',JSON.stringify({journeys:5,captures,errors}));return captures;
 }finally{await app.close();}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {chromium}=await import('playwright');await fs.mkdir('qa-evidence',{recursive:true});const browser=await chromium.launch({headless:true});try{await crewChecks(browser);}finally{await browser.close();}}
