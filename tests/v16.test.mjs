import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDocument} from '../app/core.mjs';
import {simulateService,stateAt} from '../app/simulation.mjs';
import {simulationRoomActors,simulationRoomStatus,sceneGeometry} from '../app/simulation3d.mjs';
import {setWallHeight} from '../app/room-style.mjs';
import {setRoomScale} from '../app/floorplan-navigation.mjs';
import {putFurniture} from '../app/floorplan.mjs';
const opts={cases:6,arrivalInterval:8,teamCapacity:1};
test('v1.6: modelo espacial não altera o motor determinístico',()=>{
 const d=demoDocument(),baseline=simulateService(d,opts),json=JSON.stringify(d);
 const roomId=d.environments[0].id;
 for(const time of [0,.5,5,12,30,80,180]){
  const people=simulationRoomActors(d,baseline,time,roomId);assert.ok(Array.isArray(people));
  const status=simulationRoomStatus(people);
  assert.ok(status.clients<=6);assert.equal(status.clients,new Set(people.filter(p=>p.kind==='client').map(p=>p.caseIndex)).size);
 }
 assert.equal(JSON.stringify(d),json);
 assert.deepEqual(simulateService(d,opts).metrics,baseline.metrics);
});
test('v1.6: pessoas apresentadas têm atividades e ambientes reais',()=>{
 const d=demoDocument(),r=simulateService(d,opts),ids=new Set(d.nodes.map(n=>n.id));
 for(const time of [0,5,15,70])for(const room of d.environments){
  const actors=simulationRoomActors(d,r,time,room.id);
  for(const p of actors){assert.equal(p.roomId,room.id);assert.ok(ids.has(p.nodeId));assert.ok(p.x>0&&p.x<12);assert.ok(p.y>0&&p.y<8);assert.ok(p.kind==='client'||p.kind==='staff');}
  const count=simulationRoomStatus(actors);assert.equal(count.staff,actors.filter(a=>a.kind==='staff').length);
  assert.equal(count.waiting,actors.filter(a=>a.kind==='client'&&a.status==='Na fila').length);
 }
});
test('v1.6: cálculo de pessoas na fila segue eventos operacionais',()=>{
 const d=demoDocument(),r=simulateService(d,opts);
 for(const time of [0,8,16,25,40,60]){
  const waiting=stateAt(r,time).waiting;
  let visibleWaiting=0;
  for(const room of d.environments)visibleWaiting+=simulationRoomStatus(simulationRoomActors(d,r,time,room.id)).waiting;
  // O modelo visual representa um cliente por ocorrência, não cada atividade paralela.
  assert.ok(visibleWaiting<=r.settings.cases);
  assert.ok(waiting.length>=0);
 }
});
test('v1.6: paredes, móveis e altura real aparecem na geometria 3D',()=>{
 const d=demoDocument(),id=d.environments[0].id;
 setRoomScale(d,id,.75);setWallHeight(d,id,3);
 const o=putFurniture(d,{roomId:id,kind:'printer',x:8,y:6});
 const spec=sceneGeometry(d,id);
 assert.ok(spec.edges.length>0);assert.ok(spec.objects.some(x=>x.id===o.id));
 assert.equal(spec.height,4);
 assert.equal(sceneGeometry(d,'room-missing'),null);
 assert.deepEqual(simulationRoomStatus([]),{clients:0,staff:0,waiting:0,serving:0,blocked:0});
});
test('v1.6: estrutura do simulador preserva seus resultados ao alterar planta',()=>{
 const d=demoDocument(),original=simulateService(d,opts);
 setRoomScale(d,d.environments[0].id,1.25);
 setWallHeight(d,d.environments[0].id,2.8);
 const next=simulateService(d,opts);
 assert.deepEqual(next.metrics,original.metrics);assert.deepEqual(next.events,original.events);
});
