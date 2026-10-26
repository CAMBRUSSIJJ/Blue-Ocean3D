import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDocument} from '../app/core.mjs';
import {moveRoom,roomSpot,siteReport} from '../app/site-overview.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('P7.1: map is enhanced rather than replaced and old project data remains canonical',()=>{
 const source=read('app/site-overview.mjs');
 assert.match(source,/installP71Overview/);
 assert.match(source,/p71\.enhance\(\)/);
 assert.match(source,/STEP\*p71\.state\.zoom/);
 assert.match(read('app/environments-ui.mjs'),/p71-room-selected/);
 assert.match(read('app/environments-ui.mjs'),/p71-dock-actions/);
 assert.match(read('app/environments-ui.mjs'),/p71-plan-inspector/);
 assert.match(read('app/p71-overview.mjs'),/data-p71-zoom/);
 assert.match(read('app/p71-overview.mjs'),/data-site-inspect-route/);
 assert.match(read('app/p71-overview.mjs'),/event\.shiftKey\?5:1/);
 assert.match(read('app/p71-overview.mjs'),/aria-label/);
});
test('P7.1: physical map positions respect overlap and do not mutate service graph',()=>{
 const doc=createDocument('Clínica');
 doc.environments=[{id:'a',name:'A'},{id:'b',name:'B'}];
 const positions=[roomSpot(doc,'a'),roomSpot(doc,'b')];
 const before=JSON.stringify({nodes:doc.nodes,edges:doc.edges});
 assert.throws(()=>moveRoom(doc,'b',positions[0].x,positions[0].y),/ocupar o mesmo espaço/);
 assert.deepEqual([roomSpot(doc,'a'),roomSpot(doc,'b')],positions);
 assert.equal(JSON.stringify({nodes:doc.nodes,edges:doc.edges}),before);
});
test('P7.1: styled overview has valid contrast targets and does not overlay reopen controls',()=>{
 const css=read('app/p71-ux.css');
 assert.match(css,/\.p71-dock-actions/);
 assert.match(css,/position:static!important/);
 assert.match(css,/\.p71-route-choice/);
 assert.match(css,/\.site-scroll/);
 assert.match(css,/\.p71-plan-inspector/);
 assert.match(css,/\.p71-zoom-controls/);
 const manifest=JSON.parse(read('app/css-manifest.json'));
 assert.equal(manifest.at(-1),'p71-ux.css');
});
