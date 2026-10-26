import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJourneyGraph,journeySimulationSummary} from '../app/journey-flow.mjs';
import {simulateService} from '../app/simulation.mjs';
import {environmentDemo} from '../app/environments.mjs';

function fixture(){
 const doc=environmentDemo();
 // Fixture extends the actual canonical demo instead of writing a copied schema.
 const original=doc.nodes[0];
 const make=(id,title,environmentId,duration=5)=>({...original,id,title,type:'activity',
  environmentId,stage:0,team:'P3 QA',duration,cost:0});
 const one=doc.environments[0]?.id,two=doc.environments[1]?.id;
 doc.nodes=[make('arrive','Chegada',two,2),make('triage','Triagem',one,3),
  make('care','Atendimento',two,4),make('invoice','Cobrança',one,2),make('loose','Sem vínculo',null,1)];
 const sample=doc.edges[0]||{id:'edge',type:'sequence'};
 doc.edges=[
  {...sample,id:'p3-a',from:'arrive',to:'triage',type:'sequence'},
  {...sample,id:'p3-b',from:'triage',to:'care',type:'handoff'},
  {...sample,id:'p3-c',from:'triage',to:'invoice',type:'dependency'},
  {...sample,id:'p3-resource',from:'loose',to:'invoice',type:'resource'}
 ];
 return doc;
}
test('P3: journey order follows precedence, never room grouping',()=>{
 const g=buildJourneyGraph(fixture());
 const ids=g.tasks.map(t=>t.id);
 assert.ok(ids.indexOf('arrive')<ids.indexOf('triage'));
 assert.ok(ids.indexOf('triage')<ids.indexOf('care'));
 assert.ok(ids.indexOf('triage')<ids.indexOf('invoice'));
 assert.equal(g.precedenceCount,3);
 assert.equal(g.tasks.find(t=>t.id==='triage').outgoing,2);
 assert.equal(g.tasks.find(t=>t.id==='loose').isolated,true);
 assert.equal(g.unassignedCount,1);
 assert.equal(g.branchCount,1);
});
test('P3: no silent truncation for 30 activities',()=>{
 const doc=fixture(),sample=doc.nodes[0];
 for(let n=0;n<30;n++)doc.nodes.push({...sample,id:'extra-'+n,title:'Etapa '+n});
 assert.equal(buildJourneyGraph(doc).tasks.length,35);
});
test('P3: imported cyclic graph remains visible and explicitly flagged',()=>{
 const doc=fixture();doc.edges.push({id:'cycle',from:'care',to:'arrive',type:'sequence'});
 const g=buildJourneyGraph(doc);
 assert.equal(g.cyclic,true);
 assert.equal(g.tasks.length,doc.nodes.length);
});
test('P3: events come from deterministic simulator and preserve planned minutes',()=>{
 const doc=fixture();
 const result=simulateService(doc,{cases:2,arrivalInterval:0,teamCapacity:1});
 const atStart=journeySimulationSummary(doc,result,0,1);
 const atEnd=journeySimulationSummary(doc,result,result.metrics.elapsed,1);
 assert.equal(atEnd.rows.length,5);
 assert.ok(atEnd.rows.every(t=>t.status==='complete'));
 assert.ok(atStart.rows.some(t=>t.status!=='complete'));
 assert.deepEqual(atEnd.rows.map(x=>x.duration),buildJourneyGraph(doc).tasks.map(x=>x.duration));
 assert.equal(atEnd.peakWait.every(x=>x.totalWait>0),true);
 assert.equal(result.events.length,10);
});
test('P3: journey calculation does not mutate original document',()=>{
 const doc=fixture(),before=JSON.stringify(doc);
 buildJourneyGraph(doc);journeySimulationSummary(doc,{metrics:{elapsed:10},events:[]},5,1);
 assert.equal(JSON.stringify(doc),before);
});
