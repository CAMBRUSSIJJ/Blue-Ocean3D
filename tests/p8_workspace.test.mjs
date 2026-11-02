import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProjectStore} from '../app/p8-projects.mjs';
import {workflowModel,renderWorkflowBoard} from '../app/p8-workflow.mjs';

function localStore(){
 const memory=new Map();return {getItem:k=>memory.get(k)||null,setItem:(k,v)=>{memory.set(k,v)}};
}
const doc=name=>({name,updatedAt:'2026-11-02',environments:[{id:'a',name:'Recepção',color:'#155eef'}],nodes:[{id:'n1',type:'activity',title:'Receber cliente',environmentId:'a',stage:0,duration:3,team:'Recepção'}],edges:[]});
test('P8: existing local project is registered without changing document',()=>{
 const d=doc('Clínica');const original=JSON.stringify(d);
 const store=makeProjectStore(localStore(),d);
 assert.equal(store.list().length,1);
 assert.equal(store.list()[0].name,'Clínica');
 assert.equal(JSON.stringify(d),original);
});
test('P8: creating new project never replaces original document',()=>{
 const store=makeProjectStore(localStore(),doc('Original'));
 const initial=store.activeId();
 store.create(doc('Novo'));
 assert.equal(store.list().length,2);
 assert.equal(store.list()[0].name,'Novo');
 const restored=store.open(initial);
 assert.equal(restored.name,'Original');
});
test('P8: saving a project changes only active project',()=>{
 const store=makeProjectStore(localStore(),doc('Original'));
 const oldId=store.activeId();
 store.create(doc('Segundo'));
 store.save(doc('Segundo editado'));
 assert.equal(store.open(oldId).name,'Original');
 assert.equal(store.list().length,2);
});
test('P8: workflow uses the canonical activities and does not mutate source',()=>{
 const d=doc('Clínica'),snapshot=JSON.stringify(d);
 const flow=workflowModel(d);
 assert.equal(flow.steps.length,1);
 assert.equal(flow.steps[0].title,'Receber cliente');
 assert.equal(JSON.stringify(d),snapshot);
 assert.match(renderWorkflowBoard(d),/Receber cliente/);
});
test('P8: flow escapes user-supplied labels as HTML',()=>{
 const d=doc('Clínica');d.nodes[0].title='<script>bad</script>';
 const html=renderWorkflowBoard(d);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
