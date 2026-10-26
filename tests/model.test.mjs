import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDocument,createDocument,addNode,addEdge,moveNode,deleteNode,inspect,validateDocument,dxfExport,svgExport,stageLeft,laneTop,clone} from '../app/core.mjs';

test('modelo de exemplo mantém elementos canônicos válidos',()=>{
 const d=demoDocument();assert.equal(validateDocument(d),true);assert.equal(d.nodes.length,8);assert.equal(d.edges.length,4);assert.equal(inspect(d).totalMinutes,43)
});
test('movimento atualiza etapa e camada sem duplicar identidade',()=>{
 const d=createDocument();const a=addNode(d,{type:'activity',stage:0,title:'Processar'}),id=a.id;
 moveNode(d,id,stageLeft(2)+80,laneTop('back')+65);assert.equal(a.id,id);assert.equal(a.stage,2);assert.equal(a.lane,'back');assert.equal(d.nodes.length,1)
});
test('dependência circular é rejeitada',()=>{
 const d=createDocument(),a=addNode(d,{stage:0}),b=addNode(d,{stage:1}),c=addNode(d,{stage:2});addEdge(d,{from:a.id,to:b.id,type:'dependency'});addEdge(d,{from:b.id,to:c.id,type:'dependency'});assert.throws(()=>addEdge(d,{from:c.id,to:a.id,type:'dependency'}),/circular/)
});
test('handoffs exigem equipes distintas e descrição',()=>{
 const d=createDocument(),a=addNode(d,{team:'A'}),b=addNode(d,{team:'A',stage:1});assert.throws(()=>addEdge(d,{from:a.id,to:b.id,type:'handoff',label:'Arquivo'}),/equipes/);b.team='B';assert.throws(()=>addEdge(d,{from:a.id,to:b.id,type:'handoff'}),/Descreva/);let edge=addEdge(d,{from:a.id,to:b.id,type:'handoff',label:'Dados',acceptance:'Recebimento'});assert.equal(edge.type,'handoff')
});
test('relação de recurso aceita somente sistema ou recurso no destino',()=>{
 const d=createDocument(),a=addNode(d,{}),b=addNode(d,{stage:1});assert.throws(()=>addEdge(d,{from:a.id,to:b.id,type:'resource'}),/Recurso/);const r=addNode(d,{stage:1,type:'system'});assert.equal(addEdge(d,{from:a.id,to:r.id,type:'resource'}).type,'resource')
});
test('exclusão de componente remove apenas suas conexões',()=>{
 const d=demoDocument(),target=d.nodes.find(n=>n.type==='system');assert(d.edges.some(e=>e.to===target.id));let count=d.edges.length;deleteNode(d,target.id);assert.equal(d.edges.length,count-1);assert(!d.nodes.some(n=>n.id===target.id))
});
test('arquivos JSON, DXF e SVG exportam a estrutura sem texto arbitrário',()=>{
 const d=demoDocument();d.name='<script>alert(1)</script>';let j=JSON.parse(JSON.stringify(d));assert.equal(validateDocument(j),true);let svg=svgExport(d);assert(!svg.includes('<script>'));let dxf=dxfExport(d);assert(dxf.includes('AC1009'));assert(dxf.includes('ENTITIES'));assert(dxf.includes('COMPONENTS'));assert(dxf.includes('EOF'))
});
test('importação exige IDs, limites e referências válidas',()=>{
 const d=demoDocument(),invalid=clone(d);invalid.edges[0].to='missing';assert.throws(()=>validateDocument(invalid),/Conexão/);invalid.edges[0].to=d.nodes[0].id;invalid.nodes.push(clone(invalid.nodes[0]));assert.throws(()=>validateDocument(invalid),/duplicado/)
});
test('soma informada não é confundida com simulação',()=>{
 const d=demoDocument(),a=inspect(d);assert.equal(a.activities,3);assert.equal(a.cost,85);assert(a.warnings.every(x=>x.level==='warning'||x.level==='info'))
});
