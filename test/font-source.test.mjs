import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
test('canonical Momo font is a valid whitespace-free embedded TrueType URL',()=>{
 const css=fs.readFileSync(new URL('../packages/shared-ui/momo.css',import.meta.url),'utf8');
 const match=css.match(/url\("data:font\/ttf;base64,([A-Za-z0-9+/=]+)"\) format\("truetype"\)/);
 assert.ok(match,'quoted unbroken data URL uses the real font format');
 const bytes=Buffer.from(match[1],'base64');assert.equal(bytes.subarray(0,4).toString('hex'),'00010000');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'f10dcc94ccc58c6a1c538d18f53008ac7d02a9e1e54b6b7cfd219a01d56ec0d3');
 assert.match(css,/SIL OPEN FONT LICENSE/i);
});
