import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDocument,createDocument,addNode} from '../app/core.mjs';
import {createRoom} from '../app/environments.mjs';
import {layoutWorld,roomAtPoint,relativeTo,snapGrid,V3_ROW_MAX} from '../app/scene3d.mjs';

const inside=(r,i)=>i.x>=r.x&&i.x<=r.x+r.w&&i.z>=r.z&&i.z<=r.z+r.d;
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.z<b.z+b.d&&a.z+a.d>b.z;

test('demo: uma sala por ambiente e todas as peças dentro da sua sala',()=>{const d=demoDocument(),L=layoutWorld(d);
  assert.equal(L.rooms.length,d.environments.length);assert.equal(L.items.length,d.nodes.length);
  for(const it of L.items)assert.ok(inside(L.rooms.find(r=>r.id===it.roomId),it))});
test('salas nunca se sobrepõem e quebram linha ao passar do limite',()=>{const d=createDocument('x');for(let i=0;i<9;i++){const r=createRoom(d,{name:'S'+i});for(let k=0;k<5;k++)addNode(d,{type:'activity'}).environmentId=r.id}
  const L=layoutWorld(d);for(let i=0;i<L.rooms.length;i++)for(let j=i+1;j<L.rooms.length;j++)assert.ok(!overlap(L.rooms[i],L.rooms[j]));
  assert.ok(L.rooms.every(r=>r.x+r.w<=V3_ROW_MAX+r.w));assert.ok(new Set(L.rooms.map(r=>r.z)).size>1)});
test('peças sem ambiente ganham a sala "Sem ambiente"; documento vazio tem limites mínimos',()=>{const d=createDocument('x');addNode(d,{type:'system'});
  const L=layoutWorld(d);assert.equal(L.rooms.at(-1).id,null);assert.equal(L.rooms.at(-1).name,'Sem ambiente');
  const E=layoutWorld(createDocument('v'));assert.equal(E.rooms.length,0);assert.ok(E.bounds.maxX>=12&&E.bounds.maxZ>=12)});
test('posição salva (node.at) é relativa à sala, respeitada e a sala cresce para contê-la',()=>{const d=createDocument('x'),r=createRoom(d,{name:'A'}),n=addNode(d,{type:'activity'});n.environmentId=r.id;n.at={x:12,z:3};
  const L=layoutWorld(d),room=L.rooms[0],it=L.items[0];assert.equal(it.x,room.x+12);assert.equal(it.z,room.z+3);assert.ok(inside(room,it))});
test('posição inválida cai no padrão e posição fora é limitada à sala',()=>{const d=createDocument('x'),r=createRoom(d,{name:'A'}),n=addNode(d,{type:'activity'});n.environmentId=r.id;n.at={x:'a',z:null};
  const L=layoutWorld(d);assert.ok(inside(L.rooms[0],L.items[0]))});
test('roomAtPoint e relativeTo: ida e volta com encaixe de 0,5',()=>{const d=demoDocument(),L=layoutWorld(d),r=L.rooms[1];
  assert.equal(roomAtPoint(L,r.x+1,r.z+1).id,r.id);assert.equal(roomAtPoint(L,-5,-5),null);
  const rel=relativeTo(r,r.x+2.26,r.z+3.1);assert.deepEqual(rel,{x:2.5,z:3});assert.equal(snapGrid(1.74),1.5)});
test('layout é determinístico e não altera o documento',()=>{const d=demoDocument(),before=JSON.stringify(d);assert.deepEqual(layoutWorld(d),layoutWorld(d));assert.equal(JSON.stringify(d),before)});
test('o documento com node.at continua válido (schema 1 inalterado)',async()=>{const {validateDocument}=await import('../app/core.mjs');const d=demoDocument();d.nodes[0].at={x:3,z:2};assert.ok(validateDocument(d))});
