import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectJourney} from '../app/journey-flow.mjs';

const node=(id,type,stage,environmentId)=>({id,type,stage,environmentId,title:'Etapa '+id,duration:5});
const edge=(id,from,to,type='sequence')=>({id,from,to,type});
const doc=()=>({
 stages:[{name:'Chegada'},{name:'Atendimento'},{name:'Saída'}],
 environments:[{id:'r1',name:'Recepção',color:'#226688'},{id:'r2',name:'Consultório',color:'#00aa99'}],
 nodes:[node('a','activity',0,'r1'),node('d','decision',0,'r1'),node('b','activity',1,'r2'),node('c','activity',1,'r1'),node('t','touchpoint',2,'r2'),node('orphan','activity',2,'r1'),node('res','resource',1,'r1')],
 edges:[edge('e1','a','d'),edge('e2','d','b'),edge('e3','d','c'),edge('e4','c','t','handoff'),edge('e5','b','res','resource')]
});

test('P2: read-only journey follows real edges, branches and cross-room handoffs',()=>{
 const original=doc(),before=JSON.stringify(original),graph=projectJourney(original);
 assert.equal(JSON.stringify(original),before,'projection must never mutate service');
 assert.equal(graph.total,6,'resource is not represented as journey step');
 assert.equal(graph.linked,5);
 assert.equal(graph.branches,1);
 assert.equal(graph.crossRoom,2);
 const decision=graph.steps.find(step=>step.id==='d');
 assert.deepEqual(decision.outgoing.map(l=>l.to),['b','c']);
 assert.equal(decision.branchCount,2);
 assert.ok(graph.columns[0].steps.some(step=>step.id==='a'));
 assert.ok(graph.columns.some(column=>column.steps.some(step=>step.id==='t')));
 assert.deepEqual(graph.unlinked.map(step=>step.id),['orphan']);
 assert.equal(graph.steps.find(step=>step.id==='b').environmentName,'Consultório');
 assert.equal(graph.steps.find(step=>step.id==='t').stageName,'Saída');
 assert.deepEqual(graph.cyclic,[]);
});

test('P2: never creates a fictitious sequence for unconnected nodes',()=>{
 const model=doc();model.edges=[];
 const graph=projectJourney(model);
 assert.equal(graph.linked,0);assert.equal(graph.columns.length,0);
 assert.equal(graph.unlinked.length,6);assert.equal(graph.branches,0);
});

test('P2: cyclic imported graphs produce review cards rather than hanging',()=>{
 const model=doc();model.edges=[edge('c1','a','d'),edge('c2','d','a')];
 const graph=projectJourney(model);
 assert.deepEqual(graph.cyclic.map(step=>step.id),['a','d']);
 assert.equal(graph.steps.length,6);
 assert.equal(graph.linked,2);
});

test('P2: journey renderer uses projection and no longer truncates activities',()=>{
 const src=readFileSync(new URL('../app/environments-ui.mjs',import.meta.url),'utf8');
 assert.match(src,/import \{projectJourney\} from '\.\/journey-flow\.mjs'/);
 assert.match(src,/projectJourney\(doc\)/);
 assert.match(src,/data-hybrid-step/);
 assert.match(src,/hybrid-flow-column/);
 assert.doesNotMatch(src,/\.slice\(0,14\)/);
 const manifest=JSON.parse(readFileSync(new URL('../app/css-manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.at(-1),'journey-flow.css');
});
