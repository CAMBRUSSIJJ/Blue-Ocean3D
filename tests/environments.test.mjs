import test from 'node:test';
import assert from 'node:assert/strict';
import {createDocument,demoDocument,addNode,addEdge,validateDocument,clone} from '../app/core.mjs';
import {ensureRoomModel,createRoom,updateRoom,deleteRoom,assignRoom,roomNodes,projectRooms,createTemplate,applyRoomTemplate,ROOM_PRESETS} from '../app/environments.mjs';

test('documentos v0.3 são compatíveis e aceitam ambientes sem perder relações',()=>{
 const d=demoDocument(),legacy=clone(d);delete legacy.environments;delete legacy.roomTemplates;for(const n of legacy.nodes)delete n.environmentId;
 const oldIds=legacy.nodes.map(n=>n.id),oldLinks=legacy.edges.map(e=>e.id);validateDocument(legacy);ensureRoomModel(legacy);
 const room=createRoom(legacy,{name:'Recepção'});assignRoom(legacy,legacy.nodes[0].id,room.id);
 assert.deepEqual(legacy.nodes.map(n=>n.id),oldIds);assert.deepEqual(legacy.edges.map(e=>e.id),oldLinks);assert.equal(validateDocument(legacy),true);
});
test('criar, renomear e excluir ambiente não remove cartões nem conexões',()=>{
 const d=createDocument();const a=addNode(d,{title:'A'}),b=addNode(d,{title:'B'});addEdge(d,{from:a.id,to:b.id});
 const r=createRoom(d,{name:'Expedição'});assignRoom(d,a.id,r.id);updateRoom(d,r.id,{name:'Operação',team:'Logística',description:'Preparar pedidos.'});
 assert.equal(d.environments[0].name,'Operação');assert.equal(roomNodes(d,r.id).length,1);deleteRoom(d,r.id);
 assert.equal(d.nodes.length,2);assert.equal(d.edges.length,1);assert.equal(d.nodes[0].environmentId,undefined);assert.equal(validateDocument(d),true);
});
test('uma peça pode mudar de ambiente sem perder identidade ou relação',()=>{
 const d=createDocument(),a=addNode(d,{title:'A'}),b=addNode(d,{title:'B'});addEdge(d,{from:a.id,to:b.id});
 const x=createRoom(d,{name:'A'}),y=createRoom(d,{name:'B'});assignRoom(d,a.id,x.id);assignRoom(d,a.id,y.id);
 assert.equal(d.nodes[0].id,a.id);assert.equal(d.edges.length,1);assert.equal(roomNodes(d,x.id).length,0);assert.equal(roomNodes(d,y.id).length,1);
});
test('modelo padrão de recepção cria ambiente real e peças relacionadas',()=>{
 const d=createDocument(),old=JSON.stringify(d),res=applyRoomTemplate(d,'reception');
 assert.equal(JSON.stringify(d),old);assert.equal(res.document.nodes.length,3);assert.equal(res.document.edges.length,2);assert(res.document.nodes.every(n=>n.environmentId===res.room.id));assert.equal(validateDocument(res.document),true);
});
test('cinco kits de ambiente são instaláveis num projeto vazio',()=>{
 for(const key of Object.keys(ROOM_PRESETS)){const r=applyRoomTemplate(createDocument(),key);assert.equal(r.document.environments.length,1);assert.equal(r.nodes.length,3);assert.equal(r.edges.length,2);assert.equal(validateDocument(r.document),true);}
});
test('biblioteca reaproveita conjunto, sem reutilizar IDs antigos',()=>{
 const base=applyRoomTemplate(createDocument(),'consultation').document;const r=base.environments[0];const template=createTemplate(base,r.id),before=JSON.stringify(base),applied=applyRoomTemplate(base,template.id);
 assert.equal(JSON.stringify(base),before);assert.equal(template.nodes.length,3);assert.equal(applied.nodes.length,3);
 const originals=new Set(base.nodes.map(n=>n.id));assert(applied.nodes.every(n=>!originals.has(n.id)));
 const originalLinks=new Set(base.edges.map(e=>e.id));assert(applied.edges.every(e=>!originalLinks.has(e.id)));
 assert.equal(validateDocument(applied.document),true);
});
test('projeção de ambientes contabiliza passagens entre áreas sem alterar grafo',()=>{
 const d=demoDocument(),before=JSON.stringify(d),p=projectRooms(d);
 assert.equal(p.assigned,8);assert.equal(p.unassigned,0);assert(p.links.some(l=>l.count>0));
 assert.equal(JSON.stringify(d),before);
});
test('referência a ambiente inexistente é rejeitada',()=>{
 const d=createDocument(),n=addNode(d);n.environmentId='fantasma';assert.throws(()=>validateDocument(d),/ambiente/i);
});
test('ambiente com cor inválida não passa validação',()=>{
 const d=createDocument();const r=createRoom(d,{name:'Teste'});r.color='red';assert.throws(()=>validateDocument(d),/ambiente/i);
});
test('exclusão de modelo não é exclusão de ambiente',()=>{
 const d=applyRoomTemplate(createDocument(),'booking').document,room=d.environments[0],template=createTemplate(d,room.id);d.roomTemplates=d.roomTemplates.filter(t=>t.id!==template.id);
 assert.equal(d.nodes.length,3);assert.equal(d.environments.length,1);assert.equal(validateDocument(d),true);
});
test('biblioteca mantém limites documentados',()=>{
 const d=createDocument();for(let i=0;i<48;i++)createRoom(d,{name:'Área '+i});assert.throws(()=>createRoom(d,{name:'Extra'}),/48/);
});
