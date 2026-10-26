import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoDocument} from '../app/core.mjs';
import {simulateService,normalizeScenario} from '../app/simulation.mjs';
import {connectServiceCorridors,physicalRoute,setCorridor} from '../app/site-routing.mjs';
import {validateSpatialSettings,planSpatialTransfers,corridorHotspots} from '../app/spatial.mjs';
import {physicalTravellers,renderSiteTraffic} from '../app/site-traffic.mjs';
const demo=()=>{const doc=demoDocument();connectServiceCorridors(doc);return doc};
const baseline={cases:6,arrivalInterval:8,teamCapacity:1};
test('v2.2: cenário antigo continua idêntico por padrão',()=>{
 const d=demo();assert.deepEqual(normalizeScenario(baseline),{...baseline,teamCapacities:{}});
 const r=simulateService(d,baseline),off=simulateService(d,{...baseline,spatialEnabled:false});assert.deepEqual(r.events,off.events);assert.deepEqual(r.metrics,off.metrics);
});
test('v2.2: escala e velocidade são validadas',()=>{
 assert.throws(()=>validateSpatialSettings({walkingSpeed:0}),/Velocidade/);
 assert.throws(()=>validateSpatialSettings({metersPerCell:0.01}),/Escala/);
 assert.throws(()=>normalizeScenario({...baseline,spatialEnabled:true,walkingSpeed:999}),/Velocidade/);
});
test('v2.2: caminhada entra na prontidão, mas não modifica custo ou tempo de atendimento',()=>{
 const d=demo(),before=simulateService(d,baseline),after=simulateService(d,{...baseline,spatialEnabled:true});
 assert.ok(after.transfers.length>0);assert.ok(after.metrics.totalWalkingMinutes>0);
 assert.ok(after.metrics.averageCycle>=before.metrics.averageCycle);
 assert.equal(after.metrics.totalCost,before.metrics.totalCost);
 for(const e of before.events){const f=after.events.find(x=>x.caseIndex===e.caseIndex&&x.nodeId===e.nodeId);assert.ok(Math.abs(f.duration-e.duration)<1e-8)}
 assert.ok(after.transfers.every(t=>t.end>t.start&&Math.abs(t.minutes-t.meters/72)<1e-8));
});
test('v2.2: mais lenta caminhada aumenta o tempo de deslocamento e não antecipa início de atividades',()=>{
 const d=demo(),fast=simulateService(d,{...baseline,spatialEnabled:true,walkingSpeed:120}),slow=simulateService(d,{...baseline,spatialEnabled:true,walkingSpeed:30});
 assert.ok(slow.metrics.totalWalkingMinutes>fast.metrics.totalWalkingMinutes);
 assert.ok(slow.metrics.averageCycle>=fast.metrics.averageCycle);
});
test('v2.2: rota ausente bloqueia modo espacial sem quebrar modo clássico',()=>{
 const d=demo(),links=planSpatialTransfers(d,{spatialEnabled:true});assert.ok(links.size);
 const transit=[...links.values()][0];const middle=transit.route.find(p=>!p.roomId);assert.ok(middle);
 setCorridor(d,Math.floor(middle.x),Math.floor(middle.y),false);
 assert.throws(()=>simulateService(d,{...baseline,spatialEnabled:true}),/Não existe percurso físico/);
 assert.ok(simulateService(d,baseline).metrics.averageCycle>0);
});
test('v2.2: deslocamento usa eventos calculados, e não janela ilustrativa de 2 minutos',()=>{
 const d=demo(),r=simulateService(d,{...baseline,spatialEnabled:true,walkingSpeed:12,metersPerCell:2});
 const t=r.transfers[0],minute=t.start+(t.end-t.start)/2;
 const moving=physicalTravellers(d,r,minute);assert.ok(moving.some(a=>a.caseIndex===t.caseIndex&&a.status.includes('incluído')));
 assert.ok(renderSiteTraffic(d,r,minute).html.includes('sim21-traffic-svg'));
});
test('v2.2: identificador de versão e controles de caminhada e 3D presentes',()=>{
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');assert.match(html,/BUILDER<br>2\.[23456]/);
 assert.match(html,/id="sim22-enable-walking"/);assert.match(html,/id="sim22-mode-site-3d"/);
 assert.equal((html.match(/class="rail-btn/g)||[]).length,2);
});
test('v2.2: mapa de concentração preserva contagem máxima sem alterar eventos',()=>{
 const d=demo(),r=simulateService(d,{...baseline,spatialEnabled:true,walkingSpeed:12});const before=JSON.stringify(r.events);
 const h=corridorHotspots(r);assert.ok(h.peak>=0);assert.ok(h.hotspots.every(p=>p.maxSimultaneous<=baseline.cases));
 assert.equal(JSON.stringify(r.events),before);
});
