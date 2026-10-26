import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoDocument} from '../app/core.mjs';
import {GRID,furnitureDimensions,putFurniture,rotateFurniture,resizeFurniture,validFurniture,linkFurniture} from '../app/floorplan.mjs';
import {moveFurnitureGroup,removeFurnitureGroup,duplicateFurniture,paintStructureLine} from '../app/studio-actions.mjs';
import {setEdge} from '../app/floorplan-navigation.mjs';
import {simulateService} from '../app/simulation.mjs';
import {placementFromPoint} from '../app/placement.mjs';
const setup=()=>{const doc=demoDocument();return {doc,room:doc.environments[0].id};};
test('v1.9: tamanho personalizado de móveis é salvo por célula e aparece no modelo canônico',()=>{
 const {doc,room}=setup(),o=putFurniture(doc,{roomId:room,kind:'desk',x:1,y:1});
 assert.deepEqual(furnitureDimensions(o),[2,2]);resizeFurniture(doc,o.id,4,2);
 assert.deepEqual(furnitureDimensions(o),[4,2]);assert.deepEqual(furnitureDimensions(JSON.parse(JSON.stringify(doc)).floorplan.objects[0]),[4,2]);
});
test('v1.9: impede dimensões fracionárias, grandes e inválidas sem mutar móvel',()=>{
 const {doc,room}=setup(),o=putFurniture(doc,{roomId:room,kind:'chair',x:1,y:1});
 const old=JSON.stringify(doc);
 for(const dims of [[1.5,2],[0,2],[13,2],[2,Infinity],[NaN,2]])assert.throws(()=>resizeFurniture(doc,o.id,...dims),/dimens|malha|largura/i);
 assert.equal(JSON.stringify(doc),old);
});
test('v1.9: redimensionar não pode sobrepor objetos, paredes ou exceder a sala',()=>{
 const {doc,room}=setup(),o=putFurniture(doc,{roomId:room,kind:'chair',x:0,y:0});
 putFurniture(doc,{roomId:room,kind:'chair',x:2,y:0});
 assert.throws(()=>resizeFurniture(doc,o.id,3,1),/sobrepõe/);
 setEdge(doc,room,'v',1,0,'wall');assert.throws(()=>resizeFurniture(doc,o.id,2,1),/parede|porta/);
 const near=putFurniture(doc,{roomId:room,kind:'chair',x:11,y:7});
 assert.throws(()=>resizeFurniture(doc,near.id,2,1),/limites/);
 assert.deepEqual(furnitureDimensions(o),[1,1]);
});
test('v1.9: rotação de tamanho personalizado troca largura por profundidade',()=>{
 const {doc,room}=setup(),o=putFurniture(doc,{roomId:room,kind:'bench',x:1,y:1});
 resizeFurniture(doc,o.id,4,2);rotateFurniture(doc,o.id);assert.deepEqual(furnitureDimensions(o),[2,4]);
 rotateFurniture(doc,o.id);assert.deepEqual(furnitureDimensions(o),[4,2]);
});
test('v1.9: duplicação preserva dimensões mas não repete atividade vinculada',()=>{
 const {doc,room}=setup(),o=putFurniture(doc,{roomId:room,kind:'desk',x:0,y:0});
 resizeFurniture(doc,o.id,3,2);const task=doc.nodes.find(n=>n.environmentId===room);linkFurniture(doc,o.id,task.id);
 const copy=duplicateFurniture(doc,o.id);
 assert.deepEqual(furnitureDimensions(copy),[3,2]);assert.equal(copy.nodeId,'');
});
test('v1.9: mover grupo valida atomicamente a colisão externa',()=>{
 const {doc,room}=setup(),a=putFurniture(doc,{roomId:room,kind:'chair',x:1,y:1}),b=putFurniture(doc,{roomId:room,kind:'chair',x:2,y:1});
 moveFurnitureGroup(doc,[a.id,b.id],1,0);assert.deepEqual([a.x,b.x],[2,3]);
 putFurniture(doc,{roomId:room,kind:'chair',x:4,y:1});
 assert.throws(()=>moveFurnitureGroup(doc,[a.id,b.id],1,0),/sobrepõe/);
 assert.deepEqual([a.x,b.x],[2,3]);
});
test('v1.9: mover grupo recusa parede e borda sem aplicar movimento parcial',()=>{
 const {doc,room}=setup(),a=putFurniture(doc,{roomId:room,kind:'chair',x:0,y:1}),b=putFurniture(doc,{roomId:room,kind:'chair',x:1,y:1});
 assert.throws(()=>moveFurnitureGroup(doc,[a.id,b.id],-1,0),/limites/);assert.equal(a.x,0);
 const c=putFurniture(doc,{roomId:room,kind:'chair',x:3,y:1});resizeFurniture(doc,c.id,2,1);setEdge(doc,room,'v',5,1,'wall');
 assert.throws(()=>moveFurnitureGroup(doc,[b.id,c.id],1,0),/parede|porta/);assert.deepEqual([b.x,c.x],[1,3]);
});
test('v1.9: grupo admite ids repetidos e remove apenas objetos selecionados',()=>{
 const {doc,room}=setup(),a=putFurniture(doc,{roomId:room,kind:'chair',x:0,y:0}),b=putFurniture(doc,{roomId:room,kind:'chair',x:1,y:0});
 moveFurnitureGroup(doc,[a.id,a.id],1,1);assert.deepEqual([a.x,a.y],[1,1]);
 assert.equal(removeFurnitureGroup(doc,[a.id,a.id]),1);assert.deepEqual(validFurniture(doc).map(o=>o.id),[b.id]);
});
test('v1.9: movimentação visual existente respeita tamanho personalizado',()=>{
 const {doc,room}=setup(),o=putFurniture(doc,{roomId:room,kind:'desk',x:3,y:3});resizeFurniture(doc,o.id,4,3);
 const result=placementFromPoint(doc,{roomId:room,kind:o.kind,pointX:6,pointY:5,ignoreId:o.id});
 assert.deepEqual(furnitureDimensions(result.object),[4,3]);
});
test('v1.9: simulação não muda quando modificamos apenas tamanho e posições de móveis',()=>{
 const {doc,room}=setup(),before=simulateService(doc,{cases:6,arrivalInterval:8,teamCapacity:1});
 const a=putFurniture(doc,{roomId:room,kind:'chair',x:0,y:0});resizeFurniture(doc,a.id,2,2);
 const b=putFurniture(doc,{roomId:room,kind:'chair',x:4,y:0});moveFurnitureGroup(doc,[a.id,b.id],0,1);
 const after=simulateService(doc,{cases:6,arrivalInterval:8,teamCapacity:1});assert.deepEqual(after.events,before.events);assert.deepEqual(after.metrics,before.metrics);
});
test('v1.9: duas abas e novas ferramentas são renderizadas no código',()=>{
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');const ui=readFileSync(new URL('../app/floorplan-ui.mjs',import.meta.url),'utf8');
 assert.equal((html.match(/class="rail-btn/g)||[]).length,2);assert.match(html,/BUILDER<br>(1\.9|2\.0|2\.1|2\.2|2\.3|2\.4|2\.5|2\.6)/);assert.match(ui,/studio19-resize/);assert.match(ui,/studio19-group/);
});

test('v1.9: desenhar parede contínua cria todos os segmentos em uma edição',()=>{
 const {doc,room}=setup();const n=paintStructureLine(doc,room,{axis:'h',x:3,y:4},{axis:'h',x:6,y:4},'wall');
 assert.equal(n,4);const segments=doc.floorplan.segments.filter(s=>s.roomId===room&&s.axis==='h'&&s.y===4);
 assert.deepEqual(segments.map(s=>s.x).sort((a,b)=>a-b),[3,4,5,6]);
});
test('v1.9: traço de parede é atômico mesmo quando um segmento atravessa móvel',()=>{
 const {doc,room}=setup();putFurniture(doc,{roomId:room,kind:'desk',x:4,y:3});
 const previous=JSON.stringify(doc.floorplan);
 assert.throws(()=>paintStructureLine(doc,room,{axis:'v',x:5,y:0},{axis:'v',x:5,y:5},'wall'),/Mova o móvel/);
 assert.equal(JSON.stringify(doc.floorplan),previous);
});
test('v1.9: traço de portas e passagens compartilha geometria com a planta 2D',()=>{
 const {doc,room}=setup();paintStructureLine(doc,room,{axis:'h',x:3,y:5},{axis:'h',x:6,y:5},'door');
 assert.equal(doc.floorplan.segments.filter(s=>s.type==='door'&&s.y===5).length,4);
 paintStructureLine(doc,room,{axis:'h',x:3,y:5},{axis:'h',x:6,y:5},'open');
 assert.equal(doc.floorplan.segments.filter(s=>s.type==='door'&&s.y===5).length,0);
});
