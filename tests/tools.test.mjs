import test from 'node:test';
import assert from 'node:assert/strict';
import {createDocument,addNode,addEdge} from '../app/core.mjs';
import {inferRelation,filterCommands,TOOLS} from '../app/tools.mjs';

const make=()=>{const d=createDocument('t');
  const a=addNode(d,{type:'activity',title:'Receber',team:'Recepção'}),b=addNode(d,{type:'activity',title:'Atender',team:'Clínica'}),
    c=addNode(d,{type:'activity',title:'Registrar',team:'Recepção'}),s=addNode(d,{type:'system',title:'Agenda',team:'TI'}),t=addNode(d,{type:'touchpoint',title:'Chegada'});
  return {d,a,b,c,s,t}};

test('inferRelation: equipes diferentes viram passagem com texto automático',()=>{const {d,a,b}=make();const r=inferRelation(d,a.id,b.id);assert.equal(r.type,'handoff');assert.match(r.label,/Receber/);assert.doesNotThrow(()=>addEdge(d,{from:a.id,to:b.id,...r}))});
test('inferRelation: mesma equipe vira sequência',()=>{const {d,a,c}=make();assert.equal(inferRelation(d,a.id,c.id).type,'sequence')});
test('inferRelation: destino sistema/recurso vira "usa recurso"',()=>{const {d,a,s}=make();const r=inferRelation(d,a.id,s.id);assert.equal(r.type,'resource');assert.doesNotThrow(()=>addEdge(d,{from:a.id,to:s.id,...r}))});
test('inferRelation: sem passagem quando um dos lados não é atividade/decisão',()=>{const {d,s,a}=make();assert.equal(inferRelation(d,s.id,a.id).type,'sequence')});
test('inferRelation: não repete conexão existente e propõe a próxima opção',()=>{const {d,a,b}=make();addEdge(d,{from:a.id,to:b.id,...inferRelation(d,a.id,b.id)});assert.equal(inferRelation(d,a.id,b.id).type,'sequence')});
test('inferRelation: retorna null para peça ausente, mesma peça ou tudo já conectado',()=>{const {d,a,c}=make();assert.equal(inferRelation(d,a.id,a.id),null);assert.equal(inferRelation(d,a.id,'x'),null);addEdge(d,{from:a.id,to:c.id,type:'sequence'});assert.equal(inferRelation(d,a.id,c.id),null)});
test('filterCommands: ignora acentos e exige todos os termos',()=>{const L=[{label:'Ir para Simular',keywords:'simulação filas'},{label:'Adicionar atividade',keywords:'criar peça'},{label:'Adicionar etapa',keywords:'coluna'}];
  assert.deepEqual(filterCommands(L,'simulacao').map(c=>c.label),['Ir para Simular']);
  assert.deepEqual(filterCommands(L,'adicionar et').map(c=>c.label),['Adicionar etapa']);
  assert.equal(filterCommands(L,'xyz').length,0);assert.equal(filterCommands(L,'').length,3)});
test('filterCommands: título que começa com o termo vem primeiro e há limite de resultados',()=>{const L=[{label:'Ir para Ajustar',keywords:''},{label:'Ajustar cenário',keywords:''}];assert.equal(filterCommands(L,'ajustar')[0].label,'Ajustar cenário');assert.equal(filterCommands(Array.from({length:30},(_,i)=>({label:'c'+i})),'c').length,12)});
test('ferramentas têm teclas únicas',()=>{assert.equal(new Set(TOOLS.map(t=>t.key)).size,TOOLS.length)});
