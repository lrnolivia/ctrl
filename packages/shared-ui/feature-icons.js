/** Canonical feature artwork already authored and shipped by CTRL.
 * Feature identities never fall back to an invented semantic glyph.
 */
export const featureIcons=Object.freeze(Object.fromEntries([
 ['ctrl','ctrl',null],['relay','relay',null],['now','now','now'],
 ['runner','runner','runner'],['inspector','inspector','inspector'],['night-shift','night-shift','night-shift']
].map(([id,file,compact])=>[id,Object.freeze({id,src:'/brand/'+file+'.png',compact:compact?'/brand-nav/'+compact+'.svg':null})])));
export const featureLabels=Object.freeze({ctrl:'ctrl',relay:'Relay',now:'Now',today:'Now',runner:'Runner',inspector:'Inspector','night-shift':'Night Shift'});
export function canonicalFeature(value){return value==='today'?'now':Object.hasOwn(featureIcons,value)?value:null;}
export function featureIcon(value,{compact=false}={}){const id=canonicalFeature(value),entry=id&&featureIcons[id];return entry?(compact&&entry.compact?entry.compact:entry.src):null;}
export function featureIconMarkup(value,{compact=false}={}){const id=canonicalFeature(value),src=featureIcon(value,{compact});return src?'<img class="canonical-feature-icon" data-canonical-feature="'+id+'" src="'+src+'" alt="" aria-hidden="true" decoding="async">':'';}
