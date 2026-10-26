import test from 'node:test';
import assert from 'node:assert/strict';
import {createDocument,addNode,addEdge} from '../app/core.mjs';
import {createRoom,assignRoom} from '../app/environments.mjs';
import {simulateService} from '../app/simulation.mjs';
import {environmentSnapshot,capacityOpportunities,quickScenario,reviewServiceFlow} from '../app/simulation-insights.mjs';
import {serviceDiagnosis} from '../app/simulation-ui.mjs';
function fixture(){
 const doc=createDocument('Fila da clínica'),reception=createRoom(doc,{name:'Recepção',team:'Atendentes'}),consult=createRoom(doc,{name:'Consultório',team:'Médicos'});
 const a=addNode(doc,{type:'activity',title:'Receber',team:'Atendentes',stage:0});a.duration=10;assignRoom(doc,a.id,reception.id);
 const b=addNode(doc,{type:'activity',title:'Consultar',team:'Médicos',stage:1});b.duration=5;assignRoom(doc,b.id,consult.id);addEdge(doc,{from:a.id,to:b.id,type:'sequence'});
 return {doc,a,b,reception,consult};
}
test('mapa vivo representa tarefas ativas e prontas esperando sem falsear posição física',()=>{
 const {doc,reception,consult}=fixture(),before=JSON.stringify(doc),result=simulateService(doc,{cases:3,arrivalInterval:0,teamCapacity:1});
 const first=environmentSnapshot(doc,result,0);
 assert.equal(first.active,1);assert.equal(first.waiting,2);assert.equal(first.rooms.length,2);
 assert.equal(first.rooms.find(r=>r.id===reception.id).active.length,1);
 assert.equal(first.rooms.find(r=>r.id===reception.id).waiting.length,2);
 assert.equal(first.rooms.find(r=>r.id===consult.id).active.length,0);
 const later=environmentSnapshot(doc,result,11);
 assert.equal(later.rooms.find(r=>r.id===consult.id).active.length,1);
 assert.equal(later.rooms.find(r=>r.id===reception.id).active.length,1);
 assert.equal(environmentSnapshot(doc,result,result.metrics.elapsed).completedCases,3);
 assert.equal(JSON.stringify(doc),before,'view is read-only');
});
test('atividades sem ambiente aparecem em uma área virtual sem mudar o documento',()=>{
 const {doc}=fixture(),n=addNode(doc,{type:'activity',team:'Retaguarda',stage:0});n.duration=1;
 const r=simulateService(doc,{cases:1,arrivalInterval:0}),snapshot=environmentSnapshot(doc,r,0);
 assert(snapshot.rooms.some(x=>x.id==='unassigned'&&x.active.some(t=>t.nodeId===n.id)));
});
test('teste de reforço reduz a espera simulada e respeita capacidade máxima',()=>{
 const {doc}=fixture(),r=simulateService(doc,{cases:3,arrivalInterval:0,teamCapacity:1}),before=JSON.stringify(doc);
 const options=capacityOpportunities(doc,r);
 assert(options.length>0);
 assert(options.some(x=>x.savedWait>0));
 assert(options.every(x=>x.to===x.from+1&&x.to<=8));
 assert.equal(JSON.stringify(doc),before);
 const max=simulateService(doc,{cases:3,arrivalInterval:0,teamCapacity:8});
 assert.equal(capacityOpportunities(doc,max).length,0);
});
test('presets impõem limites de entradas e mantêm personalizações nos extremos',()=>{
 const scenario={cases:29,arrivalInterval:1,teamCapacity:2,teamCapacities:{'Equipe A':3}};
 const peak=quickScenario(scenario,'peak'),quiet=quickScenario(scenario,'quiet'),normal=quickScenario(scenario,'normal');
 assert.equal(peak.cases,30);assert.equal(peak.arrivalInterval,0);assert.equal(peak.teamCapacities['Equipe A'],3);
 assert.equal(quiet.cases,6);assert.equal(quiet.arrivalInterval,2);
 assert.equal(normal.teamCapacity,1);assert.equal(normal.cases,6);assert.deepEqual(normal.teamCapacities,{});
 assert.throws(()=>quickScenario(scenario,'missing'),/desconhecido/);
});

test('revisão não bloqueia atividades paralelas e destaca inconsistências editáveis',async()=>{
 const {reviewServiceFlow}=await import('../app/simulation-insights.mjs');
 const doc=createDocument('Revisão');const r=createRoom(doc,{name:'Balcão'});
 const one=addNode(doc,{type:'activity',title:'Sem vínculo',stage:0});one.duration=0;
 const two=addNode(doc,{type:'activity',title:'Com equipe',team:'Equipe A',stage:1});two.duration=2;assignRoom(doc,two.id,r.id);
 const review=reviewServiceFlow(doc);
 assert.deepEqual(review.warnings.map(w=>w.key),['parallel','isolated','time','team','room']);
 assert(review.warnings.every(w=>typeof w.nodeId==='string'));
 assert.equal(review.tasks,2);
 addEdge(doc,{from:one.id,to:two.id,type:'sequence'});
 const next=reviewServiceFlow(doc);
 assert(!next.warnings.some(w=>w.key==='isolated'));
});

test('auditoria indica necessidade de confirmar apenas atividades realmente isoladas',()=>{
 const d=createDocument('Paralelos'),a=addNode(d,{type:'activity',title:'A',team:'Equipe A'}),b=addNode(d,{type:'activity',title:'B',team:'Equipe B'});
 const review=reviewServiceFlow(d);
 assert.equal(review.requiresParallelConfirmation,true);
 assert.equal(review.precedenceCount,0);
 assert.deepEqual(new Set(review.isolatedNodes),new Set([a.id,b.id]));assert.equal(review.independentGroups.length,2);
 addEdge(d,{from:a.id,to:b.id,type:'sequence'});
 const revised=reviewServiceFlow(d);
 assert.equal(revised.requiresParallelConfirmation,false);
 assert.equal(revised.precedenceCount,1);
 assert.deepEqual(revised.isolatedNodes,[]);assert.equal(revised.independentGroups.length,1);
});

test('auditoria considera sequência com toque do cliente, sem exigir conexão artificial',()=>{
 const d=createDocument('Passagem'),a=addNode(d,{type:'touchpoint',title:'Chegada'}),b=addNode(d,{type:'activity',title:'Recepção',team:'Equipe'});
 addEdge(d,{from:a.id,to:b.id,type:'sequence'});
 assert.equal(reviewServiceFlow(d).requiresParallelConfirmation,false);
});

test('diagnóstico informa concentração da espera, não confunde com número de clientes',()=>{
 const result={teamStats:[{name:'Atendimento',waiting:60},{name:'Clínica',waiting:20}],events:[{task:true,wait:60},{task:true,wait:20},{task:false,wait:0}]};
 const explanation=serviceDiagnosis(result);
 assert.equal(explanation.team,'Atendimento');assert.equal(explanation.share,75);
 assert.match(explanation.text,/75%/);assert.equal(explanation.severity,'warning');
});

test('diagnóstico sem fila não inventa gargalo',()=>{
 const explanation=serviceDiagnosis({teamStats:[{name:'Equipe',waiting:0}],events:[]});
 assert.equal(explanation.severity,'good');assert.equal(explanation.team,undefined);
});


test('dois fluxos internos completos sem transferência ainda exigem confirmação do paralelismo',()=>{
 const d=createDocument('Dois fluxos');
 const a=addNode(d,{type:'activity',title:'Recepção',team:'A'}),b=addNode(d,{type:'activity',title:'Triagem',team:'A'});
 const c=addNode(d,{type:'activity',title:'Consulta',team:'B'}),e=addNode(d,{type:'activity',title:'Pagamentos',team:'B'});
 addEdge(d,{from:a.id,to:b.id,type:'sequence'});addEdge(d,{from:c.id,to:e.id,type:'sequence'});
 const review=reviewServiceFlow(d);
 assert.equal(review.isolatedNodes.length,0);
 assert.equal(review.independentGroups.length,2);
 assert.equal(review.requiresParallelConfirmation,true);
 assert(review.warnings.some(w=>w.key==='parallel'));
 addEdge(d,{from:b.id,to:c.id,type:'sequence'});
 assert.equal(reviewServiceFlow(d).requiresParallelConfirmation,false);
});
