import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJourneyGraph,journeySimulationSummary} from '../app/journey-flow.mjs';
import {simulateService} from '../app/simulation.mjs';
import {createDocument} from '../app/core.mjs';

function fixture(){
 const doc=createDocument('P3 QA');
 const room1={id:'room-reception',name:'Recepção',color:'#168B86'};
 const room2={id:'room-clinic',name:'Consultório',color:'#567BB5'};
 doc.environments=[room1,room2];
 const make=(id,title,environmentId,duration=5,team='P3 QA',type='activity')=>({
  id,title,type,lane:type==='system'?'support':'front',stage:0,team,owner:'Pessoa',duration,
  x:10,y:10,...(environmentId?{environmentId}:{})
 });
 doc.nodes=[make('arrive','Chegada',room2.id,2),make('triage','Triagem',room1.id,3),
  make('care','Atendimento',room2.id,4,'Profissionais'),make('invoice','Cobrança',room1.id,2),
  make('loose','Sem vínculo',null,1),make('resource','Ferramenta',null,0,'P3 QA','system')];
 doc.edges=[
  {id:'p3-a',from:'arrive',to:'triage',type:'sequence'},
  {id:'p3-b',from:'triage',to:'care',type:'handoff',label:'encaminhado'},
  {id:'p3-c',from:'triage',to:'invoice',type:'dependency'},
  {id:'p3-resource',from:'loose',to:'resource',type:'resource'}
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
 assert.equal(g.tasks.length,5);
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
 assert.equal(result.events.length,12);
});
test('P3: journey calculation does not mutate original document',()=>{
 const doc=fixture(),before=JSON.stringify(doc);
 buildJourneyGraph(doc);journeySimulationSummary(doc,{metrics:{elapsed:10},events:[]},5,1);
 assert.equal(JSON.stringify(doc),before);
});
