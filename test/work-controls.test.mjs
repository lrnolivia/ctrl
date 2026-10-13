import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderWorkControls,normalizeWorkControlQuery,applyWorkControlChoice,workControlLabels,renderControlShell,renderControlChoiceGroup,controlBarVersion} from '../packages/shared-ui/work-controls.js';
const render=options=>renderWorkControls({selected:3,visible:9,loaded:true,canAct:()=>true,openMenus:['filters','organize'],...options});
test('approved human labels retain unchanged review protocol identities',()=>{
 assert.deepEqual(workControlLabels,{pending:'needs me',completed:'reviewed',stale:'outdated',archived:'archived',all:'everything'});
 const html=render();for(const text of ['show me','arrange by','recent updates','put first','newest first','oldest first','select all 9 shown items','Choose a review action below','update review status','mark reviewed','review again','mark outdated','archive or restore items'])assert.ok(html.includes(text),text);
 assert.match(html,/data-bulk="completed"/);assert.doesNotMatch(html,/mark complete|back to work|<option value="time"/);
});
test('Done is a distinct neutral exit, not a mutation or filter option',()=>{
 const html=render();assert.equal((html.match(/class="work-controls-done"/g)||[]).length,2);
 assert.match(html,/class="work-controls-done" data-close-menu="filters">done /);
 assert.match(html,/class="work-controls-done" data-close-menu="organize">close /);
 const css=fs.readFileSync(new URL('../packages/shared-ui/work-controls.css',import.meta.url),'utf8');
 assert.match(css,/--work-control-accent:#be3f50/);assert.match(css,/--work-control-done:#f2f1ee/);
 assert.match(css,/work-controls-done[^}]+background:var\(--work-control-done\)/);
});
test('rendering is side-effect free, all mutations still require host confirmation',()=>{
 let calls=0;const fetch=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('must not contact backend');};
 try {const html=render();assert.match(html,/You will confirm the items before saving/);assert.equal(calls,0);assert.doesNotMatch(html,/data-confirm/);} finally{globalThis.fetch=fetch;}
});
test('radio choices expose selected state and one tab stop per group',()=>{
 const html=render({query:{sort:'importance',direction:'asc'}});
 assert.equal((html.match(/role="radiogroup"/g)||[]).length,2);
 assert.equal((html.match(/role="radio" aria-checked="true" tabindex="0"/g)||[]).length,2);
 assert.match(html,/data-query="sort" data-value="importance"[^>]+aria-checked="true"/);
 assert.match(html,/highest first/);assert.match(html,/lowest first/);
});
test('invalid persisted state is normalized, extensions preserved without mutation',()=>{
 const query={filter:'task-complete',search:42,sort:'bad',direction:'bad',extensions:{kind:'qa'}};
 const result=normalizeWorkControlQuery(query);assert.equal(result.filter,'pending');assert.equal(result.search,'');assert.equal(result.sort,'time');assert.equal(result.direction,'desc');assert.deepEqual(result.extensions,{kind:'qa'});assert.notEqual(result.extensions,query.extensions);
 assert.equal(normalizeWorkControlQuery({extensions:[]}).extensions.constructor,Object);
});
test('choice reducer rejects arbitrary commands and preserves unrelated filters',()=>{
 const query={...normalizeWorkControlQuery(),search:'keep me',extensions:{kind:'evidence'}};
 for(const [key,value] of [['filter','all'],['sort','importance'],['direction','asc']]){const next=applyWorkControlChoice(query,key,value);assert.equal(next[key],value);assert.equal(next.search,'keep me');assert.deepEqual(next.extensions,{kind:'evidence'});assert.notEqual(next,query);}
 assert.equal(applyWorkControlChoice(query,'__proto__','pollute'),query);assert.equal(applyWorkControlChoice(query,'filter','delete'),query);
});
test('unavailable records and busy saves disable review actions and selection',()=>{
 for(const options of [{loaded:false},{busy:true}]){const html=render(options);assert.match(html,/data-bulk="completed" disabled/);assert.match(html,/data-select-visible[^>]+disabled/);}
 assert.doesNotMatch(render({visible:0}),/data-select-visible/);
 assert.match(render({canAct:()=>false}),/data-bulk="completed" disabled/);
});
test('selection summary reports hidden selected records and explicit broad scope',()=>{
 const html=render({hidden:2,scope:'all-projects'});assert.match(html,/2 selected items are outside these results/);assert.match(html,/Action scope: all projects, matching loaded results/);assert.match(html,/You will confirm the exact items before saving/);
 assert.match(render({hidden:1}),/1 selected item is outside/);
});
test('rendered search and extension data are escaped',()=>{
 const html=render({query:{search:'"><script>alert(1)</script>'},extensionControls:[{key:'kind"',label:'<img>',options:[{value:'"x',label:'<script>'}]}]});
 assert.doesNotMatch(html,/<script>|<img>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/extension:kind&quot;/);
});
test('view and disclosure state survive render and have accessible names',()=>{
 const html=render({view:'visual',openMenus:['filters','archive']});assert.match(html,/data-view="visual"[^>]+aria-pressed="true"[^>]+aria-label="Visual view"/);assert.match(html,/data-control-menu="filters" open/);assert.match(html,/data-control-menu="archive" open/);
});
test('responsive and reduced-motion rules preserve controls without clipping',()=>{
 const css=fs.readFileSync(new URL('../packages/shared-ui/work-controls.css',import.meta.url),'utf8');assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.doesNotMatch(css,/overflow\s*:\s*hidden/);assert.match(css,/focus-visible/);
});

test('shared variants configure content, search and view icons without work semantics',()=>{
 assert.equal(controlBarVersion,'1.1.0');
 const html=renderControlShell({variant:'media',placeholder:'Find a memory',view:'strip',viewOptions:[{value:'grid',label:'Grid view',icon:'projects'},{value:'strip',label:'Strip view',icon:'list'}],filterContent:'<p>Media filters</p>',organizeContent:'<button>Add a photo</button>'});
 assert.match(html,/Find a memory/);assert.match(html,/Media filters/);assert.match(html,/Add a photo/);assert.match(html,/data-view="strip"[^>]+aria-pressed="true"/);assert.doesNotMatch(html,/find work|mark reviewed|data-bulk/);
 assert.match(renderControlShell({variant:'files'}),/find files/);
});
test('generic choice primitive escapes data and shares the same layout contract',()=>{
 const html=renderControlChoiceGroup({key:'year',label:'Reunion year',value:'2026',options:[{value:'2026',label:'2026'},{value:'all',label:'All <years>'}]});
 assert.match(html,/work-control-choices/);assert.match(html,/All &lt;years&gt;/);assert.match(html,/data-value="2026"[^>]+aria-checked="true"/);
});
test('expanded panel stylesheet does not override the existing outer shell',()=>{
 const css=fs.readFileSync(new URL('../packages/shared-ui/work-controls.css',import.meta.url),'utf8');
 for(const selector of ['.work-control-summary{','.work-search-compact{','.work-search-compact input{','.work-view-switch{','.work-control-pair{','.work-control-menu>summary{'])assert.ok(!css.includes(selector),selector);
});
