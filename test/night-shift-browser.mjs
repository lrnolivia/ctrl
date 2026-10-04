import assert from 'node:assert/strict';import {fixture} from './fixture.mjs';
export async function nightShiftChecks(browser){
 const app=await fixture({populated:true});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}}),writes=[];
  const owner='test-owner',branch='test/shift',head='a'.repeat(40),lease=new Date(Date.now()+3600000).toISOString();
  await page.route('**/api/projects/ctrl',route=>route.fulfill({json:{project:{id:'ctrl'},coordination:{claims:[{id:'ctrl-mobile-review',goal:'Review the mobile control center',state:'active',owner,branch,lease_until:lease,primary_staff:'valentina'},{id:'recipient',goal:'Verify the requested changes',state:'active',owner:'recipient-owner',branch:'test/recipient',lease_until:lease,primary_staff:'julian'}]}}}));
  await page.route('**/api/progress/ctrl?assignment=recipient',route=>route.fulfill({json:{progress:[{assignment:'recipient',state:'working',identities:{head_sha:head}}]}}));
  let items=[],revision=1,fail=false,lose=true;
  const item={id:'ns_'+'a'.repeat(64),summary:'TEST DATA · review changes recorded',declared_away_window:{start:'2026-10-03T00:00:00Z',end:'2026-10-03T04:00:00Z'},source:{assignment:'ctrl-mobile-review',job_id:'job_'+'a'.repeat(64),execution_state:'succeeded',started_at:'2026-10-03T01:00:00Z',finished_at:'2026-10-03T02:00:00Z',evidence:'test receipt'},process_verified:false,objective_completed:false,recipient_acknowledged:false,shift:null};
  await page.route('**/api/night-shift/items?*',route=>fail?route.fulfill({status:503,json:{error:'unavailable'}}):route.fulfill({json:{ok:true,revision,items,next_cursor:null,oversight:{available:false,binding:null,reason:'No oversight assignment bound.'}}}));
  await page.route('**/api/execution/jobs?*',route=>route.fulfill({json:{ok:true,rows:[],next_cursor:null,executor_online_verified:false}}));
  await page.route('**/api/night-shift/request',async route=>{const body=route.request().postDataJSON();writes.push(body);if(lose){lose=false;return route.abort();}item.shift={job_id:'job_'+'b'.repeat(64),assignment:'recipient',owner:'recipient-owner',branch:'test/recipient',requested_at:new Date().toISOString(),initial_state:'queued',executor_started:false,recipient_acknowledged:false};revision++;return route.fulfill({json:{ok:true,revision,item,shift:item.shift}});});
  await page.goto(app.origin+'/#/night-shift?project=ctrl');
  const ledger=page.locator('.night-shift-ledger');await ledger.getByText('No away-work receipts have been recorded for this project.',{exact:true}).waitFor();assert.equal(writes.length,0);
  await ledger.getByRole('button',{name:'manage away work'}).click();const dialog=page.locator('.night-shift-dialog');
  await dialog.getByRole('button',{name:'find eligible execution receipts'}).click();await dialog.getByText(/No execution has the start, exit/).waitFor();assert.equal(await dialog.getByRole('button',{name:'record declared away work'}).count(),0);assert.equal(writes.length,0);
  items=[item];await dialog.getByRole('button',{name:'refresh current work'}).click();await ledger.getByText('TEST DATA · review changes recorded',{exact:true}).waitFor();await page.keyboard.press('Escape');
  await ledger.getByText('TEST DATA · review changes recorded',{exact:true}).click();
  await dialog.getByText(/objective completion remain unverified/).waitFor();
  await dialog.getByLabel('manage with an existing assignment').selectOption('ctrl-mobile-review');await dialog.getByLabel('existing recipient assignment').selectOption('recipient');await dialog.getByLabel('next step').fill('Keep this exact Shift request.');
  await dialog.getByRole('button',{name:'queue Shift request'}).click();await dialog.getByRole('button',{name:'retry the preserved request'}).waitFor();
  assert.equal(writes.length,1);assert.equal(writes[0].summary,'Keep this exact Shift request.');assert.equal(writes[0].recipient.head_sha,head);assert.equal(writes[0].recipient.owner,'recipient-owner');
  await page.reload();await ledger.getByText('TEST DATA · review changes recorded',{exact:true}).waitFor();await ledger.getByText('TEST DATA · review changes recorded',{exact:true}).click();await dialog.getByRole('button',{name:'restore Shift request'}).click();assert.equal(await dialog.getByLabel('next step').inputValue(),'Keep this exact Shift request.');
  await dialog.getByRole('button',{name:'retry the preserved request'}).click();await dialog.getByText(/Shift request saved · queued/).waitFor();assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.equal(await dialog.getByRole('button',{name:'queue Shift request'}).count(),0);
  const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);await page.screenshot({path:`qa-evidence/night-shift-request-TEST-DATA-${width}.png`});
  fail=true;await dialog.getByRole('button',{name:'refresh current work'}).click();await dialog.getByText('Current work could not refresh. Your text stays here.',{exact:true}).waitFor();assert.equal(await dialog.getByLabel('manage with an existing assignment').inputValue(),'ctrl-mobile-review');
  await page.keyboard.press('Escape');await page.close();
 }}finally{await app.close();}
}
