import {springTo} from './field-springs.js';
export function bindMobileNavLabels(){
 const tip=document.createElement('div');tip.className='mobile-nav-label';tip.setAttribute('role','tooltip');tip.setAttribute('aria-hidden','true');tip.innerHTML='<strong></strong>';document.body.append(tip);
 let active=null,origin=null,exitTimer=null,pressed=null,cancelled=false;
 const mobile=()=>matchMedia('(max-width:900px)').matches&&document.documentElement.dataset.presentationNav==='bottom';
 const target=event=>event.target instanceof Element?event.target.closest('.operator-nav [data-feature]'):null;
 const hide=()=>{active=null;origin=null;tip.dataset.open='false';clearTimeout(exitTimer);exitTimer=setTimeout(()=>{tip.hidden=true;},160);};
 const show=element=>{if(!mobile()||!element)return;const label=element.querySelector('.nav-copy strong')?.textContent?.trim();if(!label)return;clearTimeout(exitTimer);active=element;tip.hidden=false;tip.querySelector('strong').textContent=label;tip.style.setProperty('--label-accent',getComputedStyle(element).getPropertyValue('--feature-accent')||'var(--ctrl-accent)');const rect=element.getBoundingClientRect();tip.style.left=Math.max(12,Math.min(rect.left+rect.width/2-tip.offsetWidth/2,innerWidth-tip.offsetWidth-12))+'px';tip.style.top=Math.max(12,rect.top-tip.offsetHeight-12)+'px';tip.dataset.open='true';springTo(tip,{y:0,scale:1},{kind:'panel',profile:{stiffness:520,damping:24,mass:.6},from:{y:14,scale:.88}});};
 const down=event=>{const element=target(event);if(!element||!mobile())return;pressed=element;cancelled=false;origin={x:event.clientX,y:event.clientY};show(element);};
 const move=event=>{if(origin&&Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>12){cancelled=true;hide();}};
 const click=event=>{if(cancelled&&target(event)===pressed){event.preventDefault();event.stopPropagation();}cancelled=false;pressed=null;};
 const focus=event=>show(target(event));
 document.addEventListener('click',click,true);document.addEventListener('pointerdown',down);document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',hide);document.addEventListener('pointercancel',hide);document.addEventListener('focusin',focus);document.addEventListener('focusout',hide);window.addEventListener('hashchange',hide);window.addEventListener('popstate',hide);window.addEventListener('resize',hide);window.addEventListener('scroll',hide,{passive:true});
 tip.hidden=true;
 return()=>{clearTimeout(exitTimer);tip.remove();document.removeEventListener('click',click,true);document.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',hide);document.removeEventListener('pointercancel',hide);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',hide);window.removeEventListener('hashchange',hide);window.removeEventListener('popstate',hide);window.removeEventListener('resize',hide);window.removeEventListener('scroll',hide);};
}
