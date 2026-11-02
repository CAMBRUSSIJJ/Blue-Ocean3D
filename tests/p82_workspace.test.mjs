import test from 'node:test';
import assert from 'node:assert/strict';
import {createDocument,addNode,addEdge,demoDocument} from '../app/core.mjs';
import {evaluateServiceReadiness,serviceContext} from '../app/p82-service-readiness.mjs';
import {renderWorkflowBoard,workflowModel} from '../app/p8-workflow.mjs';
test('P8.2: context is local to document and does not infer external facts',()=>{
 const d=createDocument('Atendimento digital');
 const empty=serviceContext(d);
 assert.equal(empty.audience,'');
 d.serviceContext={audience:'Clientes online',trigger:'Mensagem recebida',outcome:'Solicitação concluída'};
 assert.deepEqual(serviceContext(d).audience,'Clientes online');
 assert.equal(serviceContext(d).assumptions,'');
 const report=evaluateServiceReadiness(d);
 assert.equal(report.canSimulate,false);
 assert.ok(report.errors.some(x=>x.id==='no-activities'));
});
test('P8.2: activities can operate without physical environments',()=>{
 const d=createDocument('Serviço remoto');
 const n=addNode(d,{type:'activity',title:'Responder mensagem',team:'Atendimento'});
 n.duration=3;
 const report=evaluateServiceReadiness(d);
 assert.equal(report.canSimulate,true);
 assert.equal(report.assignedRooms,0);
 assert.ok(report.informations.some(x=>x.id==='room'));
 assert.ok(renderWorkflowBoard(d).includes('Sem ambiente físico'));
});
test('P8.2: visual arrow only when there is a real direct link, not just consecutive cards',()=>{
 const d=createDocument('Fluxo desconectado');
 const a=addNode(d,{title:'A'}),b=addNode(d,{title:'B'}),c=addNode(d,{title:'C'});
 assert.equal((renderWorkflowBoard(d).match(/class="p8-flow-arrow"/g)||[]).length,0);
 addEdge(d,{from:a.id,to:c.id,type:'sequence'});
 assert.equal((renderWorkflowBoard(d).match(/class="p8-flow-arrow"/g)||[]).length,0);
 addEdge(d,{from:a.id,to:b.id,type:'sequence'});
 assert.equal((renderWorkflowBoard(d).match(/class="p8-flow-arrow"/g)||[]).length,1);
 assert.equal(workflowModel(d).connections,2);
});
test('P8.2: physical-room highlight preserves the entire graph and canonical model',()=>{
 const d=demoDocument(),before=JSON.stringify(d);
 const room=d.environments[0];
 const markup=renderWorkflowBoard(d,{focusRoom:room.id});
 assert.ok(markup.includes('p82-focus-active'));
 assert.equal(JSON.stringify(d),before);
});
test('P8.2: unsafe labels from arbitrary documents are escaped',()=>{
 const d=createDocument('Teste');
 const n=addNode(d,{title:'<img src=x onerror=alert(1)>'});
 n.duration=3;n.team='<b>equipe</b>';
 const markup=renderWorkflowBoard(d);
 assert.ok(!markup.includes('<img'));
 assert.ok(!markup.includes('<b>equipe</b>'));
 assert.ok(markup.includes('&lt;img'));
});
