import { signInResponse } from './sign-in.js';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const safeId='[a-zA-Z0-9_-]+';
const reads=new RegExp('^/api/(?:projects(?:/'+safeId+'(?:/icon)?)?|workers|progress/'+safeId+'|visual(?:/vis_[a-zA-Z0-9-]+(?:/(?:qa|live|image))?)?|retained-preview/rp_[a-f0-9]+(?:/view)?|work-review|events|relay-info|feedback/(?:status|binding)|night-shift/items|execution/jobs)$');
const writes=new RegExp('^/api/(?:feedback/submit|night-shift/request|work-review|visual/vis_[a-zA-Z0-9-]+/qa|retained-preview/rp_[a-f0-9]+/review|workers/'+safeId+'/(?:toggle|settings|run|doctor|repair))$');
const fileRead=/^\/api\/files(?:\/fl_[a-f0-9]{32}(?:\/(?:status|download))?)?$/;
const fileWrite=/^\/api\/files(?:\/fl_[a-f0-9]{32}\/complete)?$/;
const fileChunk=/^\/api\/files\/fl_[a-f0-9]{32}\/chunks\/\d+$/;
export function permitted(path,method){if(['GET','HEAD'].includes(method)&&fileRead.test(path))return true;if(method==='POST'&&fileWrite.test(path))return true;if(method==='PUT'&&fileChunk.test(path))return true;return ['GET','HEAD'].includes(method)?reads.test(path):method==='POST'&&writes.test(path);}
export function forwarded(request,path){const url=new URL(request.url);if(path)url.pathname=path;const headers=new Headers();for(const key of ['accept','content-type','cf-access-jwt-assertion','origin','upgrade','sec-websocket-key','sec-websocket-version','sec-websocket-protocol','if-none-match','content-length','x-relay-file-request','x-content-sha256']){const value=request.headers.get(key);if(value)headers.set(key,value);}return new Request(url,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual',duplex:'half'});}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(env.CTRL_ENABLED!=='true'||!env.RELAY||!env.ASSETS)return json({error:'ctrl protected deployment is not enabled'},503);
 const entry=signInResponse(request);if(entry)return entry;
 if(!request.headers.get('cf-access-jwt-assertion'))return json({error:'Authentication required'},401);
 const aliases={'/today':'/#/now','/now':'/#/now','/runner':'/#/runner','/night-shift':'/#/night-shift'};const destination=aliases[url.pathname.replace(/\/$/,'')];if(destination&&['GET','HEAD'].includes(request.method))return Response.redirect(url.origin+destination+url.search,308);
 if(url.pathname.startsWith('/api/')){
  if(!permitted(url.pathname,request.method))return json({error:'Not found'},404);
  const changing=!['GET','HEAD'].includes(request.method),socket=url.pathname==='/api/events';
  if((changing||socket)&&request.headers.get('Origin')!==url.origin)return json({error:'Same-origin request required'},403);
  if(changing&&url.pathname.startsWith('/api/files')&&request.headers.get('x-relay-file-request')!=='1')return json({error:'Explicit file request required'},403);
  if(changing&&!url.pathname.startsWith('/api/files')&&!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
  if(url.pathname==='/api/relay-info'){
   const auth=await env.RELAY.fetch(forwarded(request,'/api/health'));if(!auth.ok)return auth;
   const health=await env.RELAY.fetch(forwarded(request,'/health'));if(!health.ok)return json({error:'Relay health unavailable'},502);const info=await health.json();return json({version:typeof info.version==='string'?info.version:null,checked_at:new Date().toISOString()});
  }
  // Relay validates the assertion and actual browser Origin. Never spoof relay.loew.fi.
  return env.RELAY.fetch(forwarded(request));
 }
 if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
 const isPage=['/','/index.html','/inspector','/inspector/','/inspector.html'].includes(url.pathname);
 if(isPage){const auth=await env.RELAY.fetch(forwarded(new Request(request,{method:'GET'}),'/api/health'));if(!auth.ok)return auth;}
 if(url.pathname==='/')url.pathname='/index.html';
 if(['/inspector','/inspector/','/inspector.html'].includes(url.pathname))url.pathname='/index.html';
 const response=await env.ASSETS.fetch(new Request(url,request));const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');headers.set('Cache-Control','no-store');
 if(isPage)headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-src 'self' https://*.loew.fi; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
 return new Response(response.body,{status:response.status,headers});
}};

