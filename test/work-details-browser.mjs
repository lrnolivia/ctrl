import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
export async function workDetailsChecks(browser){
 const app=await fixture({populated:true});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});const writes=[];let acknowledged=false;
  await page.route('**/api/feedback/binding?*',route=>route.fulfill({json:{available:true,args:{project:'ctrl',assignment:'ctrl-mobile-review',expected_owner:'fixture-owner',expected_branch:'fixture/review',artifact:{repository:'lrnolivia/ctrl',commit_sha:'a'.repeat(40),kind:'source'}}}}));
  await page.route('**/api/feedback/submit',route=>{writes.push(route.request().postDataJSON());return route.fulfill({json:{ok:true,feedback:{report_id:'fbr_'+'b'.repeat(64),status:{queued:true}}}});});
  await page.route('**/api/feedback/status?*',route=>route.fulfill({json:{ok:true,feedback:{report_id:'fbr_'+'b'.repeat(64),status:{queued:!acknowledged,seen:acknowledged?{represented_owner:'fixture-owner'}:null,native_delivery_verified:false}}}}));
  await page.goto(app.origin+'/#/now');await page.locator('.review-focus-actions a').first().waitFor();
  await page.locator('.review-focus-actions a').first().click();
  const dialog=page.locator('.work-detail-dialog:not(.telemetry-dialog)');await dialog.waitFor();await dialog.locator('input[name=decision][value=good]:enabled').waitFor();
  assert.ok(page.url().endsWith('/#/now'),'details preserve the current page');
  await dialog.locator('input[name=decision][value=good]').check();assert.equal(writes.length,0,'choosing a decision does not send');await dialog.locator('[data-send]').click();await dialog.getByText('saved in Relay · acknowledgement pending',{exact:true}).waitFor();
  assert.equal(writes.length,1);assert.equal(writes[0].original_text,'Looks good');
  acknowledged=true;await dialog.locator('[data-refresh-status]').click();await dialog.getByText('reply acknowledged · native delivery unverified',{exact:true}).waitFor();assert.equal(writes.length,1,'receipt status refresh never posts another reply');acknowledged=false;
  const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  await page.screenshot({path:`qa-evidence/work-details-${width}.png`});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  const workLink=page.locator('.review-focus-actions a').first();
  assert.ok(await workLink.evaluate(el=>document.activeElement===el),'closing details restores link focus');
  await workLink.press('Enter');await dialog.waitFor();
  assert.ok(page.url().endsWith('/#/now'),'keyboard details preserve the current page');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  for(const modifier of ['ctrlKey','metaKey','shiftKey','altKey']){
   // Observe delegation, then cancel the browser's default navigation so the
   // synthetic modifier probe cannot replace this test page or create a tab.
   const prevented=await workLink.evaluate((el,modifier)=>{let prevented;const observe=event=>{prevented=event.defaultPrevented;event.preventDefault();};document.addEventListener('click',observe,{once:true});el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,[modifier]:true}));document.removeEventListener('click',observe);return prevented;},modifier);
   assert.equal(prevented,false,'modified work links retain default navigation: '+modifier);
   assert.equal(await dialog.count(),0,'modified work links do not open details');
  }
  let changed=true;
  await page.route('**/api/feedback/binding?*',route=>route.fulfill(changed?{status:409,json:{available:false,reason:'Work changed since this view loaded.'}}:{json:{available:true,args:{project:'ctrl',assignment:'ctrl-mobile-review',expected_owner:'fixture-owner',expected_branch:'fixture/review',artifact:{repository:'lrnolivia/ctrl',commit_sha:'a'.repeat(40),kind:'source'}}}}));
  await workLink.click();await dialog.getByText('work changed · recheck before replying',{exact:true}).waitFor();
  await dialog.locator('[data-toggle-note]').click();await dialog.locator('[data-clear-decision]').click();await dialog.locator('textarea').fill('Preserve this exact draft.');assert.equal(writes.length,1);
  assert.equal(await dialog.locator('[data-send]:disabled').count(),1);
  changed=false;await dialog.locator('[data-recheck]').click();await dialog.getByText('ready to send',{exact:true}).waitFor();
  assert.equal(await dialog.locator('textarea').inputValue(),'Preserve this exact draft.');assert.equal(writes.length,1,'recheck never writes a reply');
  await dialog.locator('[data-send]').click();await dialog.getByText('saved in Relay · acknowledgement pending',{exact:true}).waitFor();
  assert.equal(writes[1].original_text,'Preserve this exact draft.');assert.notEqual(writes[1].operation_id,writes[0].operation_id);
  await page.keyboard.press('Escape');
  await page.locator('.review-focus .project-id-badge').click();await page.locator('.work-detail-checklist').waitFor();
  await page.keyboard.press('Escape');await page.close();
 }}finally{await app.close();}
}
