import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
export async function reviewLoadingChecks(browser,origin){
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',error=>errors.push(String(error)));let sockets=[],qaCalls=0;await page.routeWebSocket('**/api/events*',ws=>{sockets.push(ws);ws.onMessage(data=>{if(data==='ping')ws.send('pong');});});
 let releaseQa,releaseCatalog,holdCatalog=false;
 const qaGate=new Promise(resolve=>{releaseQa=resolve;});
 const catalogGate=new Promise(resolve=>{releaseCatalog=resolve;});
 const evidence=Array.from({length:6},(_,i)=>({evidence_id:'vis_fixture000'+i,step_label:'Review capture '+i,captured_at:'2026-10-03T01:00:00Z',screenshot_url:'/api/visual/vis_fixture000'+i+'/image',viewport:{width:390,height:844},context:{project:'field',commit_sha:'a'.repeat(40)}}));
 await page.route('**/api/visual**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const json=data=>route.fulfill({json:data});
  if(path==='/api/visual'){if(holdCatalog)await catalogGate;return json({evidence});}
  const item=evidence.find(item=>path.includes(item.evidence_id));
  if(!item)return route.fulfill({status:404,json:{error:'not found'}});
  if(path.endsWith('/qa')){
   if(item===evidence[0]){qaCalls++;await qaGate;}
   return json({evidence:item,questions:[{id:'focus',prompt:'Is the spacing balanced?'}],review:item===evidence[1]?{answers:{},notes:'',overall:'looks_good',disposition:'completed'}:item===evidence[2]?{answers:{},notes:'',overall:null,disposition:'archived'}:null});
  }
  if(path.endsWith('/live'))return json({live:{active:false,embeddable:false}});
  if(path.endsWith('/image'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNioAAAAASUVORK5CYII=','base64')});
  return route.fulfill({status:404,json:{error:'not found'}});
 });
 try{
  await page.goto(origin+'/inspector#review?project=field');
  await page.getByRole('button',{name:'Open Review capture 0',exact:true}).waitFor({timeout:8000});
  assert.equal(await page.locator('#review-list').getAttribute('data-summary-needs'),'0','unknown state is not pending');
  assert.equal(await page.locator('[data-select]').first().isDisabled(),true,'unknown review cannot be organized');
  await page.locator('.work-item-visual img').first().waitFor();
  await page.evaluate(()=>{const row=[...document.querySelectorAll('[data-work-key]')].find(n=>n.textContent.includes('Review capture 0'));window.keptPreview={key:row.dataset.workKey,image:row.querySelector('.work-item-visual img')};window.keptHero=document.querySelector('#inspector-review-focus .review-focus-media img');});
  await page.screenshot({path:'qa-evidence/review-visible-before-qa.png'});
  for(const socket of sockets)socket.send(JSON.stringify({type:'resync',cursor:'0'}));
  assert.equal(qaCalls,1,'same-scope refresh must not restart ongoing hydration');
  releaseQa();
  await page.waitForFunction(()=>document.querySelector('#review-list')?.dataset.summaryNeeds==='4');
  assert.equal(await page.getByRole('button',{name:'Open Review capture 1',exact:true}).count(),0,'legacy complete stays out of pending');
  assert.equal(await page.getByRole('button',{name:'Open Review capture 2',exact:true}).count(),0,'legacy archive stays out of pending');
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('[data-work-key]')].find(n=>n.dataset.workKey===window.keptPreview.key)?.querySelector('.work-item-visual img')===window.keptPreview.image),'review hydration preserves the screenshot DOM node');
  assert.ok(await page.evaluate(()=>document.querySelector('#inspector-review-focus .review-focus-media img')===window.keptHero),'featured image survives metadata hydration without remount');
  await page.screenshot({path:'qa-evidence/review-legacy-state-restored.png'});
  holdCatalog=true;
  await page.goto('about:blank');
  await page.goto(origin+'/inspector#review?project=field&evidence=vis_fixture0000');
  await page.getByRole('dialog',{name:'Inspector review',exact:true}).waitFor({timeout:8000});
  await page.locator('.qa-question').filter({hasText:'Is the spacing balanced?'}).waitFor({timeout:8000});
  await page.screenshot({path:'qa-evidence/review-direct-with-catalog-stalled.png'});
  releaseCatalog();assert.deepEqual(errors,[]);
 }catch(error){await page.screenshot({path:'qa-evidence/review-loading-failure.png'});await fs.writeFile('qa-evidence/review-loading-failure.json',JSON.stringify({error:String(error),errors,body:await page.locator('body').innerText()},null,2));throw error;}finally{releaseQa();releaseCatalog();await page.close();}
}
