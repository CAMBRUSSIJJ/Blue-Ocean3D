import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
 .map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
const lum=hex=>rgb(hex).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
test('light design system is the last reproducible CSS source',()=>{
 const files=JSON.parse(read('app/css-manifest.json'));
 assert.equal(files.at(-1),'blue-ocean-light.css');
 const expected=['/* Service Builder v2.3.2 | generated file; edit individual CSS source files. */',
  ...files.map(f=>'\n/* SOURCE: '+f+' */\n'+read('app/'+f))].join('\n')+'\n';
 assert.equal(read('app/styles-bundle.css'),expected);
});
test('brand blue/navy text contrast on white meets WCAG AA for normal text',()=>{
 for(const color of ['#155eef','#102b49','#61758f']){
  assert.ok(contrast(color,'#ffffff')>=4.5,color+' contrast on white');
 }
});
test('no other document data, service edge or simulation engine is replaced by the theme',()=>{
 const env=read('app/environments-ui.mjs'),scene=read('app/room3d.mjs');
 assert.match(env,/document\.body\.classList\.add\('bo-ocean'\)/);
 assert.match(env,/initWorkspaceControls\(\{shell,main,left,right\}\)/);
 assert.match(env,/bo-toolbar-more/);
 assert.match(env,/bo-catalog-tool/);
 assert.match(env,/bo-inspector-tool/);
 assert.match(env,/setCollapsed\('right',false\)/);
 assert.match(env,/dataset\.currentDisplay=ui\.display/);
 assert.match(scene,/document\.body\.classList\.contains\('bo-ocean'\)/);
 assert.match(read('app/blue-ocean-light.css'),/--bo-blue:#155eef/);
 assert.match(read('app/blue-ocean-light.css'),/prefers-reduced-motion:reduce/);
});
