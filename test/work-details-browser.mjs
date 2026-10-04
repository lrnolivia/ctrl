import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
export async function workDetailsChecks(browser){
 const app=await fixture({populated:true});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});const writes=[];
  await page.route('**/api/feedback/binding?*',route=>route.fulfill({json:{available:true,args:{project:'ctrl',assignment:'ctrl-mobile-review',expected_owner:'fixture-owner',expected_branch:'fixture/review',artifact:{repository:'lrnolivia/ctrl',commit_sha:'a'.repeat(40),kind:'source'}}}}));
  await page.route('**/api/feedback/submit',route=>{writes.push(route.request().postDataJSON());return route.fulfill({json:{ok:true,feedback:{report_id:'fbr_'+'b'.repeat(64),status:{queued:true}}}});});
  await page.route('**/api/feedback/status?*',route=>route.fulfill({json:{ok:true,feedback:{report_id:'fbr_'+'b'.repeat(64),status:{queued:true}}}}));
  await page.goto(app.origin+'/#/now');await page.locator('.review-focus-actions a').first().waitFor();
  await page.locator('.review-focus-actions a').first().click();
  const dialog=page.locator('.work-detail-dialog');await dialog.waitFor();await dialog.locator('[data-answer="looks good"]:enabled').waitFor();
  assert.ok(page.url().endsWith('/#/now'),'details preserve the current page');
  await dialog.locator('[data-answer="looks good"]').click();await dialog.getByText('saved in Relay · acknowledgement pending',{exact:true}).waitFor();
  assert.equal(writes.length,1);assert.equal(writes[0].original_text,'looks good');
  const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  await page.screenshot({path:`qa-evidence/work-details-${width}.png`});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  await page.locator('.review-focus .project-id-badge').click();await page.locator('.work-detail-checklist').waitFor();
  await page.keyboard.press('Escape');await page.close();
 }}finally{await app.close();}
}
