import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDocument,createDocument,addNode,addEdge,clone} from '../app/core.mjs';
import {EXPLORE_VIEWS,exploreProjection,graphLayout,exploreReportCsv,fold} from '../app/explore.mjs';

test('quatro perspectivas compartilham exatamente o mesmo modelo',()=>{
 const d=demoDocument(),before=JSON.stringify(d);
 for(const view of EXPLORE_VIEWS){const p=exploreProjection(d,{view:view.id});assert.equal(p.nodes.length,d.nodes.length);assert.equal(p.total.nodes,8);const l=graphLayout(p);assert.equal(l.positions.size,8);assert(l.groups.length>0);}
 assert.equal(JSON.stringify(d),before);
});
test('etapas vazias aparecem sem inventar componentes',()=>{
 const d=createDocument(),p=exploreProjection(d,{view:'stages'});
 assert.equal(p.groups.length,d.stages.length);assert.equal(p.nodes.length,0);assert.equal(p.edges.length,0);
});
test('equipes agrupadas por identidade textual e sem equipe',()=>{
 const d=createDocument();addNode(d,{team:'Atendimento'});addNode(d,{team:'Atendimento'});addNode(d,{team:''});
 const p=exploreProjection(d,{view:'teams'});assert.equal(p.groups.length,2);assert.equal(p.groups.find(g=>g.label==='Atendimento').nodes.length,2);
 assert.equal(p.groups.find(g=>g.label==='Sem equipe').nodes.length,1);
});
test('relações entre equipes não são confundidas com outras conexões',()=>{
 const d=demoDocument(),p=exploreProjection(d,{view:'teams'});
 assert(p.edges.every(e=>e.type==='handoff'));assert.equal(p.stats.handoffs,d.edges.filter(e=>e.type==='handoff').length);
});
test('dependências geram camadas topológicas e são filtradas por padrão',()=>{
 const d=createDocument(),a=addNode(d,{title:'A'}),b=addNode(d,{title:'B'}),c=addNode(d,{title:'C'});
 addEdge(d,{from:a.id,to:b.id,type:'dependency'});addEdge(d,{from:b.id,to:c.id,type:'dependency'});
 const p=exploreProjection(d,{view:'dependencies'});assert.equal(p.edges.length,2);assert.deepEqual(p.groups.map(g=>g.label),['Ponto de partida','Após 1 dependência','Após 2 dependências']);
 assert.equal(p.groups[2].nodes[0].id,c.id);
});
test('visão recursos destaca apenas relações de utilização',()=>{
 const d=demoDocument(),p=exploreProjection(d,{view:'resources'});
 assert(p.edges.every(e=>e.type==='resource'));assert(p.groups.some(g=>g.id==='resources'));
});
test('filtro por etapa/equipe não altera dados e remove arestas incompletas',()=>{
 const d=demoDocument(),first=d.nodes[0];const p=exploreProjection(d,{view:'stages',stage:String(first.stage),team:first.team?.trim()||'Sem equipe'});
 assert(p.nodes.length>0);assert(p.nodes.every(n=>n.stage===first.stage));assert(p.edges.every(e=>p.nodes.some(n=>n.id===e.from)&&p.nodes.some(n=>n.id===e.to)));
 assert.equal(d.nodes.length,8);
});
test('busca insensível a acentos e pesquisa apenas propriedades do serviço',()=>{
 assert.equal(fold(' RÉCEpção  '),'recepcao');const d=demoDocument();d.nodes[0].title='Confirmação presencial';
 const p=exploreProjection(d,{search:'confirmacao'});assert(p.nodes.some(n=>n.id===d.nodes[0].id));
});
test('foco e filtro relacionado não excluem elementos do documento',()=>{
 const d=createDocument(),a=addNode(d,{title:'A'}),b=addNode(d,{title:'B'}),c=addNode(d,{title:'C'}),last=addNode(d,{title:'D'});
 addEdge(d,{from:a.id,to:b.id,type:'sequence'});addEdge(d,{from:b.id,to:c.id,type:'dependency'});
 const p=exploreProjection(d,{selected:a.id,onlyRelated:true});assert.deepEqual(p.nodes.map(n=>n.id).sort(),[a.id,b.id].sort());
 assert.equal(p.focus.id,a.id);assert.equal(p.downstream.length,3-1);assert(d.nodes.some(n=>n.id===last.id));
});
test('mini representação mantém cada componente na geometria uma única vez',()=>{
 const d=demoDocument(),p=exploreProjection(d,{view:'teams',relation:'all'}),geo=graphLayout(p);
 assert(geo.width>0&&geo.height>0);assert.equal(geo.positions.size,d.nodes.length);assert.equal(geo.links.length,d.edges.length);
 for(const e of geo.links){assert(e.from.x>=0&&e.to.y>=0);}
});
test('CSV exporta componentes da visão e neutraliza fórmulas ao abrir em planilhas',()=>{
 const d=createDocument(),a=addNode(d,{title:'=HYPERLINK("bad")'});a.owner=' +cmd';
 const p=exploreProjection(d),s=exploreReportCsv(d,p);
 assert(s.startsWith('\uFEFF'));assert(s.includes('Component'));assert(s.includes(a.id));assert(s.includes("'=HYPERLINK"));
});
test('resultados de exploração incluem advertências reais e não simulam duração',()=>{
 const d=demoDocument(),p=exploreProjection(d);
 assert.equal(p.stats.warnings,p.warnings.length);assert(!('simulatedTime' in p.stats));
 assert(p.warnings.every(w=>typeof w.text==='string'));
});
