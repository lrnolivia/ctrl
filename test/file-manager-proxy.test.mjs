import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{permitted,forwarded} from '../worker/index.js';
const id='fl_'+'a'.repeat(32);
test('file proxy permits only narrow read/upload/download routes',()=>{
 for(const [path,method] of [['/api/files','GET'],['/api/files','POST'],['/api/files/'+id+'/status','GET'],['/api/files/'+id+'/download','GET'],['/api/files/'+id+'/complete','POST'],['/api/files/'+id+'/restore','POST'],['/api/files/'+id+'/chunks/0','PUT'],['/api/files/'+id,'PATCH'],['/api/files/'+id,'DELETE']])assert.equal(permitted(path,method),true);
 for(const [path,method] of [['/api/files/admin','GET'],['/api/files/'+id+'/download','DELETE'],['/api/files','PATCH'],['/api/files/'+id+'/restore','DELETE'],['/api/files/'+id+'/chunks/-1','PUT'],['/api/files','PUT'],['/api/files/'+id+'/download','POST']])assert.equal(permitted(path,method),false);
});
test('file proxy preserves signed identity and actual origin, requiring explicit same-origin upload',async()=>{
 let seen;const env={CTRL_ENABLED:'true',ASSETS:{fetch:()=>new Response('asset')},RELAY:{fetch:request=>{seen=request;return Response.json({ok:true})}}};
 const path='https://ctrl.loew.fi/api/files/'+id+'/chunks/0';
 const headers={'cf-access-jwt-assertion':'opaque-test-token','origin':'https://ctrl.loew.fi','content-type':'application/octet-stream','x-relay-file-request':'1','x-content-sha256':'b'.repeat(64)};
 const req=()=>new Request(path,{method:'PUT',headers,body:'test'});assert.equal((await worker.fetch(req(),env)).status,200);assert.equal(seen.headers.get('origin'),'https://ctrl.loew.fi');assert.equal(seen.headers.get('x-content-sha256'),'b'.repeat(64));assert.equal(seen.headers.get('cf-access-jwt-assertion'),'opaque-test-token');assert.equal(await seen.text(),'test');
 for(const patch of [{origin:'https://evil.example'},{'x-relay-file-request':''}])assert.equal((await worker.fetch(new Request(path,{method:'PUT',headers:{...headers,...patch},body:'test'}),env)).status,403);
 assert.equal((await worker.fetch(new Request(path,{method:'PUT',headers:{...headers,'cf-access-jwt-assertion':''},body:'test'}),env)).status,401);
});
test('file management requires identity, actual origin, explicit intent and JSON for rename',async()=>{
 let seen;const env={CTRL_ENABLED:'true',ASSETS:{fetch:()=>new Response('asset')},RELAY:{fetch:r=>{seen=r;return Response.json({ok:true})}}};
 const url='https://ctrl.loew.fi/api/files/'+id,headers={'cf-access-jwt-assertion':'test','origin':'https://ctrl.loew.fi','x-relay-file-request':'1','content-type':'application/json'};
 for(const method of ['PATCH','DELETE','POST']){
  const make=(patch={})=>new Request(method==='POST'?url+'/restore':url,{method,headers:{...headers,...patch},...(method==='PATCH'?{body:JSON.stringify({filename:'renamed.zip'})}:{})});
  assert.equal((await worker.fetch(make(),env)).status,200);assert.equal(seen.method,method);assert.equal(seen.headers.get('origin'),'https://ctrl.loew.fi');
  assert.equal((await worker.fetch(make({origin:'https://evil.example'}),env)).status,403);
  assert.equal((await worker.fetch(make({'x-relay-file-request':''}),env)).status,403);
  assert.equal((await worker.fetch(make({'cf-access-jwt-assertion':''}),env)).status,401);
 }
 assert.equal((await worker.fetch(new Request(url,{method:'PATCH',headers:{...headers,'content-type':'text/plain'},body:'name'}),env)).status,415);
});
