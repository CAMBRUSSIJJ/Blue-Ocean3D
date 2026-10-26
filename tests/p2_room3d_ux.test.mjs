import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('P2: 3D resize grip is only drawn on hover or active drag',()=>{
 const source=code('app/room3d.mjs');
 assert.match(source,/hoveredId===selected\.id\|\|pointer\.down\?\.resizeId===selected\.id/);
 assert.match(source,/hoveredId=null/);
 assert.match(source,/h\.resizeId\?'nwse-resize'/);
 assert.match(source,/result\.valid\?'#168db8':'#df5561'/);
});

test('P2: keyboard resizing uses canonical furniture and collision validation',()=>{
 const source=code('app/room3d.mjs');
 assert.match(source,/if\(e\.shiftKey\)\{/);
 assert.match(source,/resizeFurniture\(d,o\.id,nextW,nextH\)/);
 assert.match(source,/moveFurnitureGroup\(d,ids,\.\.\.nudge\)/);
 assert.match(source,/if\(structureMode\)toggleStructure\(structureMode\)/);
 assert.match(source,/if\(key==='d'&&e\.shiftKey&&getSelection\(\)\)/);
});

test('P2: accessible camera focus and discoverable shortcuts',()=>{
 const html=code('app/index.html');
 assert.match(html,/data-room3d-control="focus-selected"/);
 assert.match(html,/id="room3d-quick-help"/);
 assert.match(html,/aria-expanded="false" aria-controls="room3d-quick-help"/);
 assert.match(html,/id="room3d-object-info"[^>]+role="status"/);
 const src=code('app/room3d.mjs');
 assert.match(src,/view\.targetX=o\.x\+w\/2/);
 assert.match(src,/view\.targetZ=o\.y\+d\/2/);
});

test('P2: complete CSS bundle remains reproducible',()=>{
 const manifest=JSON.parse(code('app/css-manifest.json'));
 assert.ok(manifest.includes('room3d-ux.css'));
 assert.ok(manifest.indexOf('room3d-ux.css')>manifest.indexOf('v27.css'));
 const expected=['/* Service Builder v2.3.2 | generated file; edit individual CSS source files. */',
  ...manifest.map(file=>'\n/* SOURCE: '+file+' */\n'+code('app/'+file))].join('\n')+'\n';
 assert.equal(code('app/styles-bundle.css'),expected);
});
