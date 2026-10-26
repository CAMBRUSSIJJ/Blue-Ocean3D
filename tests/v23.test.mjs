import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoDocument} from '../app/core.mjs';
import {simulateService} from '../app/simulation.mjs';
import {putFurniture} from '../app/floorplan.mjs';
import {roomInteractionPlan,siteInteractionPlan,interactionSummary} from '../app/simulation-poses.mjs';
import {simulationRoomActors} from '../app/simulation3d.mjs';
import {renderSiteTraffic} from '../app/site-traffic.mjs';
import {connectServiceCorridors,siteRoomSpot} from '../app/site-routing.mjs';
const fixtures=()=>{const d=demoDocument();return {d,room:d.environments[0].id};};
const client=(n,status,room,node='node-1')=>({id:`client-${n}`,kind:'client',caseIndex:n,status,roomId:room,nodeId:node,x:3,y:6});
test('v2.3: assentos são atribuídos em ordem estável sem exceder vagas visuais',()=>{
 const {d,room}=fixtures();putFurniture(d,{roomId:room,kind:'bench',x:5,y:6});
 const actors=Array.from({length:5},(_,i)=>client(i+1,'Na fila',room));
 const first=roomInteractionPlan(d,actors,room),second=roomInteractionPlan(d,[...actors].reverse(),room);
 const byId=a=>new Map(a.map(x=>[x.id,x]));const a=byId(first),b=byId(second);
 for(const id of a.keys())assert.deepEqual(a.get(id),b.get(id));
 assert.equal(first.filter(p=>p.pose==='seated').length,3);
 assert.equal(first.filter(p=>p.pose==='queued').length,2);
 assert.equal(new Set(first.filter(p=>p.pose==='seated').map(p=>`${p.x}|${p.y}`)).size,3);
});
test('v2.3: sem móveis ninguém é marcado como sentado',()=>{
 const {d,room}=fixtures();const people=[client(1,'Na fila',room),client(2,'Aguardando próxima etapa',room)];
 const out=roomInteractionPlan(d,people,room);assert.equal(out.filter(p=>p.pose==='seated').length,0);
 assert.equal(out.filter(p=>p.pose==='queued').length,2);
});
test('v2.3: posto vinculado deriva do nó real e não de decoração arbitrária',()=>{
 const {d,room}=fixtures();const active=d.nodes.find(n=>n.environmentId===room&&['activity','decision'].includes(n.type));
 assert.ok(active);
 const desk=putFurniture(d,{roomId:room,kind:'station',x:6,y:4,nodeId:active.id});
 const actors=[client(1,'Em atendimento',room,active.id),{id:'staff-1',kind:'staff',caseIndex:1,roomId:room,nodeId:active.id,x:2,y:3,status:'Atendendo'}];
 const out=roomInteractionPlan(d,actors,room);
 assert.deepEqual(out.map(x=>x.interactionObjectId),[desk.id,desk.id]);
 assert.equal(out[0].pose,'being-served');assert.equal(out[1].pose,'working');
});
test('v2.3: trânsito nos corredores não é transformado em assento',()=>{
 const {d,room}=fixtures();putFurniture(d,{roomId:room,kind:'waiting',x:5,y:6});
 const here=siteRoomSpot(d,room),actors=[{...client(1,'Na fila',room),x:here.x+3,y:here.y+6},
 {id:'client-2',kind:'client',caseIndex:2,status:'Caminhando (tempo incluído)',roomId:null,nodeId:'x',x:49.5,y:46.5}];
 const projected=siteInteractionPlan(d,actors);assert.equal(projected[0].pose,'seated');assert.equal(projected[1].pose,'walking');
 assert.equal(projected[1].x,49.5);assert.equal(projected[1].y,46.5);
 assert.deepEqual(interactionSummary(projected),{clients:2,seated:1,queued:0,serving:0,working:0,walking:1});
});
test('v2.3: interações são projeção de leitura e não alteram eventos, fila ou custos',()=>{
 const {d,room}=fixtures();connectServiceCorridors(d);
 const result=simulateService(d,{cases:6,arrivalInterval:8,teamCapacity:1});
 const before=JSON.stringify({document:d,events:result.events,metrics:result.metrics});
 const a=simulationRoomActors(d,result,32,room);const map=renderSiteTraffic(d,result,32);
 assert.equal(typeof map.interactions.seated,'number');assert.equal(map.actors.length>0,true);
 putFurniture(d,{roomId:room,kind:'bench',x:5,y:6});
 const changed=simulateService(d,{cases:6,arrivalInterval:8,teamCapacity:1});
 assert.deepEqual(changed.metrics,result.metrics);assert.deepEqual(changed.events,result.events);
 assert.equal(a.every(x=>typeof x.pose==='string'),true);
 assert.notEqual(JSON.stringify(d),JSON.parse(before).document);
});
test('v2.3: interface continua com duas abas principais e um resumo visual',()=>{
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
 assert.match(html,/BUILDER<br>2\.[3456]/);assert.match(html,/sim23-occupancy/);
 assert.equal((html.match(/class="rail-btn/g)||[]).length,2);
 assert.match(html,/styles-bundle\.css/);
 const bundled=readFileSync(new URL('../app/styles-bundle.css',import.meta.url),'utf8');
 assert.match(bundled,/SOURCE: v23\.css/);
});
