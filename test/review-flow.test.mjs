import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {previewTone} from '../packages/shared-ui/preview-image.js';

test('preview control selects contrast from screenshot luminance',()=>{assert.equal(previewTone(255,255,255),'light');assert.equal(previewTone(10,10,10),'dark');});
const source=(await readFile(new URL('../packages/shared-ui/feedback-form.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('export function mountFeedbackForm','function mountFeedbackForm')+'\nmountFeedbackForm';
class Element{constructor(){this.value='';this.disabled=false;this.checked=false;this.hidden=true;this.listeners={};this.attrs={};this.textContent='';}addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}setAttribute(k,v){this.attrs[k]=v}querySelector(){return this.pre??=new Element()}async emit(type){for(const fn of this.listeners[type]||[])await fn({preventDefault(){}})}}
async function setup(previous){
 const elements={form:new Element(),textarea:new Element(),'[role=status]':new Element(),details:new Element()},button=new Element(),good=new Element(),changes=new Element();good.value='good';changes.value='changes';
 const root={innerHTML:'',querySelector:key=>elements[key],querySelectorAll:key=>key==='button'?[button]:[good,changes]};
 const memory=new Map(previous||[]),sent=[],sessionStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const mount=vm.runInNewContext(source,{AbortController,sessionStorage,glyph:()=>'<svg></svg>',feedbackApi:()=>{throw Error('unexpected network')},sendFeedback:async args=>{sent.push(args.text);return {receipt:{report_id:'fixture',status:{queued:true}},label:'saved in Relay'}}});
 const context={project:'fixture',assignment:'work',commit_sha:'abc',owner:'owner',branch:'fixture/branch'};
 mount(root,{evidence_id:'capture',context},{metadata:{evidence:{evidence_id:'capture',context},feedback_binding:{available:true,args:{project:'fixture',assignment:'work',artifact:{commit_sha:'abc'},expected_owner:'owner',expected_branch:'fixture/branch'}}}});
 await new Promise(resolve=>setImmediate(resolve));return {root,elements,button,good,changes,sent,memory};
}
test('decision is selected without stuffing text and one submit sends it',async()=>{const h=await setup();assert.equal(h.button.disabled,true);await h.good.emit('change');assert.equal(h.elements.textarea.value,'');assert.equal(h.button.disabled,false);await h.elements.form.emit('submit');assert.deepEqual(h.sent,['Looks good']);});
test('notes and decision form one review; switching decisions never duplicates prefixes',async()=>{const h=await setup();await h.good.emit('change');await h.changes.emit('change');h.elements.textarea.value='Reduce the spacing';await h.elements.textarea.emit('input');await h.elements.form.emit('submit');assert.deepEqual(h.sent,['Needs changes\n\nReduce the spacing']);});
test('plain question still works without a decision',async()=>{const h=await setup();h.elements.textarea.value='Which screen is this?';await h.elements.textarea.emit('input');await h.elements.form.emit('submit');assert.deepEqual(h.sent,['Which screen is this?']);});
test('unconfirmed legacy reply is restored verbatim for idempotent retry',async()=>{const text='  Earlier exact text  ';const h=await setup([['ctrl.reply.v2.capture',JSON.stringify({args:{original_text:text}})],['ctrl.reply.v2.capture.decision','good']]);assert.equal(h.elements.textarea.value,text);assert.equal(h.good.checked,false);await h.elements.form.emit('submit');assert.deepEqual(h.sent,[text]);});
