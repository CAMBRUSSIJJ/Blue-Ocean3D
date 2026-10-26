import test from 'node:test';
import assert from 'node:assert/strict';
import {createDocument} from '../app/core.mjs';
import {createRoom} from '../app/environments.mjs';
import {applyApprovedProposals,normalizeProposals,readableAction} from '../app/ai-core.mjs';
import {siteRouteReport} from '../app/site-routing.mjs';
import {simulateService} from '../app/simulation.mjs';
const plan={type:'build_service',rooms:[
 {name:'Recepção nova',team:'Atendimento',scale:.75,activities:[{title:'Check-in',duration:5,team:'Atendimento'},{title:'Triagem',duration:4,team:'Atendimento'}],furniture:[{kind:'counter',x:2,y:2,activity:'Check-in'},{kind:'chair',x:8,y:2}],doors:[{wall:'bottom',offset:1}],walls:[]},
 {name:'Consultório novo',team:'Clínica',activities:[{title:'Consulta',duration:20,team:'Clínica'}],furniture:[{kind:'exam',x:3,y:2,activity:'Consulta'}],doors:[{wall:'bottom',offset:1}],walls:[]}
],connections:[{fromRoom:'Recepção nova',fromActivity:'Triagem',toRoom:'Consultório novo',toActivity:'Consulta'}],autoCorridors:true,linkInRoom:true};
const clone=x=>structuredClone(x);
test('v2.6: plano completo cria salas, móveis vinculados, atividades e conexões',()=>{
 const doc=createDocument('Serviço Novo'),{document:next,report}=applyApprovedProposals(doc,[plan]);
 assert.equal(doc.environments.length,0);
 assert.equal(next.environments.length,2);assert.equal(next.nodes.length,3);assert.equal(next.edges.length,2);
 assert.equal(next.floorplan.objects.length,3);assert.equal(next.floorplan.objects.filter(o=>o.nodeId).length,2);
 assert.ok(report.length>=3);
 assert.ok(readableAction(normalizeProposals([plan])[0]).includes('Projeto completo'));
 assert.equal(siteRouteReport(next).unlinked,0);
 const result=simulateService(next,{cases:3,arrivalInterval:10,teamCapacity:1});
 assert.ok(result.metrics.averageCycle>=20);
});
test('v2.6: ação desconhecida, referências inválidas e salas duplicadas são rejeitadas',()=>{
 assert.throws(()=>normalizeProposals([{...plan,rooms:[plan.rooms[0],clone(plan.rooms[0])]}]),/repetido/);
 assert.throws(()=>normalizeProposals([{...plan,connections:[{fromRoom:'Recepção nova',fromActivity:'Falsa',toRoom:'Consultório novo',toActivity:'Consulta'}]}]),/não está no plano/);
 assert.throws(()=>normalizeProposals([{...plan,rooms:[{...plan.rooms[0],furniture:[{kind:'script',x:1,y:1}]}]}]),/Móvel inválido/);
 assert.throws(()=>normalizeProposals([plan,{type:'create_room',name:'Outra'}]),/única proposta/);
 assert.throws(()=>normalizeProposals([{...plan,rooms:Array(7).fill({...plan.rooms[0]})}]),/6 itens/);
});
test('v2.6: colisão e paredes inválidas preservam byte a byte o documento',()=>{
 const d=createDocument('Base'),before=JSON.stringify(d);let bad=clone(plan);
 bad.rooms[0].furniture[1]={kind:'chair',x:2,y:2};
 assert.throws(()=>applyApprovedProposals(d,[bad]),/ocupado/);
 assert.equal(JSON.stringify(d),before);
 bad=clone(plan);bad.rooms[0].walls=[{axis:'h',x:100,y:3}];
 assert.throws(()=>applyApprovedProposals(d,[bad]),/grade/);
 assert.equal(JSON.stringify(d),before);
});
test('v2.6: construção em projeto existente não sobrescreve ambientes anteriores',()=>{
 const d=createDocument('Base');createRoom(d,{name:'Sala antiga'});
 const {document:next}=applyApprovedProposals(d,[{...plan,autoCorridors:false}]);
 assert.equal(d.environments.length,1);assert.equal(next.environments.length,3);
 assert.equal(next.environments[0].name,'Sala antiga');
 assert.throws(()=>applyApprovedProposals(d,[{...plan,rooms:[{...plan.rooms[0],name:'Sala antiga'}],connections:[]}]),/já existe/);
});
test('v2.6: opt-out evita conexão de corredores não solicitados',()=>{
 const d=createDocument('Novo');const next=applyApprovedProposals(d,[{...plan,autoCorridors:false}]).document;
 assert.equal(next.floorplan.corridors?.length||0,0);
 assert.equal(next.edges.length,2);
});
