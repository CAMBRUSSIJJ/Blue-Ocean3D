import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('v2.4 identifica o layout híbrido e mantém as duas áreas do produto',()=>{
 const html=text('app/index.html'),pkg=JSON.parse(text('package.json'));
 assert.equal(pkg.version,'2.6.0');
 assert.match(html,/BUILDER<br>2\.6/);
 assert.equal((html.match(/class="rail-btn/g)||[]).length,2);
 assert.match(html,/styles-bundle\.css/);
});
test('v2.4 monta os docks com componentes canônicos, sem novos editores paralelos',()=>{
 const source=text('app/environments-ui.mjs');
 assert.match(source,/installHybridLayout\(root\)/);
 assert.match(source,/left\.appendChild\(document\.querySelector\('#room-tab-nav'\)\)/);
 assert.match(source,/left\.appendChild\(document\.querySelector\('#room-furniture-palette'\)\)/);
 assert.match(source,/right\.appendChild\(document\.querySelector\('#floor-editor-inspector'\)\)/);
 assert.match(source,/right\.appendChild\(document\.querySelector\('#room-detail'\)\)/);
});
test('v2.4 jornada usa atividades reais e oferece acesso à edição',()=>{
 const s=text('app/environments-ui.mjs');
 assert.match(s,/function renderHybridJourney\(doc,selected\)/);
 assert.match(s,/doc\.nodes\.filter\(n=>n\.environmentId===room\.id\)/);
 assert.match(s,/data-hybrid-step/);
 assert.match(s,/openTask\(hybridStep\.dataset\.hybridStep\)/);
});
test('v2.4 CSS integra os ambientes e recolhe painéis no celular',()=>{
 const manifest=JSON.parse(text('app/css-manifest.json'));
 assert.ok(manifest.includes('v27.css'));
 assert.ok(manifest.indexOf('v27.css')>manifest.indexOf('v26.css'));
 const css=text('app/styles-bundle.css');
 assert.match(css,/SOURCE: v27\.css/);
 assert.match(css,/hybrid-mobile-left-open/);
 assert.match(css,/hybrid-mobile-right-open/);
 assert.match(css,/\.hybrid-journey/);
});
test('v2.4 mantém os botões da simulação vinculados às duas áreas reais',()=>{
 const src=text('app/environments-ui.mjs');
 assert.ok(src.includes('.rail-btn[data-view="simulation"]'));
 assert.ok(src.includes('.rail-btn[data-view="rooms"]'));
 assert.ok(src.includes('[data-room-display="overview"]'));
});
