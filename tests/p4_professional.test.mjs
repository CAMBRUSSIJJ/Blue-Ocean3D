import test from 'node:test';
import assert from 'node:assert/strict';
import {createDocument} from '../app/core.mjs';
import {captureLayout,saveLayoutBaseline,readLayoutBaseline,compareLayouts,layoutMapSVG,metricComparison,professionalReportHTML,LAYOUT_BASELINE_KEY} from '../app/professional-review.mjs';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function fixture(){
 const d=createDocument('Clínica & teste');
 d.environments=[{id:'reception',name:'Recepção',color:'#008888'},{id:'care',name:'Consultório',color:'#3377AA'}];
 d.floorplan={objects:[
  {id:'desk-1',roomId:'reception',kind:'desk',x:1,y:1,rotation:0},
  {id:'chair-1',roomId:'reception',kind:'chair',x:4,y:3,rotation:0}
 ],segments:[{roomId:'reception',axis:'h',x:0,y:0,type:'wall'}],corridors:[{x:1,y:1}],scales:{reception:.75}};
 return d;
}
const fakeStorage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
test('P4: reference persists only for matching project and never changes document',()=>{
 const storage=fakeStorage(),doc=fixture(),before=JSON.stringify(doc);
 const saved=saveLayoutBaseline(doc,storage);
 assert.equal(JSON.stringify(doc),before);
 assert.equal(saved.projectId,doc.id);
 assert.equal(readLayoutBaseline(doc,storage).objects.length,2);
 assert.ok(storage.getItem(LAYOUT_BASELINE_KEY));
 assert.equal(readLayoutBaseline({...doc,id:'other'},storage),null);
 storage.setItem(LAYOUT_BASELINE_KEY,'not-json');
 assert.equal(readLayoutBaseline(doc,storage),null);
});
test('P4: detects actual furniture movement and physical changes, not inferred operational savings',()=>{
 const doc=fixture(),baseline=captureLayout(doc);
 doc.floorplan.objects[0].x=5;
 doc.floorplan.objects.push({id:'table-1',roomId:'care',kind:'table',x:2,y:2});
 doc.floorplan.segments.push({roomId:'reception',axis:'v',x:0,y:0,type:'door'});
 doc.floorplan.corridors.push({x:2,y:1});
 doc.floorplan.scales.reception=1;
 const diff=compareLayouts(baseline,doc);
 assert.equal(diff.changed.length,1);
 assert.equal(diff.added.length,1);
 assert.equal(diff.wallChanges,1);
 assert.equal(diff.corridorChanges,1);
 assert.equal(diff.scalesChanged.length,1);
 assert.equal(diff.hasChanges,true);
 assert.deepEqual(compareLayouts(captureLayout(doc),doc).hasChanges,false);
 assert.throws(()=>compareLayouts(baseline,{...doc,id:'new-id'}),/outro projeto/);
});
test('P4: before/after SVG remains self-contained and escapes object kinds',()=>{
 const doc=fixture(),snap=captureLayout(doc);
 snap.objects[0].kind='desk"><script>alert(1)</script>';
 const svg=layoutMapSVG(snap,'reception');
 assert.match(svg,/viewBox="0 0 456 304"/);
 assert.doesNotMatch(svg,/<script>/);
 assert.match(svg,/&lt;script&gt;/);
 assert.match(svg,/aria-label="Planta esquemática/);
});
test('P4: report summarizes real metrics and distinguishes baseline from present',()=>{
 const doc=fixture(),snap=captureLayout(doc);doc.floorplan.objects[0].y=3;
 const simulated={settings:{cases:5,arrivalInterval:6,teamCapacity:2,spatialEnabled:false},
  metrics:{elapsed:95,averageCycle:35,averageWait:8,totalCost:1200},
  teamStats:[{name:'Recepção',capacity:2,utilization:.35,waiting:6}],
  warnings:['Cenário <hipotético>']};
 const base={metrics:{elapsed:100,averageCycle:40,averageWait:10,totalCost:1100}};
 const rows=metricComparison(base,simulated);
 assert.equal(rows.find(x=>x.key==='averageWait').delta,-2);
 const html=professionalReportHTML({doc,result:simulated,reference:base,layoutBaseline:snap});
 assert.match(html,/Clínica &amp; teste/);
 assert.match(html,/Espera média/);
 assert.match(html,/−?2 min|\-2 min/);
 assert.match(html,/móveis incluídos: 0; removidos: 0; modificados: 1/);
 assert.match(html,/Cenário &lt;hipotético&gt;/);
 assert.match(html,/não alteram automaticamente o tempo de atendimento/);
 assert.doesNotMatch(html,/<hipotético>/);
 assert.throws(()=>professionalReportHTML({doc}),/simulação/);
});
test('P4: controls and generated CSS are wired to canonical screens',()=>{
 assert.match(read('app/environments-ui.mjs'),/initLayoutReview\(/);
 assert.match(read('app/index.html'),/id="p4-export-report"/);
 assert.match(read('app/simulation-ui.mjs'),/professionalReportHTML\(/);
 assert.equal(JSON.parse(read('app/css-manifest.json')).at(-1),'professional-review.css');
});
