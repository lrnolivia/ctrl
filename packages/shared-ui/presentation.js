import { glyph } from './glyphs.js';
import {bindPwa} from './pwa.js';
// Keep independent device preferences; resizing never writes a new choice.
const defaults={desktop:'rail',nav:'bottom',overview:'compact',brand:'compact',richness:'simple',motion:'full'};
const choices={desktop:['rail','bottom'],nav:['sidebar','bottom'],overview:['compact'],brand:['compact','roomy'],richness:['simple','rich'],motion:['full','calm']};
const optionRow=(name,title,options)=>`<fieldset class="presentation-choice"><legend>${title}</legend><div class="presentation-options">${options.map(([value,label])=>`<label><input type="radio" name="${name}" value="${value}"><span>${label}</span></label>`).join('')}</div></fieldset>`;
export function presentationMenu(){
 return `<details class="presentation-menu"><summary aria-label="Settings" title="Settings">${glyph('settings')}</summary><div class="presentation-panel" popover="manual"><strong>settings</strong><p>Saved in this browser</p>${optionRow('nav','Mobile navigation',[['bottom','Bottom bar'],['sidebar','Sidebar drawer']])}${optionRow('desktop','Desktop navigation',[['rail','Sidebar'],['bottom','Bottom bar']])}<fieldset><legend>Appearance</legend><button id="theme-toggle" class="utility-button" type="button"><span class="utility-icon" aria-hidden="true">${glyph('sun')}</span><span class="utility-label">Light mode</span></button></fieldset>${optionRow('motion','Motion',[['full','Standard'],['calm','Reduced']])}<p>Your system's reduced-motion preference is always respected.</p><fieldset><legend>App</legend><button type="button" data-pwa-install>Install ctrl</button><button type="button" data-pwa-update hidden>Update available</button><p data-pwa-guidance hidden></p></fieldset><button type="button" data-presentation-reset>Reset browser preferences</button></div></details>`;
}
export function normalizePresentation(saved = {}) {
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, key==='nav'&&saved?.nav==='top'?'sidebar':choices[key].includes(saved?.[key]) ? saved[key] : value]));
}
export function bindPresentation() {
  const menu = document.querySelector('.presentation-menu');
  if (!menu) return () => {};
  const stopPwa=bindPwa();
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('relay-presentation') || '{}'); } catch {}
  let prefs = normalizePresentation(saved);
  const header = document.querySelector('.operator-topbar');
  const nav = document.querySelector('.operator-nav');
  const panel=menu.querySelector('.presentation-panel');
  const brand=document.querySelector('.operator-brand'),home=nav?.parentNode,marker=document.createComment('navigation home');if(nav)home.insertBefore(marker,nav);
  const drawer=document.createElement('dialog');drawer.className='navigation-drawer';drawer.setAttribute('aria-labelledby','navigation-drawer-title');drawer.innerHTML=`<header><h2 id="navigation-drawer-title">ctrl navigation</h2><button type="button" aria-label="close navigation">${glyph('close')}</button></header>`;document.body.append(drawer);
  const closeDrawer=()=>{if(drawer.open)drawer.close();brand?.setAttribute('aria-expanded','false');brand?.focus();};
  drawer.querySelector('button').addEventListener('click',closeDrawer);drawer.addEventListener('cancel',event=>{event.preventDefault();closeDrawer();});
  drawer.addEventListener('click',event=>{if(event.target===drawer){const bounds=drawer.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeDrawer();}else if(event.target.closest('a,[data-relay-open]'))closeDrawer();});
  const openDrawer=event=>{if(innerWidth<=900&&prefs.nav==='sidebar'&&event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();drawer.showModal();brand.setAttribute('aria-expanded','true');}};brand?.addEventListener('click',openDrawer);
  const placeNav=()=>{const sidebar=innerWidth<=900&&prefs.nav==='sidebar';if(sidebar){if(nav?.parentNode!==drawer)drawer.append(nav);brand?.setAttribute('aria-label','open ctrl navigation');brand?.setAttribute('aria-haspopup','dialog');brand?.setAttribute('aria-expanded',String(drawer.open));}else{if(drawer.open)closeDrawer();if(nav&&nav.parentNode!==home)marker.after(nav);brand?.removeAttribute('aria-haspopup');brand?.removeAttribute('aria-expanded');brand?.removeAttribute('aria-label');}};
  const positionPanel=()=>{
    if(!menu.open){if(panel.matches(':popover-open'))panel.hidePopover();return;}
    if(!panel.matches(':popover-open'))panel.showPopover();
    const anchor=menu.querySelector('summary').getBoundingClientRect();
    panel.style.width=Math.min(360,innerWidth-32)+'px';panel.style.maxHeight=(innerHeight-32)+'px';
    panel.style.position='fixed';panel.style.margin='0';panel.style.right='auto';panel.style.bottom='auto';
    const rect=panel.getBoundingClientRect();
    const left=anchor.right+12+rect.width<=innerWidth-16?anchor.right+12:anchor.left-rect.width-12;
    const top=anchor.top>innerHeight/2?anchor.bottom-rect.height:anchor.top;
    panel.style.left=Math.max(16,Math.min(left,innerWidth-rect.width-16))+'px';
    panel.style.top=Math.max(16,Math.min(top,innerHeight-rect.height-16))+'px';
  };
  menu.addEventListener('toggle',positionPanel,true);
  const clearance = () => {
    placeNav();
    const context=document.querySelector('.workspace-context');
    if(context){const bounds=context.getBoundingClientRect();document.documentElement.style.setProperty('--ctrl-content-left',bounds.left+'px');document.documentElement.style.setProperty('--ctrl-content-width',bounds.width+'px');}
    positionPanel();
    const desktop = matchMedia('(min-width: 901px)').matches;
    const bar = desktop ? prefs.desktop === 'bottom' ? header : null : prefs.nav === 'bottom' ? nav : null;
    if(nav){const dock=nav.getBoundingClientRect();document.documentElement.style.setProperty('--ctrl-dock-right',(innerWidth-dock.right)+'px');document.documentElement.style.setProperty('--ctrl-dock-bottom',(innerHeight-dock.bottom)+'px');document.documentElement.style.setProperty('--ctrl-dock-height',dock.height+'px');}
    const bottom = bar && getComputedStyle(bar).position === 'fixed' ? Math.ceil(bar.getBoundingClientRect().height + (parseFloat(getComputedStyle(bar).bottom) || 0) + 16) : 0;
    document.documentElement.style.setProperty('--floating-bar-clearance', bottom + 'px');
  };
  const observer = new ResizeObserver(clearance);
  if (header) observer.observe(header);
  if (nav) observer.observe(nav);
  const workspace=document.querySelector('.workspace-context');if(workspace)observer.observe(workspace);
  window.addEventListener('resize', clearance);
  window.visualViewport?.addEventListener('resize',clearance);window.visualViewport?.addEventListener('scroll',clearance);
  const apply = () => {
    for (const [key, value] of Object.entries(prefs)) {
      document.documentElement.dataset['presentation' + key[0].toUpperCase() + key.slice(1)] = value;
      for (const control of menu.querySelectorAll(`[name="${key}"]`)) control.checked = control.value === value;
    }
    clearance();
  };
  const change = event => {
    const { name, value } = event.target;
    if (choices[name]?.includes(value)) prefs[name] = value;
    else return;
    apply();
    try { localStorage.setItem('relay-presentation', JSON.stringify(prefs)); } catch {}
  };
  const reset = () => { prefs = { ...defaults }; apply(); try { localStorage.removeItem('relay-presentation'); } catch {} };
  const escape = event => { if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } };
  const outside = event => { if (!menu.contains(event.target)) menu.open = false; };
  document.addEventListener('pointerdown', outside);
  apply(); menu.addEventListener('change', change); menu.querySelector('[data-presentation-reset]').addEventListener('click', reset); document.addEventListener('keydown', escape);
  return () => { stopPwa();window.visualViewport?.removeEventListener('resize',clearance);window.visualViewport?.removeEventListener('scroll',clearance);if(nav&&nav.parentNode!==home)marker.after(nav);marker.remove();drawer.remove();brand?.removeEventListener('click',openDrawer);menu.removeEventListener('toggle',positionPanel,true);if(panel.matches(':popover-open'))panel.hidePopover();observer.disconnect(); window.removeEventListener('resize', clearance); document.removeEventListener('pointerdown', outside); menu.removeEventListener('change', change); menu.querySelector('[data-presentation-reset]').removeEventListener('click', reset); document.removeEventListener('keydown', escape); };
}

// Discrete units, never a fabricated timeline, percentage or trend.
export function countVisual(value, total = null, totalLabel = 'items') {
  if (/^\d+$/.test(String(value)) && Number.isFinite(total) && total > 0 && Number(value) <= total) {
    const count=Number(value), fraction=count/total;
    const label=String(totalLabel).replace(/[&<>"']/g, '');
    return `<span class="signal-data-visual signal-ratio"><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="ratio-track" cx="20" cy="20" r="16"/><circle class="ratio-value" cx="20" cy="20" r="16" pathLength="100" stroke-dasharray="${fraction*100} 100"/></svg><span>${count} of ${total} ${label}</span></span>`;
  }
  if (!/^\d+\+?$/.test(String(value))) return '';
  const count = Number.parseInt(value, 10);
  return '<span class="signal-data-visual" aria-hidden="true" title="One marker per item; up to twelve shown">' + Array.from({length: Math.min(count, 12)}, (_, i) => '<i style="--unit:' + i + '"></i>').join('') + '</span>';
}

