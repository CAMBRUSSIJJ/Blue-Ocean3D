import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDocument} from '../app/core.mjs';
import {FURNITURE,putFurniture,moveFurniture,rotateFurniture,removeFurniture,validFurniture} from '../app/floorplan.mjs';
import {placementAt,placementFromPoint,FURNITURE_DRAG_TYPE} from '../app/placement.mjs';
import {EXTRA_PREVIEW_KIND,thumbnail} from '../app/room-catalog.mjs';
import {setEdge} from '../app/floorplan-navigation.mjs';
import {simulateService} from '../app/simulation.mjs';
test('v1.5: novo catálogo inclui objetos leves para serviços',()=>{
 assert.ok(Object.keys(FURNITURE).filter(k=>k!=='door').length>=15); // P7 adds variants; v1.5 base catalog must remain available.
 assert.equal(Object.keys(EXTRA_PREVIEW_KIND).length,7);
 assert.equal(FURNITURE_DRAG_TYPE,'application/x-service-builder-furniture');
 for(const k of Object.keys(EXTRA_PREVIEW_KIND))assert.match(thumbnail(k),/furn-preview/);
});
test('v1.5: prévia usa encaixe centralizado, respeita limites da malha',()=>{
 const d=demoDocument(),roomId=d.environments[0].id;
 const first=placementFromPoint(d,{roomId,kind:'bench',pointX:0,pointY:0});
 assert.equal(first.valid,true);assert.equal(first.object.x,0);assert.equal(first.object.y,0);
 const last=placementFromPoint(d,{roomId,kind:'bench',pointX:50,pointY:50});
 assert.equal(last.valid,true);assert.equal(last.object.x,9);assert.equal(last.object.y,7);
});
test('v1.5: prévia detecta colisão e aceita mover o próprio objeto',()=>{
 const d=demoDocument(),roomId=d.environments[0].id;
 const o=putFurniture(d,{roomId,kind:'bench',x:2,y:2});
 assert.match(placementAt(d,{roomId,kind:'table',x:3,y:2}).reason,/ocupado/);
 assert.equal(placementAt(d,{roomId,kind:'bench',x:2,y:2,ignoreId:o.id}).valid,true);
 assert.equal(placementAt(d,{roomId,kind:'table',x:7,y:6}).valid,true);
});
test('v1.5: previne atravessar divisórias e não modifica documento',()=>{
 const d=demoDocument(),roomId=d.environments[0].id;
 setEdge(d,roomId,'v',3,2,'wall');
 const json=JSON.stringify(d);
 const blocked=placementAt(d,{roomId,kind:'table',x:2,y:2});
 assert.equal(blocked.valid,false);assert.match(blocked.reason,/parede/);
 assert.equal(JSON.stringify(d),json);
});
test('v1.5: prévia rejeita dados desconhecidos e coordenadas inválidas',()=>{
 const d=demoDocument(),roomId=d.environments[0].id;
 assert.equal(placementAt(d,{roomId,kind:'absurdo',x:2,y:2}).valid,false);
 assert.equal(placementAt(d,{roomId:'sem-sala',kind:'bench',x:2,y:2}).valid,false);
 assert.equal(placementAt(d,{roomId,kind:'bench',x:NaN,y:0}).valid,false);
});
test('v1.5: móveis novos suportam rotação, movimentação, exclusão e exportação',()=>{
 const d=demoDocument(),roomId=d.environments[0].id;
 const o=putFurniture(d,{roomId,kind:'exam',x:2,y:2});
 rotateFurniture(d,o.id);assert.equal(validFurniture(d).find(x=>x.id===o.id).rotation,90);
 moveFurniture(d,o.id,6,3);assert.deepEqual([o.x,o.y],[6,3]);
 assert.equal(JSON.parse(JSON.stringify(d)).floorplan.objects.find(x=>x.id===o.id).kind,'exam');
 assert.equal(removeFurniture(d,o.id),true);assert.equal(validFurniture(d).some(x=>x.id===o.id),false);
});
test('v1.5: disposição do mobiliário continua sem alterar duração da operação',()=>{
 const d=demoDocument(),opts={cases:6,arrivalInterval:8,teamCapacity:1},before=simulateService(d,opts);
 const roomId=d.environments[0].id;
 for(const [kind,x,y] of [['bench',0,0],['printer',5,0],['coffee',8,0],['table',5,4]])putFurniture(d,{roomId,kind,x,y});
 const after=simulateService(d,opts);
 assert.deepEqual(after.metrics,before.metrics);assert.deepEqual(after.events,before.events);
});
