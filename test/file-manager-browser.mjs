import assert from 'node:assert/strict';
export async function fileManagerChecks(browser,origin){
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/api/files',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,files:[{id:'fl_'+'a'.repeat(32),filename:'synthetic-work-package.zip',bytes:40*1048576,state:'ready',created_at:Date.now(),expires_at:Date.now()+86400000}],cursor:null})}));
  await page.goto(origin+'/#/now');await page.getByRole('button',{name:'Open files',exact:true}).click();const modal=page.getByRole('dialog');await modal.waitFor();await modal.getByRole('link',{name:'Download',exact:true}).waitFor();const box=await modal.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);assert.ok(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await modal.screenshot({path:`qa-evidence/files-${width}-TEST-DATA.png`});await page.keyboard.press('Escape');await modal.waitFor({state:'hidden'});assert.equal(await page.getByRole('button',{name:'Open files',exact:true}).evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:'Open files',exact:true}).click();await modal.getByRole('button',{name:'Close files',exact:true}).click();await modal.waitFor({state:'hidden'});await page.close();
 }
}
