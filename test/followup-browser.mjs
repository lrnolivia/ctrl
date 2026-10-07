import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
export async function followupChecks(browser){
 const app=await fixture({populated:true});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/api/projects/ctrl',route=>route.fulfill({json:{project:{id:'ctrl',ideas:[{title:'A smaller review view',description:'Recorded test idea.'}]},coordination:{claims:[{id:'ctrl-mobile-review',goal:'Review the mobile control center',state:'active',deliverables:[{title:'keyboard support',status:'completed'},{title:'mobile layout',status:'verified'},{title:'loading behavior'}]}],queue:[{id:'ctrl-planned',state:'queued',goal:'Plan the next review',acceptance:'Keep the preview stable; Explain the next step'}]}}}));
  await page.route('**/api/workers',route=>route.fulfill({json:[{id:'ctrl',name:'ctrl',enabled:true,runtime:{status:'succeeded',last_run_at:new Date().toISOString(),last_summary:'The last check passed.'}}]}));
  await page.goto(app.origin+'/#/now?project=ctrl');
  await page.locator('.project-context [data-work-project=ctrl]').click();
  const dialog=page.locator('.work-detail-dialog:not(.telemetry-dialog)');
  await dialog.locator('[data-assignment=ctrl-planned]').waitFor();assert.equal(await dialog.locator('.work-detail-stats dd').last().textContent(),'1','queued work remains visible in the project summary');
  await dialog.getByText('A smaller review view',{exact:true}).waitFor();
  await dialog.locator('[data-assignment=ctrl-mobile-review]').click();
  await dialog.getByText(/67% · 2 of 3 items recorded complete/).waitFor();
  assert.equal(await dialog.getByText('recorded complete · verification not reported',{exact:true}).count(),1);
  assert.equal(await dialog.getByText('verified',{exact:true}).count(),1);
  assert.equal(await dialog.getByText('completion not reported',{exact:true}).count(),1);
  await page.screenshot({path:`qa-evidence/followup-checklist-TEST-DATA-${width}.png`});
  await dialog.locator('.work-detail-back').click();await dialog.locator('[data-assignment=ctrl-planned]').click();
  await dialog.getByText('Completion is not itemized yet.',{exact:false}).waitFor();
  assert.equal(await dialog.locator('[data-send]:disabled').count(),1);
  assert.ok(page.url().includes('/#/now?project=ctrl'));
  await page.keyboard.press('Escape');
  for(const feature of ['runner','night-shift']){
   await page.locator(`.operator-nav a[data-feature=${feature}]`).click();
   await page.getByRole("heading",{name:feature==='runner'?'runner':'night shift',exact:true}).waitFor();
   await page.locator('.control-mosaic').waitFor();
   if(feature==='night-shift'){const tiles=page.locator('.night-shift-telemetry .domain-tile');assert.equal(await tiles.count(),4);const first=await tiles.nth(0).boundingBox(),second=await tiles.nth(1).boundingBox();assert.ok(width<=600?second.y>=first.y+first.height:Math.abs(second.y-first.y)<1,'Night Shift preserves one phone column and two desktop columns');assert.equal(await page.locator('.night-shift-telemetry .domain-full-detail:visible').count(),0,'detailed records remain in metric dialogs');}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const ring=page.locator('.mosaic-progress .progress-ring:visible');
   if(feature==='runner')
   assert.ok(await ring.evaluate(el=>{const r=el.getBoundingClientRect(),c=el.querySelector('.ring-copy').getBoundingClientRect();return Math.abs(r.x+r.width/2-c.x-c.width/2)<1&&Math.abs(r.y+r.height/2-c.y-c.height/2)<1;}),'chart ring is centered');
   await page.locator(".project-details-action").focus();await page.mouse.move(width-8,20);
   if(width>900)await page.waitForFunction(()=>document.querySelector(".operator-topbar").getBoundingClientRect().width<110);
   await page.locator(".control-mosaic").screenshot({path:`qa-evidence/followup-${feature}-TEST-DATA-${width}.png`});
  }
  await page.locator('.operator-nav a[data-feature=inspector]').click();
  await page.locator('#review-list[data-summary-state=ready]').waitFor();
  await page.locator('#inspector-telemetry .inspector-mini-telemetry[data-pending=false]').waitFor();
  await page.locator('#review-list [data-view=list]').click();
  await page.screenshot({path:`qa-evidence/followup-inspector-TEST-DATA-${width}.png`});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.close();
 }}finally{await app.close();}
}
