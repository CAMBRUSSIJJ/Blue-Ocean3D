import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoDocument} from '../app/core.mjs';
import {positions,roomSpot,moveRoom,adjacency,transitions,siteReport} from '../app/site-overview.mjs';
import {setEdge} from '../app/floorplan-navigation.mjs';
import {putFurniture,resizeFurniture,furnitureDimensions} from '../app/floorplan.mjs';
import {simulateService} from '../app/simulation.mjs';
const setup=()=>{const doc=demoDocument();assert.ok(doc.environments.length>=2);return {doc,a:doc.environments[0].id,b:doc.environments[1].id};};
test('v2.0: posições padrão não se sobrepõem e não alteram a posição dos nós',()=>{
 const {doc,a,b}=setup(),before=doc.nodes.map(n=>[n.x,n.y]);const pa=roomSpot(doc,a),pb=roomSpot(doc,b);
 assert.deepEqual(pa,{x:0,y:0});assert.deepEqual(pb,{x:14,y:0});assert.deepEqual(doc.nodes.map(n=>[n.x,n.y]),before);
});
test('v2.0: mover sala salva coordenadas no documento e na exportação JSON',()=>{
 const {doc,b}=setup();moveRoom(doc,b,12,0);assert.deepEqual(positions(doc)[b],{x:12,y:0});assert.deepEqual(roomSpot(JSON.parse(JSON.stringify(doc)),b),{x:12,y:0});
});
test('v2.0: impede colisões e coordenadas inválidas sem deslocar sala',()=>{
 const {doc,b}=setup(),before=roomSpot(doc,b);assert.throws(()=>moveRoom(doc,b,5,2),/mesmo espaço/);
 assert.throws(()=>moveRoom(doc,b,-1,0),/fora/);assert.deepEqual(roomSpot(doc,b),before);
});
test('v2.0: só considera travessia entre salas com DUAS portas alinhadas',()=>{
 const {doc,a,b}=setup();moveRoom(doc,b,12,0);assert.equal(adjacency(doc,a,b).connected,false);
 setEdge(doc,a,'v',12,3,'door');assert.equal(adjacency(doc,a,b).connected,false);
 setEdge(doc,b,'v',0,4,'door');assert.equal(adjacency(doc,a,b).connected,false);
 setEdge(doc,b,'v',0,3,'door');assert.equal(adjacency(doc,a,b).connected,true);
});
test('v2.0: portas desalinhadas e salas distantes retornam aviso',()=>{
 const {doc,a,b}=setup();assert.equal(adjacency(doc,a,b).connected,false);
 moveRoom(doc,b,12,0);setEdge(doc,a,'v',12,2,'door');setEdge(doc,b,'v',0,3,'door');assert.match(adjacency(doc,a,b).reason,/alinhad/);
});
test('v2.0: conexão de operação difere de passagem física',()=>{
 const {doc,a,b}=setup(),na=doc.nodes.find(n=>n.environmentId===a),nb=doc.nodes.find(n=>n.environmentId===b);
 assert.ok(na&&nb);doc.edges.push({id:'custom-room-link',from:na.id,to:nb.id,type:'sequence',label:''});
 const links=transitions(doc);assert.ok(links.some(l=>l.from===a&&l.to===b&&!l.connected));assert.ok(siteReport(doc).unlinked>=1);
});
test('v2.0: alterações espaciais continuam sem modificar motor operacional',()=>{
 const {doc,b}=setup();const before=simulateService(doc,{cases:5,arrivalInterval:8,teamCapacity:1});
 moveRoom(doc,b,12,0);setEdge(doc,b,'v',0,2,'door');const o=putFurniture(doc,{roomId:b,kind:'chair',x:5,y:5});resizeFurniture(doc,o.id,2,1);
 assert.deepEqual(furnitureDimensions(o),[2,1]);const after=simulateService(doc,{cases:5,arrivalInterval:8,teamCapacity:1});assert.deepEqual(after.events,before.events);assert.deepEqual(after.metrics,before.metrics);
});
test('v2.0: novos modos, alças e identificação estão no aplicativo entregue',()=>{
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/floorplan-ui.mjs',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../app/room3d.mjs',import.meta.url),'utf8');
 assert.match(html,/BUILDER<br>2\.[123456]/);assert.match(html,/data-room-display="overview"/);assert.match(html,/id="site-overview"/);
 assert.match(ui,/data-floor-resize/);assert.match(studio,/resizeId/);
 assert.equal((html.match(/class="rail-btn/g)||[]).length,2);
});
