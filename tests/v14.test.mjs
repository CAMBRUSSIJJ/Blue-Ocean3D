import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDocument} from '../app/core.mjs';
import {ensureFloorplan,autoFurnish,validFurniture,reconcileFloorplan,moveFurniture,rotateFurniture} from '../app/floorplan.mjs';
import {setRoomScale,cellMeters,setEdge} from '../app/floorplan-navigation.mjs';
import {wallHeight,setWallHeight,wallSceneHeight,DEFAULT_WALL_HEIGHT} from '../app/room-style.mjs';
import {PREVIEW_KIND,thumbnail} from '../app/room-catalog.mjs';
import {simulateService} from '../app/simulation.mjs';
test('v1.4: alturas independentes por ambiente e exportáveis',()=>{
 const d=demoDocument(),[a,b]=d.environments;
 assert.equal(wallHeight(d,a.id),DEFAULT_WALL_HEIGHT);
 setWallHeight(d,a.id,3.4);
 setWallHeight(d,b.id,2.5);
 assert.equal(wallHeight(d,a.id),3.4);
 assert.equal(wallHeight(d,b.id),2.5);
 assert.equal(wallHeight(JSON.parse(JSON.stringify(d)),a.id),3.4);
 assert.equal(wallSceneHeight(d,a.id,cellMeters(d,a.id)),3.4/.75);
});
test('v1.4: limita altura e rejeita ambientes inválidos',()=>{
 const d=demoDocument(),id=d.environments[0].id;
 for(const invalid of [-3,0,1.79,4.21,NaN,'',null,'nada']) assert.throws(()=>setWallHeight(d,id,invalid));
 assert.throws(()=>setWallHeight(d,'nao-existe',2.7),/ambiente/);
 assert.equal(wallHeight(d,id),DEFAULT_WALL_HEIGHT);
 assert.equal(setWallHeight(d,id,1.8),1.8);
 assert.equal(setWallHeight(d,id,4.2),4.2);
});
test('v1.4: reconciliação remove altura de salas deletadas',()=>{
 const d=demoDocument(),id=d.environments[0].id;
 setWallHeight(d,id,3);
 d.environments=d.environments.filter(e=>e.id!==id);
 reconcileFloorplan(d);
 assert.equal(ensureFloorplan(d).wallHeights[id],undefined);
});
test('v1.4: biblioteca visual contempla mobiliário sem imagem externa',()=>{
 const kinds=['counter','desk','station','waiting','chair','kiosk','shelf','plant'];
 assert.deepEqual(Object.keys(PREVIEW_KIND).sort(),kinds.sort());
 for(const kind of kinds){const html=thumbnail(kind);assert.match(html, /furn-preview/);assert.match(html,/aria-hidden="true"/);assert.doesNotMatch(html, /https?:\/\//)}
});
test('v1.4: mobiliário, paredes e alturas não alteram eventos temporais',()=>{
 const d=demoDocument(),opts={cases:6,arrivalInterval:9,teamCapacity:2},before=simulateService(d,opts);
 const first=d.environments[0];
 autoFurnish(d,first.id);setRoomScale(d,first.id,.95);setWallHeight(d,first.id,3.1);
 setEdge(d,first.id,'h',3,0,'door');
 const after=simulateService(d,opts);
 assert.deepEqual(after.events,before.events);
 assert.deepEqual(after.metrics,before.metrics);
});
test('v1.4: objetos preservam seleção geométrica após rotação',()=>{
 const d=demoDocument();autoFurnish(d,d.environments[0].id);
 const obj=validFurniture(d).find(o=>o.kind==='waiting');
 assert.ok(obj);
 rotateFurniture(d,obj.id);
 assert.equal(validFurniture(d).find(o=>o.id===obj.id).rotation,90);
});
