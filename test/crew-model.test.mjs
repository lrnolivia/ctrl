import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const built=await build({entryPoints:['apps/web/src/components/crew-model.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {directory,matchingStaff,assignmentsForStaff,formatCrewTime}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const now=Date.parse('2026-11-01T01:00:00Z');
const snapshot=(claims=[],progress=[],extra={})=>({fetchedAt:'2026-11-01T00:59:00Z',projects:[{id:'ctrl',managed:true}],workers:[],coordination:{ctrl:{claims}},progress:{ctrl:{project:'ctrl',progress,queue:[]}},...extra});
test('approved display directory has 21 stable identities, six teams and four leaders without permission activation',()=>{
 assert.equal(directory.staff.length,21);assert.equal(new Set(directory.staff.map(s=>s.id)).size,21);assert.equal(Object.keys(directory.teams).length,6);
 assert.deepEqual(directory.management_order,['julian','naomi','dominique','valentina']);assert.ok(!directory.staff.some(s=>s.id==='felix'));
 assert.equal(directory.staff.find(s=>s.id==='rafael').team,'engineering');assert.equal(directory.staff.find(s=>s.id==='valentina').role,'Art Director');
 assert.match(directory.status,/not runtime authorization/);
});
test('approved avatar and CEO bytes are intact; all packaged paths are unique and bounded',async()=>{
 assert.equal(directory.assets.length,38);const ids=new Set();
 for(const asset of directory.assets){assert.ok(!ids.has(asset.path));ids.add(asset.path);assert.ok(!asset.path.includes('..')&&!asset.path.startsWith('/'));assert.equal(createHash('sha256').update(await fs.readFile('apps/web/public/crew/'+asset.path)).digest('hex'),asset.sha256,asset.path);}
 for(const s of directory.staff){assert.equal(s.avatar,'avatars/'+s.id+'.png');assert.equal(directory.assets.find(a=>a.path===s.avatar).sha256,s.avatar_sha256);}
 assert.equal(directory.assets.find(a=>a.path==='ceo-original.jpeg').sha256,'e0692537030998c5ebe8ba4d1d3d1065066d0243e905de79809099fdd35f6e81');
});
test('search combines role/name/team with bounded team filters and honest empty results',()=>{
 assert.equal(matchingStaff('all','  NICO ').length,1);assert.equal(matchingStaff('engineering','').length,6);assert.equal(matchingStaff('design','engineer').length,0);assert.equal(matchingStaff('all','Technical Writer')[0].id,'esme');assert.equal(matchingStaff('unknown','').length,0);
});
test('staff joins are assignment-bound lead/support routing, never inferred from a team or executor name',()=>{
 const s=snapshot([{id:'a',state:'active',primary_staff:'valentina',supporting_staff:['nico'],primary_team:'inspector',owner:'roman'},{id:'b',state:'active',primary_team:'inspector'}]);
 assert.equal(assignmentsForStaff(s,'valentina',now)[0].relation,'Recorded lead');assert.equal(assignmentsForStaff(s,'nico',now)[0].relation,'Assigned support');assert.deepEqual(assignmentsForStaff(s,'roman',now),[]);assert.deepEqual(assignmentsForStaff(s,'margot',now),[]);
});
test('canonical empty or changed staffing removes stale progress attribution',()=>{
 const old=[{assignment:'a',primary_staff:'nico',supporting_staff:['roman']}];
 assert.deepEqual(assignmentsForStaff(snapshot([{id:'a',state:'active',primary_staff:null,supporting_staff:[]}],old),'nico',now),[]);
 assert.deepEqual(assignmentsForStaff(snapshot([{id:'a',state:'active',primary_staff:'valentina',supporting_staff:[]}],old),'roman',now),[]);
});
test('completed/cancelled/superseded canonical claims suppress stale active observations',()=>{
 for(const state of ['completed','cancelled','superseded'])assert.deepEqual(assignmentsForStaff(snapshot([{id:'a',state,primary_staff:'nico'}],[{assignment:'a',state:'working',primary_staff:'nico'}]),'nico',now),[]);
});
test('failed work remains assigned while canonical claim is active; expiry and progress have separate clocks',()=>{
 const r=assignmentsForStaff(snapshot([{id:'a',state:'active',primary_staff:'nico',lease_until:'2026-11-02T00:00:00Z',updated_at:'2026-11-01T00:59:00Z'}],[{assignment:'a',state:'failed',last_meaningful_progress_at:'2026-10-30T00:00:00Z',progress_freshness:'stale'}]),'nico',now)[0];
 assert.equal(r.state,'active');assert.equal(r.progressState,'failed');assert.equal(r.expired,false);assert.equal(r.progressFreshness,'stale');
 const expired=assignmentsForStaff(snapshot([{id:'a',state:'held',primary_staff:'nico',lease_until:'2026-10-31T00:00:00Z'}]),'nico',now)[0];assert.equal(expired.expired,true);assert.equal(expired.state,'held');assert.equal(expired.progressAt,undefined);
});
test('missing canonical state is unknown and no roster binding manufactures progress',()=>{
 assert.deepEqual(assignmentsForStaff(null,'nico',now),[]);assert.deepEqual(assignmentsForStaff(snapshot(),'unknown',now),[]);
 const r=assignmentsForStaff(snapshot([],[{assignment:'a',primary_staff:'nico',state:'working'}]),'nico',now)[0];assert.equal(r.state,'unknown');assert.equal(r.progressAt,undefined);
});
test('queue records remain queued and are deduplicated against a subsequently claimed assignment',()=>{
 const s=snapshot();s.progress.ctrl.queue=[{id:'a',primary_staff:'julian',goal:'Plan a release'}];assert.equal(assignmentsForStaff(s,'julian',now)[0].state,'queued');
 s.coordination.ctrl.claims=[{id:'a',state:'active',primary_staff:'julian'}];const rows=assignmentsForStaff(s,'julian',now);assert.equal(rows.length,1);assert.equal(rows[0].state,'active');
});
test('project and refresh identity are retained even when project data is incomplete',()=>{
 const s=snapshot([{id:'a',state:'active',primary_staff:'nico'}],[],{failedProgress:['ctrl']});assert.equal(assignmentsForStaff(s,'nico',now)[0].refresh,'unavailable');
 s.failedProgress=[];s.loadingProgress=['ctrl'];assert.equal(assignmentsForStaff(s,'nico',now)[0].refresh,'loading');
 s.projects.push({id:'field',managed:true});s.coordination.field={claims:[{id:'a',state:'held',primary_staff:'nico'}]};assert.deepEqual(assignmentsForStaff(s,'nico',now).map(r=>r.key),['ctrl/a','field/a']);
});
test('unknown timestamps stay unknown; valid timestamps explicitly use UTC',()=>{assert.equal(formatCrewTime('bad'),'Unknown');assert.equal(formatCrewTime(null),'Unknown');assert.match(formatCrewTime('2026-11-01T00:59:00Z'),/1 Nov 2026, 00:59 UTC/);});
