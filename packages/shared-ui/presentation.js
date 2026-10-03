import { glyph } from './glyphs.js';
// Presets are complete presentation settings; future themes can extend this registry.
const presets = { approved: { label: 'Approved · default', settings: { desktop: 'rail', nav: 'bottom', overview: 'compact', brand: 'compact', richness: 'simple', motion: 'full' } }, bottom: { label: 'Mobile bottom navigation', settings: { desktop: 'rail', nav: 'bottom', overview: 'compact', brand: 'compact', richness: 'simple', motion: 'full' } } };
presets.rich = { label: 'Rich telemetry', settings: { ...presets.approved.settings, richness: 'rich' } };
const defaults = presets.approved.settings;
presets['desktop-bottom'] = { label: 'Desktop branded bottom pill', settings: { ...defaults, desktop: 'bottom' } };
const choices = { desktop: ['rail', 'bottom'], nav: ['top', 'bottom'], overview: ['compact'], brand: ['compact', 'roomy'], richness: ['simple', 'rich'], motion: ['full', 'calm'] };
export function presentationMenu() {
  return `<details class="presentation-menu"><summary aria-label="Settings" title="Settings">${glyph('settings')}</summary><div class="presentation-panel" popover="manual"><strong>settings</strong><p>Only this browser · <span data-presentation-state>Approved</span></p><label>Presentation preset<select name="preset">${Object.entries(presets).map(([id,preset]) => `<option value="${id}">${preset.label}</option>`).join('')}<option value="custom" disabled>Custom</option></select></label><details class="presentation-customize"><summary>Customize</summary><fieldset><legend>Mobile</legend><label>Navigation<select name="nav"><option value="top">Top</option><option value="bottom">Bottom · default</option></select></label></fieldset><fieldset><legend>Desktop / tablet</legend><label>Desktop layout<select name="desktop"><option value="rail">Sidebar · default</option><option value="bottom">Branded bottom pill</option></select></label><label>Sidebar brand<select name="brand"><option value="compact">Small tile · default</option><option value="roomy">Roomier tile</option></select></label></fieldset><fieldset><legend>Telemetry / motion</legend><label>Data visuals<select name="richness"><option value="simple">Simple · default</option><option value="rich">Rich · labeled counts</option></select></label><label>Motion<select name="motion"><option value="full">Spring · default</option><option value="calm">Calm</option></select></label></fieldset></details><button type="button" data-presentation-reset>Reset presentation</button><div class="presentation-tools"><button id="theme-toggle" class="utility-button" type="button"><span class="utility-icon" aria-hidden="true">${glyph('sun')}</span><span class="utility-label">Light mode</span></button></div></div></details>`;
}
export function normalizePresentation(saved = {}) {
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, choices[key].includes(saved?.[key]) ? saved[key] : value]));
}
export function bindPresentation() {
  const menu = document.querySelector('.presentation-menu');
  if (!menu) return () => {};
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('relay-presentation') || '{}'); } catch {}
  let prefs = normalizePresentation(saved);
  try { localStorage.setItem('relay-presentation', JSON.stringify(prefs)); } catch {}
  const header = document.querySelector('.operator-topbar');
  const nav = document.querySelector('.operator-nav');
  const panel=menu.querySelector('.presentation-panel');
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
    const context=document.querySelector('.workspace-context');
    if(context){const bounds=context.getBoundingClientRect();document.documentElement.style.setProperty('--ctrl-content-left',bounds.left+'px');document.documentElement.style.setProperty('--ctrl-content-width',bounds.width+'px');}
    positionPanel();
    const desktop = matchMedia('(min-width: 901px)').matches;
    const bar = desktop ? prefs.desktop === 'bottom' ? header : null : prefs.nav === 'bottom' ? nav : null;
    const bottom = bar && getComputedStyle(bar).position === 'fixed' ? Math.ceil(bar.getBoundingClientRect().height + (parseFloat(getComputedStyle(bar).bottom) || 0) + 16) : 0;
    document.documentElement.style.setProperty('--floating-bar-clearance', bottom + 'px');
  };
  const observer = new ResizeObserver(clearance);
  if (header) observer.observe(header);
  if (nav) observer.observe(nav);
  const workspace=document.querySelector('.workspace-context');if(workspace)observer.observe(workspace);
  window.addEventListener('resize', clearance);
  const apply = () => {
    const preset = Object.entries(presets).find(([, preset]) => Object.keys(defaults).every(key => preset.settings[key] === prefs[key]));
    menu.querySelector('[name="preset"]').value = preset?.[0] || 'custom';
    menu.querySelector('[data-presentation-state]').textContent = preset?.[1].label || 'Custom';
    for (const [key, value] of Object.entries(prefs)) {
      document.documentElement.dataset['presentation' + key[0].toUpperCase() + key.slice(1)] = value;
      const control = menu.querySelector(`[name="${key}"]`);
      if (control) control.value = value;
    }
    clearance();
  };
  const change = event => {
    const { name, value } = event.target;
    if (name === 'preset' && presets[value]) prefs = { ...presets[value].settings };
    else if (choices[name]?.includes(value)) prefs[name] = value;
    else return;
    apply();
    try { localStorage.setItem('relay-presentation', JSON.stringify(prefs)); } catch {}
  };
  const reset = () => { prefs = { ...defaults }; apply(); try { localStorage.removeItem('relay-presentation'); } catch {} };
  const escape = event => { if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } };
  const outside = event => { if (!menu.contains(event.target)) menu.open = false; };
  document.addEventListener('pointerdown', outside);
  apply(); menu.addEventListener('change', change); menu.querySelector('[data-presentation-reset]').addEventListener('click', reset); document.addEventListener('keydown', escape);
  return () => { menu.removeEventListener('toggle',positionPanel,true);if(panel.matches(':popover-open'))panel.hidePopover();observer.disconnect(); window.removeEventListener('resize', clearance); document.removeEventListener('pointerdown', outside); menu.removeEventListener('change', change); menu.querySelector('[data-presentation-reset]').removeEventListener('click', reset); document.removeEventListener('keydown', escape); };
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

