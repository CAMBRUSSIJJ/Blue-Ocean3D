import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDocument} from '../app/core.mjs';
import {createRoom} from '../app/environments.mjs';
import {putFurniture} from '../app/floorplan.mjs';
import {summarizeProject,normalizeProposals,applyApprovedProposals,AI_FURNITURE} from '../app/ai-core.mjs';
const start=()=>{const d=createDocument('Serviço teste');createRoom(d,{name:'Recepção',team:'Atendimento'});return d};
test('v2.5: resumo não expõe documento completo e identifica ambientes',()=>{
 const d=start();const s=summarizeProject(d,{includeSimulation:false});
 assert.equal(s.environments[0].name,'Recepção');assert.equal(s.name,'Serviço teste');
 assert.ok(!('roomTemplates' in s));assert.equal(s.roomGrid.columns,12);
});
test('v2.5: proposta aprovada cria sala, atividade e móvel de forma atômica',()=>{
 const doc=start();const actions=[
  {type:'create_room',name:'Sala de espera',team:'Atendimento'},
  {type:'add_furniture',room:'Sala de espera',kind:'chair',x:2,y:2},
  {type:'add_activity',room:'Sala de espera',title:'Orientar cliente',duration:4,team:'Atendimento'}
 ];
 const {document,report}=applyApprovedProposals(doc,actions);
 assert.equal(report.length,3);
 assert.equal(document.environments.length,2);
 assert.equal(document.floorplan.objects.length,1);
 assert.ok(document.nodes.some(n=>n.title==='Orientar cliente'&&n.environmentId===document.environments[1].id));
 assert.equal(doc.environments.length,1);assert.equal(doc.floorplan?.objects?.length||0,0);
});
test('v2.5: ação maliciosa e atributos extras não são executados',()=>{
 assert.throws(()=>normalizeProposals([{type:'execute_shell',command:'rm -rf /'}]),/não permitida/);
 assert.throws(()=>normalizeProposals([{type:'add_furniture',room:'Recepção',kind:'malware',x:1,y:1}]),/inválidos/);
 assert.throws(()=>normalizeProposals(Array.from({length:13},()=>({type:'create_room',name:'X'}))),/12/);
 const normalized=normalizeProposals([{type:'create_room',name:'Nova',command:'do something'}]);
 assert.ok(!('command' in normalized[0]));
});
test('v2.5: colisão faz rollback integral inclusive em plano parcialmente válido',()=>{
 const doc=start();const room=doc.environments[0];putFurniture(doc,{roomId:room.id,kind:'desk',x:1,y:1});
 const before=JSON.stringify(doc);
 assert.throws(()=>applyApprovedProposals(doc,[
  {type:'create_room',name:'Sala teste'},
  {type:'add_furniture',room:'Recepção',kind:'chair',x:1,y:1}
 ]),/ocupado/);
 assert.equal(JSON.stringify(doc),before);
});
test('v2.5: versão, painel, CSS, privacidade e proxy local presentes',()=>{
 const root=new URL('../',import.meta.url),html=readFileSync(new URL('app/index.html',root),'utf8');
 assert.match(html,/id="ai-launch"/);assert.match(html,/id="ai-panel"/);
 assert.equal((html.match(/class="rail-btn/g)||[]).length,2);
 const server=readFileSync(new URL('scripts/server.py',root),'utf8');
 assert.match(server,/OLLAMA_BASE = 'http:\/\/127\.0\.0\.1:11434'/);
 assert.match(server,/if origin and origin not in allowed_origins/);
 assert.match(server,/max|MAX_BODY/);
});
