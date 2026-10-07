import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureIcons,featureIcon,featureIconMarkup,canonicalFeature} from '../packages/shared-ui/feature-icons.js';
const assets=JSON.parse(fs.readFileSync(new URL('../apps/web/public/brand-assets.json',import.meta.url),'utf8'));
test('every feature resolves to existing canonical artwork, with verified aliases',()=>{
 for(const [name,entry] of Object.entries(featureIcons)){
  assert.match(entry.src,new RegExp('^/brand/'+name+'\\.png$'));assert.ok(assets[name]?.startsWith('data:image/png;base64,'),name);
  if(entry.compact)assert.ok(fs.existsSync(new URL('../apps/web/public'+entry.compact.replace('/brand-nav/','/brand-nav/'),import.meta.url)));
 }
 assert.equal(canonicalFeature('today'),'now');assert.equal(featureIcon('today'),'/brand/now.png');assert.equal(assets.today,assets.now);
});
test('unknown or hostile feature names never invent an icon or source URL',()=>{
 for(const name of ['unknown','__proto__','constructor','<script>','https://attacker.invalid/image']){assert.equal(featureIcon(name),null);assert.equal(featureIconMarkup(name),'');}
});
test('feature identity markup uses canonical images, never substitute glyphs',()=>{
 const html=featureIconMarkup('inspector');assert.match(html,/src="\/brand\/inspector.png"/);assert.match(html,/data-canonical-feature="inspector"/);assert.doesNotMatch(html,/<svg|glyph/);
 for(const feature of Object.keys(featureIcons))assert.match(featureIconMarkup(feature),/<img/);
});
test('all notification identities use the shared canonical registry',()=>{
 const source=fs.readFileSync(new URL('../packages/shared-ui/notifications.js',import.meta.url),'utf8');assert.match(source,/featureIconMarkup\(feature\)/);assert.doesNotMatch(source,/glyph\(feature ===/);
 const header=fs.readFileSync(new URL('../apps/web/src/components/FeatureHeader.tsx',import.meta.url),'utf8');assert.match(header,/featureIcon\(feature\)/);assert.doesNotMatch(header,/marks\[/);
});
