import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDashboard} from '../apps/web/src/api.ts';
const json=data=>({ok:true,json:async()=>data});
const claim={id:'assignment',state:'active',owner:'owner',branch:'branch'};
async function run(workers,previous){
 const original=globalThis.fetch,observed=[];try{
  globalThis.fetch=async url=>{
   if(url==='/api/projects')return json({projects:[{id:'ctrl'}]});
   if(url==='/api/workers'){if(workers instanceof Error)throw workers;return json(workers);}
   if(url==='/api/projects/ctrl')return json({coordination:{claims:[claim],queue:[{id:'queued',state:'queued'}]}});
   if(url==='/api/progress/ctrl?assignment=assignment')return json({progress:[{assignment:'assignment',state:'reserved-but-idle'}]});
   throw Error('Unexpected test URL: '+url);
  };
  return {snapshot:await loadDashboard(snapshot=>observed.push(snapshot),previous),observed};
 }finally{globalThis.fetch=original;}
}
test('optional observer outage cannot block canonical cold-load assignments or queued work',async()=>{
 const {snapshot,observed}=await run(Error('observer unavailable'));assert.equal(snapshot.projects.length,1);assert.equal(snapshot.coordination.ctrl.claims[0].id,'assignment');assert.equal(snapshot.progress.ctrl.queue[0].id,'queued');assert.equal(snapshot.progress.ctrl.progress[0].state,'reserved-but-idle');assert.equal(snapshot.observerState,'unavailable');assert.equal(snapshot.failedProgress.length,0);assert.ok(observed.length>=3);
});
test('observer outage retains last-good worker results without erasing coordination',async()=>{
 const workers=[{id:'ctrl',runtime:{last_summary:'Historical observer result'}}],previous={projects:[{id:'ctrl'}],workers,coordination:{ctrl:{claims:[claim]}},progress:{ctrl:{progress:[]}},fetchedAt:'2026-10-03T01:00:00Z'};
 const {snapshot}=await run(Error('quota'),previous);assert.deepEqual(snapshot.workers,workers);assert.equal(snapshot.observerState,'stale');assert.equal(snapshot.coordination.ctrl.claims[0].id,'assignment');
});
test('successful observer recovery replaces prior data and clears only observer uncertainty',async()=>{
 const workers=[{id:'ctrl',runtime:{status:'succeeded'}}],{snapshot}=await run(workers,{workers:[{id:'old'}],progress:{},coordination:{}});assert.deepEqual(snapshot.workers,workers);assert.equal(snapshot.observerState,'available');
});
test('malformed observer payload is isolated as unavailable rather than crashing canonical readers',async()=>{const {snapshot}=await run({error:'quota'});assert.equal(snapshot.observerState,'unavailable');assert.deepEqual(snapshot.workers,[]);assert.equal(snapshot.progress.ctrl.queue.length,1);});
