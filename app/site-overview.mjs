/** Planta geral v2.1 — organização física e corredores editáveis. */
import {GRID,validFurniture,furnitureDimensions,ensureFloorplan} from './floorplan.mjs';
import {edgeType,cellMeters} from './floorplan-navigation.mjs';
import {siteRoomSpot,siteRouteReport,corridors,setCorridor,connectWithCorridor,connectServiceCorridors} from './site-routing.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SITE_STEP=20;
const STEP=SITE_STEP,W=GRID.columns*STEP,H=GRID.rows*STEP;
export function positions(doc){const l=ensureFloorplan(doc);if(!l.roomPositions||typeof l.roomPositions!=='object'||Array.isArray(l.roomPositions))l.roomPositions={};return l.roomPositions;}
export const roomSpot=siteRoomSpot;
function overlaps(a,b){return a.x<b.x+GRID.columns&&a.x+GRID.columns>b.x&&a.y<b.y+GRID.rows&&a.y+GRID.rows>b.y}
export function validateRoomPosition(doc,id,x,y){
 if(!(doc.environments||[]).some(r=>r.id===id))throw Error('Ambiente inexistente.');
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>190||y>190)throw Error('Posição fora da planta geral.');
 // The geometry readers normalize optional layout fields. Use a shallow view so
 // a pointer preview never adds those fields to an imported project.
 const view={...doc,floorplan:{...doc.floorplan}},next={x,y};
 if((doc.environments||[]).some(r=>r.id!==id&&overlaps(next,roomSpot(view,r.id))))throw Error('Um ambiente não pode ocupar o mesmo espaço de outro.');
 if(corridors(view).some(c=>c.x>=x&&c.x<x+GRID.columns&&c.y>=y&&c.y<y+GRID.rows))throw Error('A sala ocuparia um corredor. Apague o trecho ou escolha outra posição.');
 return next;
}
export function moveRoom(doc,id,x,y){const next=validateRoomPosition(doc,id,x,y);positions(doc)[id]=next;return next;}
/** Verificação direta entre salas encostadas, preservada para projetos v2.0. */
export function adjacency(doc,a,b){const pa=roomSpot(doc,a),pb=roomSpot(doc,b);if(pa.x+GRID.columns===pb.x||pb.x+GRID.columns===pa.x){const ax=pa.x<pb.x?GRID.columns:0,bx=pa.x<pb.x?0:GRID.columns;const low=Math.max(pa.y,pb.y),high=Math.min(pa.y+GRID.rows,pb.y+GRID.rows);for(let v=low;v<high;v++)if(edgeType(doc,a,'v',ax,v-pa.y)==='door'&&edgeType(doc,b,'v',bx,v-pb.y)==='door')return {connected:true,axis:'v',at:v};return {connected:false,reason:'Adicione duas portas alinhadas nas paredes compartilhadas.'};}
 if(pa.y+GRID.rows===pb.y||pb.y+GRID.rows===pa.y){const ay=pa.y<pb.y?GRID.rows:0,by=pa.y<pb.y?0:GRID.rows;const low=Math.max(pa.x,pb.x),high=Math.min(pa.x+GRID.columns,pb.x+GRID.columns);for(let v=low;v<high;v++)if(edgeType(doc,a,'h',v-pa.x,ay)==='door'&&edgeType(doc,b,'h',v-pb.x,by)==='door')return {connected:true,axis:'h',at:v};return {connected:false,reason:'Adicione portas alinhadas nas duas salas.'};}
 return {connected:false,reason:'Posicione os ambientes lado a lado e alinhe as portas.'};}
export function transitions(doc){const nodes=new Map((doc.nodes||[]).map(n=>[n.id,n])),unique=new Map();for(const e of doc.edges||[]){if(!['sequence','dependency','handoff'].includes(e.type))continue;const a=nodes.get(e.from)?.environmentId,b=nodes.get(e.to)?.environmentId;if(!a||!b||a===b)continue;const key=a+'|'+b;unique.set(key,{from:a,to:b,count:(unique.get(key)?.count||0)+1,...adjacency(doc,a,b)});}return [...unique.values()];}
export function siteReport(doc){const r=siteRouteReport(doc);return {...r,rooms:(doc.environments||[]).length};}
function wallsSVG(doc,id){let chunks=[];for(let x=0;x<GRID.columns;x++)for(let y=0;y<=GRID.rows;y++){const e=edgeType(doc,id,'h',x,y);if(e!=='open')chunks.push(`<line x1="${x*STEP}" y1="${y*STEP}" x2="${(x+1)*STEP}" y2="${y*STEP}" stroke="${e==='door'?'#12a486':'#557c71'}" stroke-width="${e==='door'?5:6}" stroke-dasharray="${e==='door'?'4 5':''}"/>`);}for(let x=0;x<=GRID.columns;x++)for(let y=0;y<GRID.rows;y++){const e=edgeType(doc,id,'v',x,y);if(e!=='open')chunks.push(`<line x1="${x*STEP}" y1="${y*STEP}" x2="${x*STEP}" y2="${(y+1)*STEP}" stroke="${e==='door'?'#12a486':'#557c71'}" stroke-width="${e==='door'?5:6}" stroke-dasharray="${e==='door'?'4 5':''}"/>`);}return chunks.join('')}
export function initSiteOverview({root,getDocument,mutate,onOpen,onSelect,getSelectedRoom,onCreate,onFlow,onMessage}){
 root.tabIndex=-1;
 let drag=null,paint=null,mode='view',pairFrom='',pairTo='',selected='',suppressClick=false,advancedOpen=false;
 function selectRoom(id){selected=id;onSelect?.(id);}
 function render(){const d=getDocument(),rooms=d.environments||[],report=siteReport(d),hall=corridors(d);if(getSelectedRoom)selected=getSelectedRoom();if(!rooms.some(r=>r.id===pairFrom))pairFrom='';if(!rooms.some(r=>r.id===pairTo))pairTo='';if(mode!=='connect'&&!pairFrom)pairFrom=rooms[0]?.id||'';if(mode!=='connect'&&(!pairTo||pairFrom===pairTo))pairTo=rooms.find(r=>r.id!==pairFrom)?.id||'';
  const maxX=Math.max(36,...rooms.map(r=>roomSpot(d,r.id).x+GRID.columns+5),...hall.map(c=>c.x+5)),maxY=Math.max(23,...rooms.map(r=>roomSpot(d,r.id).y+GRID.rows+5),...hall.map(c=>c.y+5)),w=maxX*STEP,h=maxY*STEP+42;
  root.innerHTML=`<header class="site-head"><div><span class="panel-eyebrow">ETAPA 1 · PLANTA DO SERVIÇO</span><h3>Organize o serviço e suas salas</h3><p>Crie as salas e planeje os percursos. Depois defina as atividades e monte o 3D de cada sala.</p></div><div class="site-head-actions"><button type="button" class="button primary" data-site-create>＋ Nova sala</button><button type="button" class="button" data-site-flow>Definir atividades e fluxo →</button><button type="button" data-site-reset>↺ Organizar salas</button><span class="site-summary">${rooms.length} ambientes · ${hall.length} células de corredor · ${report.linked}/${report.links.length} percursos possíveis</span></div></header>
  <div class="site21-tools" aria-label="Ferramentas de circulação"><div class="site21-modes" role="group" aria-label="Desenhar corredor"><button data-site-mode="view" class="${mode==='view'?'active':''}" aria-pressed="${mode==='view'}">↔ Mover salas</button><button data-site-mode="paint" class="${mode==='paint'?'active':''}" aria-pressed="${mode==='paint'}">▦ Desenhar corredor</button><button data-site-mode="erase" class="${mode==='erase'?'active':''}" aria-pressed="${mode==='erase'}">⌫ Apagar corredor</button><button data-site-mode="connect" class="${mode==='connect'?'active':''}" aria-pressed="${mode==='connect'}">↗ Conectar salas</button></div><details class="site21-advanced" ${advancedOpen?'open':''}><summary>Opções avançadas de conexão</summary><div class="site21-pair"><label>De <select id="site21-from"><option value="">Escolha a origem</option>${rooms.map(r=>`<option value="${esc(r.id)}" ${r.id===pairFrom?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label><label>Para <select id="site21-to"><option value="">Escolha o destino</option>${rooms.map(r=>`<option value="${esc(r.id)}" ${r.id===pairTo?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label><button data-site-connect ${!pairFrom||!pairTo?'disabled':''}>＋ Conectar com corredor</button><button data-site-connect-all>✓ Conectar fluxo</button></div></details></div>
  ${mode==='connect'?`<div class="site21-connection-status" role="status"><strong>${pairFrom?esc(rooms.find(r=>r.id===pairFrom)?.name):'Escolha a origem'} → ${pairTo?esc(rooms.find(r=>r.id===pairTo)?.name):'Escolha o destino'}</strong><button type="button" class="button primary" id="site-connect-confirm" data-site-connect ${!pairFrom||!pairTo?'disabled':''}>Criar corredor</button></div>`:''}<div class="site-drag-status" role="status" aria-live="polite"></div>
  <p class="site21-instruction">${mode==='paint'?'Arraste no espaço livre para desenhar o corredor.':mode==='erase'?'Arraste para apagar as células de corredor.':mode==='connect'?'Clique em uma sala de origem e depois em outra de destino.':'Arraste qualquer parte da sala para movê-la. Clique para inspecionar; Enter também seleciona.'} Corredores não podem atravessar salas; uma passagem exige porta externa acessível.</p>
  <div class="site-scroll"><div class="site-canvas ${mode!=='view'?'site21-editing':''}" data-site-grid style="width:${w}px;height:${h}px"><div class="site21-cells" aria-hidden="true">${hall.map(c=>`<span class="site21-corridor" data-x="${c.x}" data-y="${c.y}" style="left:${c.x*STEP}px;top:${c.y*STEP+42}px"></span>`).join('')}</div><svg class="site-link" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${report.links.map(link=>link.path?`<polyline points="${link.path.map(p=>`${p.x*STEP},${p.y*STEP+42}`).join(' ')}" fill="none" stroke="#0e8f79" stroke-width="5" opacity=".7" stroke-linejoin="round" stroke-linecap="round"/>`:(()=>{const a=roomSpot(d,link.from),b=roomSpot(d,link.to);return `<line x1="${(a.x+6)*STEP}" y1="${(a.y+4)*STEP+42}" x2="${(b.x+6)*STEP}" y2="${(b.y+4)*STEP+42}" stroke="#d2935d" stroke-width="3" stroke-dasharray="8 7"/>`})()).join('')}</svg>
  ${rooms.map(r=>{const pos=roomSpot(d,r.id),objects=validFurniture(d).filter(o=>o.roomId===r.id);return `<section class="site-room ${selected===r.id?'is-selected':''}" data-site-room="${esc(r.id)}" role="button" tabindex="0" aria-label="Selecionar ambiente ${esc(r.name)}" ${mode==='connect'&&(r.id===pairFrom||r.id===pairTo)?`data-connection="${r.id===pairFrom?'from':'to'}"`:''} style="left:${pos.x*STEP}px;top:${pos.y*STEP+42}px;width:${W}px"><div class="site-room-handle" data-site-drag="${esc(r.id)}"><b title="${esc(r.name)}">${esc(r.icon||'▣')} ${esc(r.name)}</b><small>${mode==='connect'&&r.id===pairFrom?'Origem':mode==='connect'&&r.id===pairTo?'Destino':`${d.nodes.filter(n=>n.environmentId===r.id).length} atv`}</small></div><svg viewBox="0 0 ${W} ${H}" class="site-room-svg" role="img" aria-label="Planta de ${esc(r.name)}"><rect width="${W}" height="${H}" fill="#edf5f0"/>${Array.from({length:GRID.columns-1},(_,i)=>`<line x1="${(i+1)*STEP}" x2="${(i+1)*STEP}" y1="0" y2="${H}" stroke="#d5e4d9"/>`).join('')}${Array.from({length:GRID.rows-1},(_,i)=>`<line x1="0" x2="${W}" y1="${(i+1)*STEP}" y2="${(i+1)*STEP}" stroke="#d5e4d9"/>`).join('')}${objects.map(o=>{const [fw,fh]=furnitureDimensions(o);return `<rect x="${o.x*STEP+2}" y="${o.y*STEP+2}" width="${fw*STEP-4}" height="${fh*STEP-4}" rx="4" fill="#a8c8bb" stroke="#4f9381"/>`}).join('')}${wallsSVG(d,r.id)}</svg><small>${(GRID.columns*cellMeters(d,r.id)).toFixed(1)} × ${(GRID.rows*cellMeters(d,r.id)).toFixed(1)} m · ${objects.length} móveis</small></section>`}).join('')}</div></div><details class="site-notes"><summary>Verificar percursos físicos entre as salas</summary><div><b>Diagnóstico do percurso entre atividades</b>${report.links.length?report.links.map(l=>{const a=rooms.find(r=>r.id===l.from),b=rooms.find(r=>r.id===l.to);return `<p class="${l.connected?'site-ok':'site-warning'}">${l.connected?'✓':'⚠'} ${esc(a?.name||'Sala')} → ${esc(b?.name||'Sala')}: ${l.connected?`rota transitável · ${l.steps} células`:'rota física bloqueada ou corredor ausente'} ${!l.connected?`<button data-site-quick-connect="1" data-from="${esc(l.from)}" data-to="${esc(l.to)}">Criar corredor ↗</button>`:''}</p>`}).join(''):'<p>Adicione conexões entre atividades para verificar trajetos operacionais. Você também pode conectar duas salas diretamente acima.</p>'}<p class="site-disclaimer">O percurso considera portas, paredes e móveis em células esquemáticas. A planta pode reunir salas com escalas diferentes: as distâncias em células não são medidas precisas nem modificam a duração, a fila ou o custo da simulação.</p></div></details>`;
 }
 function notify(s){onMessage?.(s);const feedback=root.querySelector('.site-drag-status');if(feedback){feedback.textContent=s;feedback.dataset.kind=s.startsWith('⚠')?'error':'info';}}
 function apply(fn,msg){try{mutate(fn);render();notify(msg);return true}catch(e){render();notify('⚠ '+e.message);return false}}
 function choose(id){selectRoom(id);if(mode==='connect'){if(!pairFrom||pairTo){pairFrom=id;pairTo='';}else if(pairFrom===id){notify('Escolha outra sala para o destino.');return;}else pairTo=id;}render();}
 root.addEventListener('click',e=>{if(suppressClick){suppressClick=false;if(!e.target.closest('button,select,input,summary'))return;}const open=e.target.closest('[data-site-open]');if(open){onOpen(open.dataset.siteOpen);return;}
 if(e.target.closest('[data-site-create]')){onCreate?.();return;}
 if(e.target.closest('[data-site-flow]')){onFlow?.();return;}
 const modeButton=e.target.closest('[data-site-mode]');if(modeButton){mode=modeButton.dataset.siteMode;if(mode==='connect'){pairFrom='';pairTo='';}render();return;}
 if(e.target.closest('[data-site-connect-all]')){let result;if(apply(d=>{result=connectServiceCorridors(d)},'Corredores gerados.'))notify(`Corredores gerados para o fluxo: ${result.report.linked}/${result.report.links.length} trajetos transitáveis.${result.errors.length?' Revise '+result.errors.length+' ligação(ões) sem saída.':''}`);return;}
 const auto=e.target.closest('[data-site-connect],[data-site-quick-connect]');if(auto){const a=auto.dataset.from||pairFrom,b=auto.dataset.to||pairTo;apply(d=>connectWithCorridor(d,a,b),'Corredor conectado; percurso conferido pelas portas e móveis.');return;}
 const room=e.target.closest('[data-site-room]');if(room){choose(room.dataset.siteRoom);return;}
 if(e.target.closest('[data-site-reset]'))apply(d=>{const l=positions(d);for(const r of d.environments||[])delete l[r.id]},'Posições padrão restauradas (desde que não ocupem corredores).');});
 root.addEventListener('toggle',e=>{if(e.target.isConnected&&e.target.classList.contains('site21-advanced'))advancedOpen=e.target.open;},true);
 root.addEventListener('change',e=>{if(!['site21-from','site21-to'].includes(e.target.id))return;if(e.target.id==='site21-from')pairFrom=e.target.value;else pairTo=e.target.value;advancedOpen=true;render();});
 function paintAt(e){const canvas=root.querySelector('.site-canvas');if(!canvas)return;const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/STEP),y=Math.floor((e.clientY-r.top-42)/STEP),k=`${x}:${y}`;if(!paint||paint.last===k)return;paint.last=k;paint.cells.set(k,{x,y});
 if(x<0||y<0||x>=200||y>=200)return;const room=(getDocument().environments||[]).some(r=>{const p=roomSpot(getDocument(),r.id);return x>=p.x&&x<p.x+GRID.columns&&y>=p.y&&y<p.y+GRID.rows});if(room){notify('⚠ Corredores não atravessam salas. Use portas externas.');paint.cells.delete(k);return;}
 const cell=canvas.querySelector(`.site21-corridor[data-x="${x}"][data-y="${y}"]`);if(mode==='paint'){if(!cell){const el=document.createElement('span');el.className='site21-corridor';el.dataset.x=x;el.dataset.y=y;el.style.left=x*STEP+'px';el.style.top=y*STEP+42+'px';canvas.querySelector('.site21-cells').appendChild(el)}}else cell?.remove();}
 function preview(e){
  if(!drag||e.pointerId!==drag.pointerId)return;
  const dx=Math.round((e.clientX-drag.x)/STEP),dy=Math.round((e.clientY-drag.y)/STEP);
  drag.next={x:Math.max(0,Math.min(190,drag.spot.x+dx)),y:Math.max(0,Math.min(190,drag.spot.y+dy))};
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5&&!drag.move)return;
  drag.move=true;
  let reason='';try{validateRoomPosition(getDocument(),drag.id,drag.next.x,drag.next.y)}catch(error){reason=error.message;}
  drag.valid=!reason;
  const el=[...root.querySelectorAll('[data-site-room]')].find(x=>x.dataset.siteRoom===drag.id);
  if(el){el.style.left=drag.next.x*STEP+'px';el.style.top=(drag.next.y*STEP+42)+'px';el.classList.add('dragging');el.dataset.valid=String(drag.valid);}
  const feedback=root.querySelector('.site-drag-status');
  feedback.dataset.kind=reason?'error':'info';feedback.textContent=reason?'Movimento bloqueado: '+reason:'Solte para reposicionar a sala.';
 }
 root.addEventListener('pointerdown',e=>{
  suppressClick=false;
  if(e.button!==0||e.target.closest('button,select,input,summary')||drag||paint)return;
  suppressClick=false;
  const room=e.target.closest('[data-site-room]');
  if(mode==='view'&&room){
   const id=room.dataset.siteRoom,spot=roomSpot(getDocument(),id);
   selectRoom(id);
   root.querySelectorAll('[data-site-room]').forEach(el=>el.classList.toggle('is-selected',el.dataset.siteRoom===id));
   drag={id,x:e.clientX,y:e.clientY,spot:{...spot},next:{...spot},move:false,valid:true,pointerId:e.pointerId};
   root.focus({preventScroll:true});root.setPointerCapture?.(e.pointerId);e.preventDefault();return;
  }
  if((mode==='paint'||mode==='erase')&&e.target.closest('[data-site-grid]')&&!room){
   paint={last:null,cells:new Map(),pointerId:e.pointerId};root.focus({preventScroll:true});root.setPointerCapture?.(e.pointerId);paintAt(e);e.preventDefault();
  }
 });
 root.addEventListener('pointermove',e=>{if(paint&&e.pointerId===paint.pointerId)paintAt(e);else preview(e)});
 function finish(e,cancel=false){
  const current=drag||paint;if(!current||e.pointerId!==undefined&&e.pointerId!==current.pointerId)return;
  const moved=drag;const batch=paint;drag=null;paint=null;
  if(root.hasPointerCapture?.(current.pointerId))root.releasePointerCapture(current.pointerId);
  if(cancel){suppressClick=true;render();notify('Movimento cancelado; posição preservada.');return;}
  if(batch){suppressClick=true;if(batch.cells.size)apply(d=>{for(const c of batch.cells.values())setCorridor(d,c.x,c.y,mode==='paint')},mode==='paint'?'Trecho de corredor desenhado.':'Trecho de corredor apagado.');else render();return;}
  suppressClick=true;
  if(moved.move){
   if(moved.valid)apply(doc=>moveRoom(doc,moved.id,moved.next.x,moved.next.y),'Ambiente reposicionado; confira os corredores.');
   else{render();notify('⚠ Movimento bloqueado; posição original preservada.');}
  }else choose(moved.id);
 }
 root.addEventListener('pointerup',e=>finish(e));
 root.addEventListener('pointercancel',e=>finish(e,true));
 root.addEventListener('lostpointercapture',e=>finish(e,true));
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
   if(drag||paint){e.preventDefault();finish({},true);}
   else if(mode==='connect'){mode='view';pairFrom='';pairTo='';render();notify('Conexão cancelada.');}
  }
  const room=e.target.closest('[data-site-room]');
  if(room&&['Enter',' '].includes(e.key)){e.preventDefault();choose(room.dataset.siteRoom);}
 });
 return {render};
}
