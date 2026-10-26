import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const style=readFileSync(new URL('../app/v17.css',import.meta.url),'utf8');
const ui=readFileSync(new URL('../app/environments-ui.mjs',import.meta.url),'utf8');
test('v1.7: construção usa uma área ampla sem coluna fixa de catálogo',()=>{
 assert.match(style,/\.rooms-catalog\{display:none!important\}/);
 assert.match(style,/\.floor-editor-content\{[\s\S]*?flex:1;min-height:0!important;height:auto!important/);
 assert.match(style,/\.room-studio-center\{[\s\S]*?position:absolute;inset:0/);
});
test('v1.7: as salas continuam em abas internas e novo ambiente tem diálogo próprio',()=>{
 assert.match(html,/id="room-tab-nav"/);
 assert.match(html,/id="room-create-dialog"/);
 assert.match(ui,/#room-tab-add'\)\)openCreateDialog/);
 assert.match(ui,/createRoom\(d,\{name\}\)/);
});
test('v1.7: painéis móveis e propriedades não redimensionam a planta',()=>{
 assert.match(style,/\.floor-palette\{[\s\S]*?position:absolute/);
 assert.match(style,/\.floor-editor-inspector\{[\s\S]*?position:absolute/);
 assert.match(html,/id="room-toggle-library"/);
 assert.match(html,/id="room-toggle-object-inspector"/);
});
test('v1.7: simulação e duas áreas principais continuam disponíveis',()=>{
 assert.equal((html.match(/class="rail-btn/g)||[]).length,2);
 assert.match(html,/id="simulation-view"/);
 assert.match(html,/id="room-3d-stage"/);
});
