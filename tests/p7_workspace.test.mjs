import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDocument} from '../app/core.mjs';
import {FURNITURE,putFurniture,linkFurniture} from '../app/floorplan.mjs';
import {normalizeCatalogText,matchesFurniture} from '../app/catalog-filter.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('P7: six independent tabs are wired to single workspace and preserved modes',()=>{
 const text=read('app/environments-ui.mjs');
 for(const id of ['hybrid-construct','bo-workflow-mount','bo-workflow-floor','bo-workflow-service','hybrid-simulate','bo-workflow-analyze'])
  assert.ok(text.includes('id="'+id+'"'),id);
 assert.match(text,/data-bo-stage="floor2d"/);
 assert.match(text,/Abrir/);
 assert.doesNotMatch(text,/>1 Planejar</);
 const renderer=read('app/simulation-ui.mjs');
 assert.match(renderer,/installP7SimulationLayout/);
 assert.match(renderer,/p7-section/);
 assert.match(renderer,/p7\.renderCharts/);
});
test('P7: 41 catalog items and five clearly marked illustrative figures',()=>{
 assert.equal(Object.keys(FURNITURE).length,41);
 const people=Object.entries(FURNITURE).filter(([,x])=>x.visualOnly);
 assert.equal(people.length,5);
 assert.ok(people.every(([,x])=>x.category==='Pessoas'));
 assert.ok(FURNITURE.clinic_desk&&FURNITURE.medical_cart&&FURNITURE.counter_l);
});
test('P7: accents, synonyms, and categories combine using AND',()=>{
 assert.equal(normalizeCatalogText('  RECEPÇÃO  '),'recepcao');
 assert.equal(matchesFurniture(FURNITURE.sofa_large,'sofa','Espera'),true);
 assert.equal(matchesFurniture(FURNITURE.counter_l,'recepcao','Recepção'),true);
 assert.equal(matchesFurniture(FURNITURE.counter_l,'recepcao','Clínica'),false);
 assert.equal(matchesFurniture(FURNITURE.clinic_desk,'consultorio','Clínica'),true);
 assert.equal(matchesFurniture(FURNITURE.person_professional,'psicologo','Pessoas'),true);
 assert.equal(matchesFurniture(FURNITURE.person_professional,'banco','Pessoas'),false);
 assert.equal(matchesFurniture(FURNITURE.counter,'',''),true);
});
test('P7: static people cannot become service activities or calculated client events',()=>{
 const doc=createDocument('Sala ilustrativa');
 doc.environments=[{id:'room-p7',name:'Sala de teste'}];
 const obj=putFurniture(doc,{roomId:'room-p7',kind:'person_client_standing',x:2,y:2});
 assert.equal(obj.nodeId,'');
 doc.nodes.push({id:'task-p7',title:'Acolher cliente',environmentId:'room-p7',type:'activity'});
 assert.throws(()=>linkFurniture(doc,obj.id,'task-p7'),/ilustrativas/);
 assert.throws(()=>putFurniture(doc,{roomId:'room-p7',kind:'person_professional',x:4,y:4,nodeId:'task-p7'}),/ilustrativa/);
});
test('P7: print/export actions survive simulation/analysis DOM partition',()=>{
 const source=read('app/p7-simulation-layout.mjs');
 for(const id of ['sim-back','sim-export','sim-floor-card','sim-playbar','p7-analysis','p7-runtime','p7-analysis-charts'])
  assert.ok(source.includes(id),id);
 assert.match(source,/exportTools/);
 assert.match(source,/renderCharts\(result\)/);
 const files=JSON.parse(read('app/css-manifest.json'));
 assert.equal(files.at(-1),'p7-workspace.css');
});
