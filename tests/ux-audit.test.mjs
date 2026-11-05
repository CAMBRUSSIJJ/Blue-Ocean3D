import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoDocument} from '../app/core.mjs';
import {validateRoomPosition,moveRoom,roomSpot} from '../app/site-overview.mjs';
import {setCorridor} from '../app/site-routing.mjs';

test('room drag preview rejects collisions and corridors without mutating the project',()=>{
 const doc=demoDocument(),id=doc.environments[1].id;
 setCorridor(doc,18,25,true);
 const before=JSON.stringify(doc);
 assert.deepEqual(validateRoomPosition(doc,id,14,10),{x:14,y:10});
 assert.throws(()=>validateRoomPosition(doc,id,0,0),/mesmo espaço/);
 assert.throws(()=>validateRoomPosition(doc,id,14,20),/corredor/);
 for(const [x,y] of [[-1,0],[191,0],[0,191],[.5,0],[NaN,0]]){
  assert.throws(()=>validateRoomPosition(doc,id,x,y),/fora/);
 }
 assert.equal(JSON.stringify(doc),before);
 moveRoom(doc,id,14,10);
 assert.deepEqual(roomSpot(doc,id),{x:14,y:10});
 const imported={environments:[{id:'room'}]};
 assert.deepEqual(validateRoomPosition(imported,'room',4,4),{x:4,y:4});
 assert.deepEqual(imported,{environments:[{id:'room'}]});
});

test('CSS priority is explicit and the design system has no important overrides',()=>{
 const read=name=>readFileSync(new URL('../app/'+name,import.meta.url),'utf8');
 const files=JSON.parse(read('css-manifest.json'));
 assert.equal(new Set(files).size,files.length);
 for(const file of files)assert.doesNotMatch(read(file),/!\s*important\b/i,file);
 assert.equal(files.at(-1),'blue-ocean-light.css');
 assert.ok(files.indexOf('ux-audit.css')>files.indexOf('workspace.css'));
 const bundle=read('styles-bundle.css');
 assert.equal((bundle.match(/!important/g)||[]).length,1);
 assert.match(bundle,/\[hidden\] \{ display: none !important; \}/);
 assert.ok(bundle.includes('@layer sb-ux-audit {'));
});
