import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fixture} from './fixture.mjs';
export async function telemetryLayoutChecks(browser,engine='chromium'){
 const app=await fixture({populated:true}),measurements=[];
 async function check(page,selector,children){
  const geometry=await page.locator(selector).evaluate((root,children)=>{
   const box=root.getBoundingClientRect(),style=getComputedStyle(root),tracks=style.display==='grid'?style.gridTemplateColumns.split(' ').map(Number.parseFloat):[box.width],gap=parseFloat(style.columnGap)||0;
   let x=box.x;const edges=tracks.map(width=>{const edge={left:x,right:x+width};x+=width+gap;return edge;});
   return {width:box.width,edges,cards:[...root.querySelectorAll(children)].map(card=>{const r=card.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};})};
  },children);
  assert.ok(geometry.cards.length,selector+' has real cards');
  for(const card of geometry.cards){assert.ok(geometry.edges.some(edge=>Math.abs(edge.left-card.left)<1),selector+' card aligns with its column gutter');assert.ok(geometry.edges.some(edge=>Math.abs(edge.right-card.right)<1),selector+' card fills its available column: '+JSON.stringify(geometry));}
  measurements.push({viewport:page.viewportSize(),selector,...geometry});
 }
 async function rings(page,selector){for(const ring of await page.locator(selector).all())assert.ok(await ring.evaluate(root=>{const r=root.getBoundingClientRect(),copy=root.querySelector('.ring-copy,strong').getBoundingClientRect();return Math.abs(r.x+r.width/2-copy.x-copy.width/2)<1&&Math.abs(r.y+r.height/2-copy.y-copy.height/2)<1;}),'ring and text remain centered');}
 try{for(const viewport of [{width:320,height:844},{width:390,height:844},{width:667,height:375},{width:844,height:390},{width:1024,height:768},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  await page.goto(app.origin+'/#/now?project=ctrl');await page.locator('.control-mosaic[data-loading=false]').waitFor();
  await check(page,'.control-mosaic',':scope>.mosaic-panel');await rings(page,'.mosaic-progress .progress-ring:visible');if(viewport.width<=900){const centered=await page.locator('.mosaic-progress .mosaic-glance-body').evaluate(e=>{const first=e.firstElementChild.getBoundingClientRect(),last=e.lastElementChild.getBoundingClientRect(),box=e.getBoundingClientRect();return Math.abs((first.top+last.bottom)/2-(box.top+box.bottom)/2)});assert.ok(centered<2,'compact progress content is centered within its stretched card');}
  assert.equal(await page.locator('.control-mosaic>.mosaic-motion .mosaic-overview:visible').count(),0,'In Motion keeps registration provenance in its modal');
  {const progress=await page.locator('.mosaic-progress').boundingBox(),motion=await page.locator('.mosaic-motion').boundingBox();assert.ok(Math.abs(progress.height-motion.height)<1,'side-by-side cards have equal height');}
  const filters=page.locator('.work-viewer [data-control-menu=filters]').first();await filters.locator(':scope>summary').click();
  const fits=await filters.locator('.work-control-panel').evaluate(root=>[...root.querySelectorAll('button')].every(button=>{const box=button.getBoundingClientRect();return [...button.querySelectorAll('span,svg')].every(child=>{const r=child.getBoundingClientRect();return r.left>=box.left-1&&r.right<=box.right+1;});}));assert.ok(fits,'narrow filter buttons contain their labels and icons');await filters.locator('[data-close-menu]').click();
  for(const button of await page.locator('.review-focus-actions .operator-button').all()){const bounds=await button.boundingBox(),card=await page.locator('.review-focus').boundingBox();assert.ok(bounds.height>=44&&bounds.x>=card.x&&bounds.x+bounds.width<=card.x+card.width+1,'review actions remain usable within the full-width card');}
  await page.locator('.control-mosaic').screenshot({path:`qa-evidence/telemetry-width-now-${engine}-TEST-DATA-${viewport.width}.png`});
  for(const feature of ['runner','night-shift']){await page.locator(`.operator-nav a[data-feature=${feature}]`).click();await page.getByRole('heading',{name:feature==='runner'?'runner':'night shift',exact:true}).waitFor();await page.locator('.control-mosaic').waitFor();await check(page,'.control-mosaic',':scope>article');if(feature==='runner'){await rings(page,'.mosaic-progress .progress-ring:visible');assert.ok(await page.locator('section.runner-telemetry').evaluate(root=>{const expected=getComputedStyle(document.documentElement).getPropertyValue('--feature-runner').trim();return getComputedStyle(root.querySelector('.mosaic-count')).color===(()=>{const probe=document.createElement('span');probe.style.color=expected;root.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;})();}),'Runner telemetry uses its green feature accent');const actions=page.locator('.mosaic-assignment-actions').first();assert.ok(await actions.evaluate(root=>parseFloat(getComputedStyle(root).gap)>=10),'assignment actions keep a visible gap');}}
  await page.locator('.workspace-context [data-relay-open]').click();await page.locator('dialog[data-motion=settled]').waitFor();await page.locator('.relay-compact-mosaic article').first().waitFor();await check(page,'.relay-compact-mosaic',':scope>article');await rings(page,'.relay-compact-ring');await page.locator('.relay-compact-mosaic').screenshot({path:`qa-evidence/telemetry-width-relay-${engine}-TEST-DATA-${viewport.width}.png`});await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.locator('.operator-nav a[data-feature=inspector]').click();await page.locator('#inspector-telemetry .inspector-mini-telemetry[data-pending=false]').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'telemetry never causes horizontal overflow');
  await page.close();
 }}finally{await fs.writeFile(`qa-evidence/telemetry-width-measurements-${engine}-TEST-DATA.json`,JSON.stringify(measurements,null,2));await app.close();}
}
