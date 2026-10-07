import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
export async function fixture({populated=false}={}){const now=new Date().toISOString(),requests=[];const projects=[{id:'relay',name:'relay'},{id:'field',name:'field'}];const progress={relay:[{assignment:'relay-build',goal:'Connect ctrl with Relay',state:'working',stage:'implementation',next_action:'Verify the new control center',last_meaningful_progress_at:now,events:[]}],field:[{assignment:'field-check',goal:'Review the portrait workspace',state:'waiting-for-human',stage:'review',next_action:'Open the latest Inspector capture',last_meaningful_progress_at:now,events:[]}]};
let captureBuffer=null;
if(populated){
 const commit='a'.repeat(40),owner='fixture-owner';
 projects.push({id:'ctrl',name:'ctrl',created_at:new Date(Date.now()-86400000).toISOString()});
 projects[0].created_at=new Date(Date.now()-7*86400000).toISOString();
 projects[1].created_at=new Date(Date.now()-3*86400000).toISOString();
 progress.field[0].state='working';progress.field[0].goal='Polish the portrait workspace';
 progress.ctrl=[{assignment:'ctrl-mobile-review',goal:'Review the mobile control center',state:'waiting-for-human',stage:'review',priority:'high',primary_staff:'valentina',primary_team:'inspector',next_action:'Check the preview, then share what you would change.',last_meaningful_progress_at:now,attention_request:{kind:'review',status:'pending'},identities:{head_sha:commit},events:[]}];
 for(const [index,count] of [2,6,4,8,3,5].entries())for(let i=0;i<count;i++)progress.ctrl[0].events.push({id:`fixture-event-${index}-${i}`,type:['source-commit','check-completed','pull-request-updated'][i%3],at:new Date(Date.now()-(6-index)*3600000+600000+i*1000).toISOString()});
}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');requests.push(url.pathname+url.search);const json=(d,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(d));};
if(url.pathname==='/api/projects')return json({projects});if(url.pathname==='/api/workers')return json([]);if(url.pathname==='/api/relay-info')return json({version:'2.0.fixture'});
if(url.pathname==='/api/work-review'){let text='';for await(const chunk of req)text+=chunk;const input=JSON.parse(text);return json({ok:true,results:(input.items||[]).map(item=>({ok:true,key:[item.project,item.kind,item.id].map(encodeURIComponent).join('/'),record:null,etag:null}))});}
const project=url.pathname.match(/^\/api\/projects\/(relay|field|ctrl)$/);if(project)return json({project:projects.find(p=>p.id===project[1]),coordination:{claims:[...progress[project[1]].map(p=>({id:p.assignment,state:'active',...(populated&&project[1]==='ctrl'?{owner:'fixture-owner',branch:'fixture/review'}:{})})),...(populated&&project[1]==='ctrl'?Array.from({length:7},(_,i)=>({id:'fixture-history-'+i,state:i<6?'completed':'held'})):[])],queue:[]}});
if(url.pathname.endsWith('/icon'))return json(populated&&url.pathname==='/api/projects/field/icon'?JSON.parse(await fs.readFile('test/field-icon.fixture.json','utf8')):{status:'unavailable'});
const work=url.pathname.match(/^\/api\/progress\/(relay|field|ctrl)$/);if(work)return json({project:work[1],progress:progress[work[1]],queue:[]});
if(url.pathname==='/fixture-capture.png'){const bytes=captureBuffer||await fs.readFile('dist/brand/ctrl.png');res.writeHead(200,{'Content-Type':'image/png'});return res.end(bytes);}
const populatedEvidence={evidence_id:'vis_fixture_ctrl',step_label:'mobile control center · test preview',created_at:now,screenshot_url:'/fixture-capture.png',context:{project:'ctrl',assignment:'ctrl-mobile-review',owner:'fixture-owner',branch:'fixture/review',surface:'synthetic browser fixture · not live project data',commit_sha:'a'.repeat(40)},viewport:{width:390,height:780}};
if(populated&&url.pathname==='/api/visual/vis_fixture_ctrl/qa')return json({ok:true,evidence:populatedEvidence,questions:[],review:null,feedback_binding:{available:true,args:{project:'ctrl',assignment:'ctrl-mobile-review',expected_owner:'fixture-owner',expected_branch:'fixture/review',artifact:{repository:'lrnolivia/ctrl',commit_sha:'a'.repeat(40),kind:'runtime'}}}});
if(url.pathname==='/api/visual'&&populated)return json({evidence:[populatedEvidence]});
if(url.pathname==='/api/visual')return json({evidence:Array.from({length:4},(_,i)=>({evidence_id:'vis_fixture_'+i,step_label:'Review fixture '+(i+1),created_at:now,screenshot_url:'/brand/ctrl.png',context:{project:'field',surface:'Fixture preview '+i,environment:'Browser test',commit_sha:'fixture'+i},viewport:{width:1440,height:900}}))});
if(/^\/api\/visual\/vis_fixture_\d+\/qa$/.test(url.pathname))return json({review:null});
if(url.pathname.startsWith('/api/'))return json({error:'fixture route unavailable'},404);
let name=url.pathname==='/'?'/index.html':url.pathname==='/inspector'?'/inspector.html':url.pathname;const target=path.resolve('dist','.'+name);if(!target.startsWith(path.resolve('dist')+path.sep))return json({},404);
try{const bytes=await fs.readFile(target);const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'}[path.extname(target)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type});res.end(bytes);}catch{json({},404);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));return{origin:'http://127.0.0.1:'+server.address().port,progress,requests,setCaptureBuffer:bytes=>{captureBuffer=bytes;},close:()=>new Promise(r=>server.close(r))};}
