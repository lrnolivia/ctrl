import {fixture} from './fixture.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
export async function controlPreviewChecks(browser){
 const app=await fixture({populated:true}),captures=[],errors=[];
 const label=page=>page.evaluate(()=>{const note=document.createElement('div');note.textContent='synthetic test data · ctrl draft';Object.assign(note.style,{position:'fixed',top:'5px',left:'50%',transform:'translateX(-50%)',zIndex:'2000',padding:'4px 8px',borderRadius:'8px',background:'#282522',color:'#eee8e2',font:'10px system-ui',pointerEvents:'none'});document.body.append(note);});
 try{
  const device=await browser.newPage({viewport:{width:390,height:780},colorScheme:'dark',reducedMotion:'reduce'});
  await device.goto(app.origin+'/#/runner?project=relay');await device.locator('.work-viewer[data-summary-state=ready]').waitFor();await device.evaluate(()=>document.fonts.ready);await label(device);app.setCaptureBuffer(await device.screenshot());await device.close();
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:width===1440?1100:850},colorScheme:'dark',reducedMotion:width===320?'reduce':'no-preference'});
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(app.origin+'/#/now');await page.locator('.work-viewer[data-summary-state=ready]').waitFor();await page.locator('.review-focus-media img').waitFor();await page.evaluate(()=>document.fonts.ready);await label(page);
   await page.waitForFunction(()=>[...document.querySelectorAll('.review-focus-media img')].every(i=>i.complete&&i.naturalWidth));
   await page.locator('.review-reply button[type=submit]:enabled').waitFor();
   assert.equal(await page.locator('.mosaic-progress .ring-copy strong').textContent(),'60%','completion ratio from synthetic coordination records');
   assert.equal(await page.locator('.mosaic-activity svg[role=img]').count(),1,'populated hourly activity graph');
   assert.equal(await page.locator('.mosaic-activity-line').count(),1,'one continuous observed activity curve');
   assert.equal(await page.locator('.control-mosaic .mosaic-heading .mosaic-glyph').count(),3,'shared telemetry heading glyphs');
   assert.equal(await page.locator('.review-focus-media[data-preview-device=phone]').count(),1,'preview frame matches evidence viewport');
   assert.equal(await page.locator('.work-viewer [data-work-key]').filter({hasText:'Review the mobile control center'}).count(),0,'featured review excluded from remaining list');
   assert.equal(await page.locator('.work-search-compact .sr-only').evaluate(el=>Math.round(el.getBoundingClientRect().width)),1,'search label stays accessible without taking layout space');
   if(width===1440){
    await page.mouse.move(width-5,5);await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(400);
    const rail=await page.locator('.operator-topbar').boundingBox();assert.ok(rail.width<110,'collapsed sidebar remains bounded');
    await page.screenshot({path:'qa-evidence/combined-sidebar-TEST-DATA-1440.png'});captures.push('combined-sidebar-TEST-DATA-1440.png');
    await page.locator('.operator-topbar').hover();await page.waitForTimeout(400);assert.ok((await page.locator('.operator-topbar').boundingBox()).width<=350,'expanded sidebar remains bounded');
    await page.screenshot({path:'qa-evidence/combined-sidebar-expanded-TEST-DATA-1440.png'});captures.push('combined-sidebar-expanded-TEST-DATA-1440.png');
    await page.getByLabel('Settings',{exact:true}).click();await page.locator('.presentation-customize summary').click();await page.selectOption('[name=desktop]','bottom');await page.keyboard.press('Escape');
   }
   await page.mouse.move(width-5,5);await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(500);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
   if(width===1440){const r=await page.locator('.operator-topbar').boundingBox();assert.ok(r.width<=760&&Math.abs(r.x+r.width/2-width/2)<2,'short desktop dock is centered');assert.ok((await page.locator('.operator-nav [data-feature]').first().boundingBox()).height>=64,'glyph selection has breathing room');const nav=await page.locator('.operator-nav').boundingBox();assert.ok(Math.abs(nav.x+nav.width/2-width/2)<1,'the main four links are independently centered in the desktop dock');const brand=await page.locator('.operator-topbar .operator-brand').boundingBox(),utility=await page.locator('.operator-topbar .operator-utility').boundingBox();assert.ok(brand.x+brand.width<nav.x&&utility.x>nav.x+nav.width,'endcaps do not overlap the centered navigation');}
   await page.screenshot({path:`qa-evidence/combined-TEST-DATA-${width}.png`});captures.push(`combined-TEST-DATA-${width}.png`);
   if(width===1440){await page.emulateMedia({colorScheme:'light'});await page.screenshot({path:'qa-evidence/combined-light-TEST-DATA-1440.png'});captures.push('combined-light-TEST-DATA-1440.png');await page.emulateMedia({colorScheme:'dark'});}
   if(width===390){
    let lost=true,writes=[],acknowledged=false;
    const report={report_id:'fbr_'+'b'.repeat(64),identity:{project:'ctrl',assignment:'ctrl-mobile-review'},status:{saved:{at:new Date().toISOString()},queued:true,delivered:null,seen:null}};
    await page.route('**/api/feedback/submit',async route=>{writes.push(route.request().postDataJSON());if(lost){lost=false;await route.abort('failed');}else await route.fulfill({json:{ok:true,feedback:report}});});
    await page.route('**/api/feedback/status?*',route=>route.fulfill({json:{ok:true,feedback:{...report,status:{...report.status,seen:acknowledged?{actor:'test-caller'}:null}}}}));
    const form=page.locator('.review-focus .review-reply');await form.locator('textarea').fill('Keep User Text · narrow preview needs more room');await form.locator('button[type=submit]').click();await form.getByRole('status').filter({hasText:'fetch'}).waitFor();
    await page.reload();await page.locator('.review-reply button[type=submit]:enabled').waitFor();await label(page);
    const recovered=page.locator('.review-focus .review-reply');assert.equal(await recovered.locator('textarea').inputValue(),'Keep User Text · narrow preview needs more room');await recovered.locator('button[type=submit]').click();await recovered.getByRole('status').filter({hasText:'acknowledgement pending'}).waitFor();assert.deepEqual(writes[0],writes[1],'interrupted browser reply retains operation and intent');
    acknowledged=true;await recovered.locator('button[type=submit]').click();await recovered.getByRole('status').filter({hasText:'native delivery unverified'}).waitFor();assert.equal(writes.length,2,'confirmed operation reads status instead of posting again');
    await page.screenshot({path:'qa-evidence/reply-recovery-TEST-DATA-390.png'});captures.push('reply-recovery-TEST-DATA-390.png');
   }
   await page.locator('.workspace-context [data-relay-open]').click();await page.locator('dialog[data-motion=settled]').waitFor();
   assert.equal(await page.locator('.relay-compact-ring strong').textContent(),'60%','compact panel consumes same snapshot');assert.equal(await page.locator('.relay-compact-chart').count(),1);
   await page.screenshot({path:`qa-evidence/combined-relay-TEST-DATA-${width}.png`});captures.push(`combined-relay-TEST-DATA-${width}.png`);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   await page.locator('.operator-nav [data-feature=inspector]').click();await page.locator('#inspector-review-focus .review-focus-media img').waitFor();await page.mouse.move(width-5,5);await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(400);
   await page.screenshot({path:`qa-evidence/combined-inspector-TEST-DATA-${width}.png`});captures.push(`combined-inspector-TEST-DATA-${width}.png`);
   await page.close();
  }
  assert.deepEqual(errors,[]);return captures;
 }finally{await app.close();}
}
