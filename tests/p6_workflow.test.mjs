import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('P6: plan-first service stages are interactive, preserve all original scene modes',()=>{
 const ui=read('app/environments-ui.mjs'),markup=read('app/index.html');
 assert.match(ui,/display:'overview'/);
 for(const stage of ['plan','mount','service','scenario','analyze'])
  assert.match(ui,new RegExp('data-bo-stage="'+stage+'"'));
 for(const id of ['hybrid-construct','bo-workflow-mount','bo-workflow-service','hybrid-simulate','bo-workflow-analyze'])
  assert.ok(ui.includes('id="'+id+'"'),id);
 for(const mode of ['overview','three','visual','cards'])assert.ok(markup.includes('data-room-display="'+mode+'"'));
 assert.match(ui,/dataset\.workflowStep=step/);
 assert.match(ui,/bo-workflow-navigate/);
});
test('P6: first physical map creates rooms without lost links',()=>{
 const source=read('app/site-overview.mjs');
 assert.match(source,/onCreate/);
 assert.match(source,/data-site-create-room/);
 assert.match(source,/Comece pelo desenho do serviço/);
 assert.match(source,/connectServiceCorridors/);
 assert.match(source,/setCorridor/);
 assert.match(source,/moveRoom/);
});
test('P6: restore previously-hidden operation links and object and camera actions',()=>{
 const ui=read('app/environments-ui.mjs'),css=read('app/workflow-first.css'),html=read('app/index.html');
 for(const id of ['floor-auto','floor-add-task','floor-clear-selection'])assert.ok(ui.includes(id),id);
 assert.match(ui,/bo-object-selected/);
 assert.match(ui,/bo-camera-extra-open/);
 assert.match(css,/\.room-workflow-drawer\{/);
 assert.match(css,/\.room-connections\{/);
 assert.match(css,/\.room3d-buttons button\[data-room3d-control="rotate-selected"\]/);
 assert.match(css,/\.room3d-buttons button\[data-room3d-control="duplicate-selected"\]/);
 for(const mode of ['rotate-selected','duplicate-selected','left','right'])assert.ok(html.includes('data-room3d-control="'+mode+'"'));
});
test('P6: new 3D daylight floor checks Blue Ocean theme instead of legacy dark-mode class',()=>{
 const room=read('app/room3d.mjs');
 assert.match(room,/const ocean=document\.body\.classList\.contains\('bo-ocean'\)/);
 assert.match(room,/&&!ocean/);
 assert.match(room,/#f6f9fe/);
 assert.match(room,/0xe2ebf6/);
 assert.match(room,/0xe0e9f5/);
 const files=JSON.parse(read('app/css-manifest.json'));
 assert.equal(files.at(-1),'p71-ux.css');
});
