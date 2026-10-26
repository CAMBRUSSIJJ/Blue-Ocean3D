import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoDocument} from '../app/core.mjs';
import {GRID,putFurniture,validFurniture,rotateFurniture,linkFurniture,ensureFloorplan} from '../app/floorplan.mjs';
import {setEdge,edgeType} from '../app/floorplan-navigation.mjs';
import {duplicateFurniture,moveFurnitureBy,segmentAtFloor,segmentPlacement} from '../app/studio-actions.mjs';
import {simulateService} from '../app/simulation.mjs';
const room = d => d.environments[0].id;

test('v1.8: duplicar preserva tipo e giro, não duplica o vínculo operacional',()=>{
 const d=demoDocument(),r=room(d),n=d.nodes.find(n=>n.environmentId===r);
 const o=putFurniture(d,{roomId:r,kind:'bench',x:0,y:1});rotateFurniture(d,o.id);linkFurniture(d,o.id,n.id);
 const duplicate=duplicateFurniture(d,o.id);
 assert.equal(duplicate.kind,'bench');assert.equal(duplicate.rotation,90);assert.equal(duplicate.nodeId,'');
 assert.equal(duplicate.roomId,r);assert.notEqual(duplicate.id,o.id);
 assert.equal(ensureFloorplan(d).objects.find(v=>v.id===o.id).nodeId,n.id);
});
test('v1.8: duplicar procura espaços válidos, sem atravessar objetos',()=>{
 const d=demoDocument(),r=room(d),o=putFurniture(d,{roomId:r,kind:'counter',x:1,y:1});
 putFurniture(d,{roomId:r,kind:'bench',x:4,y:1});
 const clone=duplicateFurniture(d,o.id);
 assert.equal(validFurniture(d).length,3);
 assert(!(clone.x>=1&&clone.x<4&&clone.y===1));
 assert.notDeepEqual([clone.x,clone.y],[o.x,o.y]);
});
test('v1.8: duplicação falha com sala lotada e não modifica o documento',()=>{
 const d=demoDocument(),r=room(d);
 for(let y=0;y<GRID.rows;y++)for(let x=0;x<GRID.columns;x++)putFurniture(d,{roomId:r,kind:'chair',x,y});
 const old=JSON.stringify(d);assert.throws(()=>duplicateFurniture(d,validFurniture(d)[0].id),/espaço livre/);
 assert.equal(JSON.stringify(d),old);
});
test('v1.8: ajuste fino impede sair da sala ou sobrepor móveis',()=>{
 const d=demoDocument(),r=room(d),o=putFurniture(d,{roomId:r,kind:'desk',x:0,y:0});
 assert.throws(()=>moveFurnitureBy(d,o.id,-1,0),/limites/);
 assert.deepEqual([o.x,o.y],[0,0]);
 moveFurnitureBy(d,o.id,1,0);assert.deepEqual([o.x,o.y],[1,0]);
 putFurniture(d,{roomId:r,kind:'chair',x:3,y:0});
 assert.throws(()=>moveFurnitureBy(d,o.id,1,0),/ocupada/);
 assert.deepEqual([o.x,o.y],[1,0]);
});
test('v1.8: posição de estrutura é derivada de linha da grade, não de célula central',()=>{
 assert.deepEqual(segmentAtFloor(4.12,3.6),{axis:'v',x:4,y:3});
 assert.deepEqual(segmentAtFloor(4.6,2.09),{axis:'h',x:4,y:2});
 assert.equal(segmentAtFloor(4.5,2.5),null);
 assert.equal(segmentAtFloor(-1,1),null);
 assert.deepEqual(segmentAtFloor(12,8),{axis:'v',x:12,y:7});
});
test('v1.8: ferramentas 3D validam colisão e usam as estruturas canônicas do 2D',()=>{
 const d=demoDocument(),r=room(d),seg={axis:'v',x:4,y:2};
 assert.equal(segmentPlacement(d,r,seg,'wall').valid,true);
 putFurniture(d,{roomId:r,kind:'chair',x:3,y:2});
 assert.equal(segmentPlacement(d,r,seg,'wall').valid,true);
 putFurniture(d,{roomId:r,kind:'desk',x:1,y:3});
 const crossing={axis:'v',x:2,y:3};
 assert.equal(segmentPlacement(d,r,crossing,'wall').valid,false);
 assert.equal(segmentPlacement(d,r,crossing,'open').valid,true);
 setEdge(d,r,seg.axis,seg.x,seg.y,'door');
 assert.equal(edgeType(d,r,seg.axis,seg.x,seg.y),'door');
});
test('v1.8: novas interações preservam duração e custos da simulação',()=>{
 const d=demoDocument(),r=room(d),options={cases:6,arrivalInterval:8,teamCapacity:1};
 const original=simulateService(d,options),o=putFurniture(d,{roomId:r,kind:'chair',x:1,y:1});
 moveFurnitureBy(d,o.id,1,0);duplicateFurniture(d,o.id);
 setEdge(d,r,'h',4,4,'wall');
 const changed=simulateService(d,options);
 assert.deepEqual(changed.metrics,original.metrics);assert.deepEqual(changed.events,original.events);
});
test('v1.8: botões de construção e versão estão na aplicação com 2 abas',()=>{
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
 assert.equal((html.match(/class="rail-btn/g)||[]).length,2);
 assert.match(html,/data-room3d-structure="wall"/);
 assert.match(html,/data-room3d-structure="door"/);
 assert.match(html,/data-room3d-structure="open"/);
 assert.match(html,/data-room3d-control="duplicate-selected"/);
 assert.match(html,/v1\.8/);
});
