import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDocument,createDocument,addNode,clone,validateDocument} from '../app/core.mjs';
import {createRoom,assignRoom} from '../app/environments.mjs';
import {simulateService} from '../app/simulation.mjs';
import {GRID,FURNITURE,ensureFloorplan,putFurniture,moveFurniture,rotateFurniture,removeFurniture,linkFurniture,validFurniture,autoFurnish,anchorFor,peopleAt} from '../app/floorplan.mjs';

test('projeto v0.9 continua válido sem floorplan e passa a aceitar a planta',()=>{
 const d=demoDocument();delete d.floorplan;const initial=JSON.stringify(d);assert.equal(validateDocument(d),true);
 ensureFloorplan(d);assert.deepEqual(d.floorplan,{version:1,objects:[],segments:[],scales:{}});assert.equal(validateDocument(d),true);assert.equal(initial.includes('floorplan'),false);
});
test('inserir objetos, vincular atividade e exportar JSON preserva os componentes',()=>{
 const d=demoDocument(),node=d.nodes.find(n=>n.type==='activity'&&n.environmentId);const before=d.nodes.map(n=>n.id);
 const p=putFurniture(d,{roomId:node.environmentId,kind:'desk',x:2,y:1,nodeId:node.id});
 assert.equal(p.nodeId,node.id);assert.deepEqual(d.nodes.map(n=>n.id),before);assert.equal(validFurniture(JSON.parse(JSON.stringify(d))).length,1);assert.equal(validateDocument(d),true);
 assert.throws(()=>linkFurniture(d,p.id,d.nodes.find(n=>n.environmentId!==node.environmentId).id),/mesmo ambiente/);
});
test('móveis são limitados à grade e não ocupam mesmo espaço',()=>{
 const d=demoDocument(),roomId=d.environments[0].id;
 const p=putFurniture(d,{roomId,kind:'counter',x:99,y:-8});assert.equal(p.x,9);assert.equal(p.y,0);
 assert.throws(()=>putFurniture(d,{roomId,kind:'desk',x:10,y:0}),/ocupado/);
 assert.equal(GRID.columns,12);assert.equal(GRID.rows,8);
});
test('arrastar ou girar móvel respeita colisões e desfaz posição inválida',()=>{
 const d=demoDocument(),roomId=d.environments[0].id;
 const a=putFurniture(d,{roomId,kind:'counter',x:1,y:1});putFurniture(d,{roomId,kind:'desk',x:1,y:2});
 assert.throws(()=>moveFurniture(d,a.id,1,2),/ocupada/);assert.equal(a.x,1);
 assert.throws(()=>rotateFurniture(d,a.id),/Sem espaço/);assert.equal(a.rotation,0);
 moveFurniture(d,a.id,0,5);rotateFurniture(d,a.id);assert.equal(a.rotation,90);assert.equal(a.x,0);assert.equal(a.y,5);
 assert.equal(removeFurniture(d,a.id),true);assert.equal(removeFurniture(d,a.id),false);
});
test('layout automático prioriza postos vinculados e permite executar mais uma vez sem duplicar',()=>{
 const d=demoDocument(),before=JSON.stringify(d.nodes);let n=autoFurnish(d);assert(n>=10);assert.equal(JSON.stringify(d.nodes),before);
 const first=validFurniture(d).length;const second=autoFurnish(d);assert.equal(second,0);assert.equal(first,validFurniture(d).length);
 const bound=validFurniture(d).filter(o=>o.nodeId);assert(bound.length>1);
 assert.notEqual(anchorFor(d,bound[0].nodeId).x,undefined);
});
test('atividades de ambientes diferentes geram deslocamento e profissionais na reprodução',()=>{
 const d=demoDocument();autoFurnish(d);const before=clone(d),r=simulateService(d,{cases:4,arrivalInterval:5,teamCapacity:2});
 assert(r.events.length>0);assert(peopleAt(d,r,0).some(p=>p.kind==='client'));
 assert(r.events.some(e=>e.environmentId));
 const active=r.events.find(e=>e.task&&e.duration>2&&e.environmentId);const people=peopleAt(d,r,active.start+.2);
 assert(people.some(p=>p.kind==='client'));
 assert(people.some(p=>p.kind==='staff'));
 assert.equal(JSON.stringify(d.nodes),JSON.stringify(before.nodes));
});
test('cliente e profissional não aparecem antes da primeira chegada',()=>{
 const d=demoDocument(),r=simulateService(d,{cases:3,arrivalInterval:15});
 assert.equal(peopleAt(d,r,-1).filter(p=>p.caseIndex>1).length,0);
 assert.equal(peopleAt(d,r,5).some(p=>p.caseIndex===3),false);
});
test('planta não altera resultados operacionais nem métricas de filas',()=>{
 const d=demoDocument(),settings={cases:12,arrivalInterval:3};
 const before=simulateService(d,settings);autoFurnish(d);const after=simulateService(d,settings);
 assert.deepEqual(after.metrics,before.metrics);assert.deepEqual(after.events,before.events);
});
test('limites: não permite objeto desconhecido nem ambiente inexistente',()=>{
 const d=demoDocument();assert.throws(()=>putFurniture(d,{roomId:'fake',kind:'desk'}),/ambiente/);
 assert.throws(()=>putFurniture(d,{roomId:d.environments[0].id,kind:'furadeira'}),/desconhecido/);
 assert(Object.keys(FURNITURE).length>=8);
});
test('a planta é independente de ambientes ou serviços vazios',()=>{
 const d=createDocument(),r=createRoom(d,{name:'Novo espaço'});
 assert.equal(autoFurnish(d),2);const props=validFurniture(d);assert.equal(props.length,2);
 assert(peopleAt(d,null,0).length===0);
});
