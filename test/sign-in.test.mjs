import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import {signInResponse} from '../worker/sign-in.js';
const request=(path,method='GET')=>new Request('https://ctrl.loew.fi'+path,{method});
const env={CTRL_ENABLED:'true',RELAY:{fetch(){throw Error('Public page must never call Relay');}},ASSETS:{fetch(){throw Error('Public page must never request assets');}}};
test('signed-out entry is complete brand-only HTML with canonical continuation',async()=>{
 const response=await worker.fetch(request('/sign-in?redirect=https://evil.example'),env);
 assert.equal(response.status,200);
 const html=await response.text();
 assert.match(html,/class="wordmark">ctrl</);assert.match(html,/data:image\/png;base64,/);assert.match(html,/@font-face/);assert.match(html,/SIL OPEN FONT LICENSE/i);
 assert.deepEqual([...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),['https://ctrl.loew.fi/']);
 assert.doesNotMatch(html,/<script|<form|<input|evil\.example|\/api\//i);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.match(response.headers.get('Content-Security-Policy'),/default-src 'none'/);
});
test('HEAD is bodyless and non-read methods are rejected',async()=>{
 const head=signInResponse(request('/sign-in','HEAD'));assert.equal(head.status,200);assert.equal(await head.text(),'');
 for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){const r=signInResponse(request('/sign-in',method));assert.equal(r.status,405);assert.equal(r.headers.get('Allow'),'GET, HEAD');}
});
test('only exact /sign-in is public; protected roots, APIs and lookalikes retain 401',async()=>{
 for(const path of ['/','/index.html','/inspector','/api/projects','/api/feedback/submit','/sign-in/','/sign-in/child','/sign-in.css','/SIGN-IN','/sign%2Din']){
  assert.equal(signInResponse(request(path)),null,path);
  const r=await worker.fetch(request(path),env);assert.equal(r.status,401,path);assert.deepEqual(await r.json(),{error:'Authentication required'});
 }
});
test('disabled configuration remains fail closed',async()=>{assert.equal((await worker.fetch(request('/sign-in'),{...env,CTRL_ENABLED:'false'})).status,503);});
