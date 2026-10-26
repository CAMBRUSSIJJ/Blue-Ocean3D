/**
 * P4 — read-only professional review of canonical physical layouts and scenarios.
 * No synthetic performance gain is inferred from moving furniture.
 * A baseline is browser-local and tied to the canonical project ID.
 */
export const LAYOUT_BASELINE_KEY='blue-ocean3d/layout-baseline/v1';
export function captureLayout(doc){
 const rooms=(doc.environments||[]).map(r=>({id:r.id,name:r.name}));
 const floor=doc.floorplan||{};
 const objects=(floor.objects||[]).map(o=>({id:o.id,roomId:o.roomId,kind:o.kind,
  x:o.x,y:o.y,rotation:o.rotation||0,width:o.width??null,height:o.height??null,nodeId:o.nodeId||''}));
 const segments=(floor.segments||[]).map(s=>({roomId:s.roomId,axis:s.axis,x:s.x,y:s.y,type:s.type}));
 const corridors=(floor.corridors||[]).map(c=>({x:c.x,y:c.y}));
 const scales=Object.fromEntries(Object.entries(floor.scales||{}).map(([k,v])=>[k,Number(v)]));
 return {version:1,projectId:doc.id,projectName:doc.name,at:new Date().toISOString(),
  rooms,objects,segments,corridors,scales};
}
export function saveLayoutBaseline(doc,storage=globalThis.localStorage){
 const snap=captureLayout(doc);
 storage.setItem(LAYOUT_BASELINE_KEY,JSON.stringify(snap));
 return snap;
}
export function readLayoutBaseline(doc,storage=globalThis.localStorage){
 let snap;try{snap=JSON.parse(storage.getItem(LAYOUT_BASELINE_KEY)||'null')}catch{return null}
 if(!snap||snap.version!==1||snap.projectId!==doc.id||!Array.isArray(snap.rooms)||
  !Array.isArray(snap.objects)||!Array.isArray(snap.segments)||!Array.isArray(snap.corridors))return null;
 return snap;
}
function key(s){return [s.roomId,s.axis,s.x,s.y,s.type].join('|')}
function coords(s){return [s.x,s.y].join('|')}
function same(a,b,properties){return properties.every(k=>a[k]===b[k])}
export function compareLayouts(previous,doc){
 if(!previous||previous.projectId!==doc.id)throw new Error('A referência pertence a outro projeto.');
 const current=captureLayout(doc);
 const oldRooms=new Map(previous.rooms.map(r=>[r.id,r]));
 const newRooms=new Map(current.rooms.map(r=>[r.id,r]));
 const oldObjects=new Map(previous.objects.map(o=>[o.id,o]));
 const newObjects=new Map(current.objects.map(o=>[o.id,o]));
 const addedRooms=current.rooms.filter(r=>!oldRooms.has(r.id));
 const removedRooms=previous.rooms.filter(r=>!newRooms.has(r.id));
 const renamedRooms=current.rooms.filter(r=>oldRooms.has(r.id)&&oldRooms.get(r.id).name!==r.name);
 const added=current.objects.filter(o=>!oldObjects.has(o.id));
 const removed=previous.objects.filter(o=>!newObjects.has(o.id));
 const changed=current.objects.filter(o=>oldObjects.has(o.id)&&
  !same(o,oldObjects.get(o.id),['roomId','kind','x','y','rotation','width','height','nodeId']));
 const oldSegments=new Set(previous.segments.map(key));
 const newSegments=new Set(current.segments.map(key));
 const oldCorridors=new Set(previous.corridors.map(coords));
 const newCorridors=new Set(current.corridors.map(coords));
 const wallChanges=[...newSegments].filter(k=>!oldSegments.has(k)).length+
  [...oldSegments].filter(k=>!newSegments.has(k)).length;
 const corridorChanges=[...newCorridors].filter(k=>!oldCorridors.has(k)).length+
  [...oldCorridors].filter(k=>!newCorridors.has(k)).length;
 const scalesChanged=Object.keys({...previous.scales,...current.scales}).filter(k=>previous.scales[k]!==current.scales[k]);
 const hasChanges=Boolean(addedRooms.length||removedRooms.length||renamedRooms.length||
  added.length||removed.length||changed.length||wallChanges||corridorChanges||scalesChanged.length);
 return {baseline:previous,current,addedRooms,removedRooms,renamedRooms,added,removed,changed,wallChanges,corridorChanges,scalesChanged,hasChanges};
}
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function layoutMapSVG(layout,roomId){
 const W=456,H=304,cell=32,xoff=36,yoff=23;
 const grid=Array.from({length:13},(_,i)=>`<path d="M${xoff+i*cell} ${yoff}v256" stroke="#c7d9d8"/>`).join('')+
  Array.from({length:9},(_,i)=>`<path d="M${xoff} ${yoff+i*cell}h384" stroke="#c7d9d8"/>`).join('');
 const rects=(layout.objects||[]).filter(o=>o.roomId===roomId).map(o=>{
  let w=o.width,h=o.height;
  if(!Number.isInteger(w)||!Number.isInteger(h)){
   const sizes={counter:[3,1],desk:[2,2],station:[2,2],waiting:[3,1],chair:[1,1],kiosk:[1,2],
    shelf:[2,1],plant:[1,1],bench:[3,1],table:[2,2],printer:[1,1],coffee:[1,1],
    exam:[3,1],screen:[2,1],stool:[1,1],door:[2,1]};
   [w,h]=sizes[o.kind]||[1,1];if(o.rotation===90)[w,h]=[h,w];
  }
  return `<rect x="${xoff+o.x*cell+2}" y="${yoff+o.y*cell+2}" width="${Math.max(4,w*cell-4)}" height="${Math.max(4,h*cell-4)}" fill="#73b6a5" stroke="#1e655d" rx="3"><title>${escapeHTML(o.kind)}</title></rect>`;
 }).join('');
 const walls=(layout.segments||[]).filter(s=>s.roomId===roomId).map(s=>{
  const x=xoff+s.x*cell,y=yoff+s.y*cell;
  const line=s.axis==='v'?`M${x} ${y}v32`:`M${x} ${y}h32`;
  return `<path d="${line}" stroke="${s.type==='door'?'#1a9d7f':s.type==='open'?'#e2b46d':'#415f6b'}" stroke-width="4"/>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Planta esquemática do ambiente, grade de doze por oito células"><rect width="${W}" height="${H}" rx="10" fill="#f3f8f8"/>${grid}${rects}${walls}</svg>`;
}
export function metricComparison(base,current){
 if(!current)return [];
 const fields=[['elapsed','Duração do cenário','min'],['averageCycle','Ciclo médio','min'],
  ['averageWait','Espera média','min'],['totalCost','Custo estimado','R$'],
  ['totalWalkingMeters','Percurso total','m']];
 return fields.filter(([key])=>Number.isFinite(current.metrics?.[key])&&(!base||Number.isFinite(base.metrics?.[key])))
  .map(([key,name,unit])=>({key,name,unit,reference:base?base.metrics[key]:null,
   current:current.metrics[key],delta:base?current.metrics[key]-base.metrics[key]:null}));
}
export function professionalReportHTML({doc,result,reference,layoutBaseline}){
 if(!result)throw new Error('Execute uma simulação antes de gerar o relatório.');
 const layout=layoutBaseline&&layoutBaseline.projectId===doc.id?compareLayouts(layoutBaseline,doc):null;
 const rows=metricComparison(reference,result);
 const tr=(values)=>'<tr>'+values.map(value=>`<td>${escapeHTML(value)}</td>`).join('')+'</tr>';
 const f=v=>typeof v==='number'?v.toLocaleString('pt-BR',{maximumFractionDigits:2}):v??'—';
 const metrics=rows.map(r=>tr([r.name,`${f(r.current)} ${r.unit}`,
  r.reference===null?'—':`${f(r.reference)} ${r.unit}`,
  r.delta===null?'—':`${r.delta>0?'+':''}${f(r.delta)} ${r.unit}`])).join('');
 const teams=(result.teamStats||[]).map(t=>tr([t.name,t.capacity,`${f(t.utilization*100)}%`,`${f(t.waiting)} min`])).join('');
 const layoutDesc=layout?`<p>Referência física: ${escapeHTML(layoutBaseline.at)}. Ambientes incluídos: ${layout.addedRooms.length}; removidos: ${layout.removedRooms.length}; móveis incluídos: ${layout.added.length}; removidos: ${layout.removed.length}; modificados: ${layout.changed.length}; alterações de paredes/portas: ${layout.wallChanges}; de corredores: ${layout.corridorChanges}; escalas alteradas: ${layout.scalesChanged.length}.</p>`:
 '<p>Nenhuma referência física foi fixada para este projeto.</p>';
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório de Serviço — ${escapeHTML(doc.name)}</title><style>
 body{font:16px/1.55 system-ui,Arial,sans-serif;color:#183a4a;margin:0 auto;max-width:980px;padding:40px}
 h1,h2{line-height:1.2}h1{font-size:28px}h2{font-size:19px;margin-top:28px}
 table{border-collapse:collapse;width:100%;margin:16px 0}th,td{padding:10px;border-bottom:1px solid #c6d5db;text-align:left}
 th{background:#e8f2f5}p,small{color:#486272}.notice{padding:14px;border:1px solid #a3bbc5;background:#eef6f8}
 button{padding:10px 14px;background:#1d647e;color:#fff;border:0;border-radius:8px;cursor:pointer}
 @media print{body{padding:8mm;font-size:11pt}button{display:none}table{break-inside:avoid}}
 </style></head><body><button onclick="window.print()">Imprimir / salvar PDF</button>
 <h1>${escapeHTML(doc.name)}</h1><p>Relatório profissional de cenário · ${escapeHTML(new Date().toLocaleString('pt-BR'))}</p>
 <div class="notice"><strong>Estimativas, não medições reais.</strong> Resultados determinísticos calculados com durações, custos, recursos e conexões cadastradas. Layouts não alteram automaticamente o tempo de atendimento. Caminhada afeta os resultados apenas com o modo espacial ativado. Não modela congestionamento dinâmico nem variabilidade.</div>
 <h2>Hipóteses do cenário</h2><p>Ocorrências: ${f(result.settings.cases)} · Intervalo de chegada: ${f(result.settings.arrivalInterval)} min · Capacidade base: ${f(result.settings.teamCapacity)} · Caminhada no tempo: ${result.settings.spatialEnabled?'Ativa':'Inativa'}.</p>
 <h2>Indicadores</h2><table><thead><tr><th>Indicador</th><th>Atual</th><th>Referência</th><th>Variação</th></tr></thead><tbody>${metrics}</tbody></table>
 <h2>Equipes e gargalos</h2><table><thead><tr><th>Equipe</th><th>Capacidade</th><th>Utilização</th><th>Espera acumulada</th></tr></thead><tbody>${teams}</tbody></table>
 <h2>Comparação física</h2>${layoutDesc}
 <h2>Alertas e limitações</h2><ul>${(result.warnings||[]).map(w=>`<li>${escapeHTML(w)}</li>`).join('')||'<li>Sem alertas adicionais do simulador.</li>'}</ul>
 <p><small>Documento gerado localmente pelo Blue Ocean 3D. A referência de desempenho só é comparável quando o modelo e os parâmetros relevantes são equivalentes.</small></p></body></html>`;
}
