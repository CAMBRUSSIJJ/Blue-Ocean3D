import test from 'node:test';
import assert from 'node:assert/strict';
import {describeFlow} from '../app/p72-flow.mjs';

const sample = () => ({
 environments:[{id:'recepcao',name:'Recepção'}],
 nodes:[{id:'a',type:'activity',environmentId:'recepcao'}],
 edges:[]
});

test('P7.2: empty project starts with one create-room action',()=>{
 const doc={environments:[],nodes:[],edges:[]};
 for(const mode of ['overview','three','visual','cards']){
  const state=describeFlow(doc,mode,null);
  assert.equal(state.primary[0],'create-room');
 }
});
test('P7.2: planning offers the room canvas, not a forced wizard',()=>{
 const state=describeFlow(sample(),'overview','recepcao');
 assert.deepEqual(state.primary,['create-room','Novo ambiente']);
 assert.deepEqual(state.secondary,['open-room','Abrir ambiente 3D']);
});
test('P7.2: editor keeps one main contextual action',()=>{
 assert.equal(describeFlow(sample(),'three','recepcao').primary[0],'furniture');
 assert.equal(describeFlow(sample(),'visual','recepcao').primary[0],'building-tools');
});
test('P7.2: unconnected activities are guided to create/link before simulation',()=>{
 const d=sample();
 assert.equal(describeFlow({...d,nodes:[]},'cards','recepcao').primary[0],'new-activity');
 assert.equal(describeFlow(d,'cards','recepcao').primary[0],'new-activity');
 d.nodes.push({id:'b',type:'activity',environmentId:'recepcao'});
 assert.equal(describeFlow(d,'cards','recepcao').primary[0],'connect-activity');
 d.edges.push({id:'e1',from:'a',to:'b',type:'sequence'});
 assert.equal(describeFlow(d,'cards','recepcao').primary[0],'simulate');
});
test('P7.2: view description is pure and does not modify project data',()=>{
 const doc=sample(), before=JSON.stringify(doc);
 describeFlow(doc,'cards','recepcao');
 assert.equal(JSON.stringify(doc),before);
});
