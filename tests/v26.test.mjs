import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=(file)=>readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
test('v2.3.2: uma folha carregada pelo navegador e fontes ordenadas',()=>{
 const html=app('index.html');
 assert.deepEqual([...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]),['./styles-bundle.css']);
 const manifest=JSON.parse(app('css-manifest.json'));
 assert.ok(manifest.indexOf('v27.css')>manifest.indexOf('v26.css'));
 assert.ok(manifest.indexOf('v27.css')<manifest.indexOf('ai.css'));
 assert.ok(manifest.length>=27);
 const bundle=app('styles-bundle.css');
 for(const name of manifest)assert.ok(bundle.includes(`SOURCE: ${name}`),name);
 assert.ok(bundle.includes('sim-spatial-help'));
});
test('v2.3.2: remoções e substituições sem confirm nativo',()=>{
 const src=app('app.mjs')+app('environments-ui.mjs');
 assert.doesNotMatch(src,/\b(?:window\.)?confirm\s*\(/);
 assert.ok((src.match(/await confirmAction\(/g)||[]).length>=7);
 assert.match(app('confirm-dialog.mjs'),/dialog\.showModal\(\)/);
 assert.match(app('confirm-dialog.mjs'),/previous\.focus/);
 assert.match(app('index.html'),/id="sb-confirm-dialog"/);
});
test('v2.3.2: navegação de abas com roving tabindex',()=>{
 assert.match(app('index.html'),/role="tablist" aria-label="Modo de visualização/);
 assert.match(app('environments-ui.mjs'),/function keyboardTabs/);
 assert.match(app('environments-ui.mjs'),/aria-selected/);
 assert.match(app('environments-ui.mjs'),/\.focus\(\)/);
});
test('v2.3.2: identificação e servidor em acordo',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(pkg.version,'2.6.0');
 assert.match(app('index.html'),/BUILDER<br>2\.6/);
 assert.match(readFileSync(new URL('../scripts/server.py',import.meta.url),'utf8'),/X-Service-Builder-Version/);
});
