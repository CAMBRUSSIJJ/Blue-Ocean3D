import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDocument} from '../app/core.mjs';
import {autoFurnish,validFurniture,putFurniture,moveFurniture,linkFurniture} from '../app/floorplan.mjs';
import {setRoomScale,cellMeters,setEdge} from '../app/floorplan-navigation.mjs';
import {simulateService} from '../app/simulation.mjs';

test('v1.3: mobiliar automaticamente afeta somente o ambiente aberto',()=>{
 const d=demoDocument();const [a,b]=d.environments;
 assert(autoFurnish(d,a.id)>0);
 assert(validFurniture(d).every(o=>o.roomId===a.id));
 const first=validFurniture(d).filter(o=>o.roomId===a.id).length;
 assert(autoFurnish(d,b.id)>0);
 assert.equal(validFurniture(d).filter(o=>o.roomId===a.id).length,first);
 assert(validFurniture(d).some(o=>o.roomId===b.id));
});
test('v1.3: mobiliar outra sala não altera móveis e escala da primeira',()=>{
 const d=demoDocument();const [a,b]=d.environments;
 setRoomScale(d,a.id,1.4);const desk=putFurniture(d,{roomId:a.id,kind:'desk',x:0,y:0});
 putFurniture(d,{roomId:b.id,kind:'counter',x:0,y:0});
 assert.equal(validFurniture(d).filter(o=>o.roomId===a.id).length,1);
 assert.equal(cellMeters(d,a.id),1.4);
 assert.equal(cellMeters(d,b.id),.75);
 moveFurniture(d,desk.id,4,4);
 assert.equal(validFurniture(d).find(o=>o.id===desk.id).x,4);
 assert.equal(validFurniture(d).find(o=>o.roomId===b.id).x,0);
});
test('v1.3: postos vinculados permanecem na mesma atividade independentemente da visualização',()=>{
 const d=demoDocument(),n=d.nodes.find(n=>n.environmentId&&n.type==='activity');
 const obj=putFurniture(d,{roomId:n.environmentId,kind:'station',x:3,y:3,nodeId:n.id});
 assert.equal(JSON.parse(JSON.stringify(d)).floorplan.objects.find(o=>o.id===obj.id).nodeId,n.id);
 assert.throws(()=>linkFurniture(d,obj.id,d.nodes.find(n=>n.environmentId!==obj.roomId).id),/mesmo ambiente/);
});
test('v1.3: construção e objetos não alteram resultados operacionais',()=>{
 const d=demoDocument(),options={cases:7,arrivalInterval:7,teamCapacity:2};const baseline=simulateService(d,options);
 for(const room of d.environments)autoFurnish(d,room.id);
 setRoomScale(d,d.environments[0].id,1.2);
 setEdge(d,d.environments[0].id,'h',4,0,'door');
 const next=simulateService(d,options);
 assert.deepEqual(next.events,baseline.events);assert.deepEqual(next.metrics,baseline.metrics);
});
