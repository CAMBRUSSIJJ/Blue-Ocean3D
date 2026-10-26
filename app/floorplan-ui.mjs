import {FURNITURE,GRID,ensureFloorplan,validFurniture,putFurniture,moveFurniture,rotateFurniture,removeFurniture,linkFurniture,autoFurnish,furnitureDimensions,resizeFurniture,peopleAt} from './floorplan.mjs';
import {setEdge,edgeType,roomEdges,portals,setRoomScale,cellMeters,bestEntranceRoute,routeMeters,navigationReport} from './floorplan-navigation.mjs';
import {wallHeight,setWallHeight} from './room-style.mjs';
import {thumbnail} from './room-catalog.mjs';
import {roomInteractionPlan} from './simulation-poses.mjs';
import {placementFromPoint,FURNITURE_DRAG_TYPE} from './placement.mjs';
import {duplicateFurniture,moveFurnitureBy,moveFurnitureGroup,removeFurnitureGroup,paintStructureLine} from './studio-actions.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const label=(kind)=>FURNITURE[kind]?.name||'Objeto';
const $=q=>document.querySelector(q);
function objectHTML(o,selected=false,readonly=false){
 const spec=FURNITURE[o.kind];if(!spec)return '';
 const [w,h]=furnitureDimensions(o);
 return `<button type="button" class="floor-prop floor-prop-${o.kind} ${selected?'selected':''}" ${readonly?'tabindex="-1"':'data-floor-prop="'+esc(o.id)+'"'} style="left:${100*o.x/GRID.columns}%;top:${100*o.y/GRID.rows}%;width:${100*w/GRID.columns}%;height:${100*h/GRID.rows}%" title="${esc(label(o.kind))}" aria-label="${esc(label(o.kind))}${o.nodeId?' · ligado a atividade':''}"><span class="floor-prop-symbol" aria-hidden="true">${spec.icon}</span>${w>1?`<span class="floor-prop-name">${esc(spec.name)}</span>`:''}${o.nodeId?'<span class="floor-linked-dot" aria-hidden="true"></span>':''}${selected&&!readonly?'<span class="floor-resize-handle" data-floor-resize="'+esc(o.id)+'" aria-label="Arraste para redimensionar"></span>':''}</button>`;
}
function structureHTML(doc,roomId,showRoutes=false){
 const walls=roomEdges(doc,roomId).map(e=>`<span aria-hidden="true" class="floor-edge floor-edge-${e.axis} floor-edge-${e.type}" style="left:${100*e.x/GRID.columns}%;top:${100*e.y/GRID.rows}%;${e.axis==='h'?`width:${100/GRID.columns}%;`:`height:${100/GRID.rows}%;`}" title="${e.type==='door'?'Porta':'Parede'}"></span>`).join('');
 if(!showRoutes)return walls;
 const target=validFurniture(doc).find(o=>o.roomId===roomId&&o.nodeId)||validFurniture(doc).find(o=>o.roomId===roomId&&['desk','counter','station'].includes(o.kind));
 const targetPos=target?{x:target.x+furnitureDimensions(target)[0]/2,y:target.y+furnitureDimensions(target)[1]/2}:{x:GRID.columns/2,y:GRID.rows/2};
 const route=bestEntranceRoute(doc,roomId,targetPos);
 const polyline=route?`<polyline points="${route.map(p=>`${p.x/GRID.columns*120},${p.y/GRID.rows*80}`).join(' ')}"/>`:'';
 return walls+`<svg class="floor-route-overlay" viewBox="0 0 120 80" preserveAspectRatio="none" aria-label="${route?'Rota acessível pela porta':'Não existe caminho transitável a partir da entrada'}"><g>${polyline}</g></svg><span class="floor-route-badge ${route?'is-ok':'is-blocked'}">${route?`↝ ${routeMeters(doc,roomId,route).toFixed(1).replace('.',',')} m até o posto`:'⚠ Rota inacessível'}</span>`;
}
function roomHTML(doc,room,{readonly=false,selection='',selections=null,selectRoom='',showRoutes=false}={}){
 const objects=validFurniture(doc).filter(o=>o.roomId===room.id),scale=cellMeters(doc,room.id);
 const linked=new Set(objects.map(o=>o.nodeId));
 const tasks=doc.nodes.filter(n=>n.environmentId===room.id&&['activity','decision'].includes(n.type));
 const pathTargets=objects.filter(o=>o.nodeId).map(o=>({position:{x:o.x+furnitureDimensions(o)[0]/2,y:o.y+furnitureDimensions(o)[1]/2}}));
 const report=navigationReport(doc,room.id,pathTargets);
 return `<article class="floor-editor-room ${selectRoom===room.id?'selected':''}" data-floor-room="${esc(room.id)}" style="--floor-accent:${esc(room.color||'#398e81')}">
  <header class="floor-room-heading"><div class="floor-room-emblem">${esc(room.icon||'▣')}</div><div><strong>${esc(room.name)}</strong><small>${tasks.length} atividade(s) · ${objects.length} objeto(s) · ${(GRID.columns*scale).toFixed(1).replace('.',',')} × ${(GRID.rows*scale).toFixed(1).replace('.',',')} m</small></div>${readonly?'<span class="floor-room-live" data-room-live="'+esc(room.id)+'">○ Vazio</span>':`<span class="floor-room-doors ${report.hasPath?'':'floor-room-no-door'}" title="${report.unreachable.length} posto(s) sem rota">${report.portalCount} porta(s)${report.unreachable.length?' · ⚠ '+report.unreachable.length:''}</span>`}</header>
  <div class="floor-surface" data-floor-surface="${esc(room.id)}" role="group" aria-label="Planta 2D de ${esc(room.name)}">${structureHTML(doc,room.id,showRoutes)}${objects.map(o=>objectHTML(o,selections?selections.has(o.id):o.id===selection,readonly)).join('')}<div class="floor-room-people" data-people-room="${esc(room.id)}"></div></div>
  <footer class="floor-room-foot">${readonly?(report.hasPath?'Caminhos exibidos respeitam portas, paredes e obstáculos':`<span class="floor-navigation-alert">⚠ ${report.portalCount?'Verifique os postos sem acesso pela entrada':'Sem entrada transitável nesta sala'}</span>`):`<span>${tasks.length-linked.size>0?`${Math.max(0,tasks.filter(n=>!linked.has(n.id)).length)} atividade(s) sem posto`:'Postos vinculados'} · Escala ${scale.toFixed(2).replace('.',',')} m/célula</span><button data-floor-add-room="${esc(room.id)}" type="button">＋ Mobiliar</button>`}</footer>
 </article>`;
}
export function initFloorEditor({getDocument,mutate,onEdit,onSelectRoom}){
 const wrapper=$('#floor-editor'),canvas=$('#floor-editor-map'),inspector=$('#floor-editor-inspector'),palette=$('#floor-palette'),help=$('#floor-editor-notice');
 const state={active:false,placing:null,selected:null,selectedIds:new Set(),roomId:null,structure:null,showRoutes:false};
 const inspectorExpanded=new Set(['size']);
 function message(s){help.textContent=s}
 function change(cb,ok){try{mutate(cb);message(ok||'Planta atualizada.');render();return true;}catch(e){message('⚠ '+e.message);render();return false}}
 function updateControls(){palette.querySelectorAll('[data-furniture-kind]').forEach(b=>{b.classList.toggle('active',b.dataset.furnitureKind===state.placing);b.setAttribute('aria-pressed',String(b.dataset.furnitureKind===state.placing))});wrapper.classList.toggle('floor-placing',Boolean(state.placing||state.structure));wrapper.classList.toggle('floor-structure-editing',Boolean(state.structure));wrapper.querySelectorAll('[data-floor-structure]').forEach(b=>{b.classList.toggle('active',b.dataset.floorStructure===state.structure);b.setAttribute('aria-pressed',String(b.dataset.floorStructure===state.structure));});wrapper.querySelector('#floor-show-routes')?.setAttribute('aria-pressed',String(state.showRoutes));wrapper.classList.toggle('floor-route-enabled',state.showRoutes);}
 function selectFurniture(id,additive=false){
  if(!id){state.selected=null;state.selectedIds.clear();}
  else if(additive){if(state.selectedIds.has(id))state.selectedIds.delete(id);else state.selectedIds.add(id);state.selected=[...state.selectedIds].at(-1)||null;}
  else{state.selected=id;state.selectedIds=new Set([id]);}
  state.structure=null;render();
 }
 function inspect(){let doc=getDocument(),o=validFurniture(doc).find(x=>x.id===state.selected);
  const grouped=validFurniture(doc).filter(o=>state.selectedIds.has(o.id)&&o.roomId===state.roomId);
  if(grouped.length>1){
   inspector.innerHTML=`<div class="floor-inspector-top"><span class="panel-eyebrow">SELEÇÃO MÚLTIPLA</span><h3>${grouped.length} móveis selecionados</h3><small>Shift + clique para adicionar ou remover móveis.</small></div><p class="floor-inspector-hint">Ajuste a posição em conjunto, sem sobrepor móveis nem atravessar divisórias.</p><fieldset class="studio18-nudge"><legend>Mover grupo</legend><div><button type="button" data-studio19-group="0,-1" aria-label="Mover grupo para cima">↑</button><button type="button" data-studio19-group="-1,0" aria-label="Mover grupo para esquerda">←</button><button type="button" data-studio19-group="0,1" aria-label="Mover grupo para baixo">↓</button><button type="button" data-studio19-group="1,0" aria-label="Mover grupo para direita">→</button></div></fieldset><div class="studio19-group-actions"><button id="studio19-group-clear" type="button">Limpar seleção</button><button id="studio19-group-remove" type="button">Excluir selecionados</button></div>`;
   inspector.querySelectorAll('[data-studio19-group]').forEach(b=>b.addEventListener('click',()=>{const [dx,dy]=b.dataset.studio19Group.split(',').map(Number);change(d=>moveFurnitureGroup(d,grouped.map(o=>o.id),dx,dy),'Grupo movido.')}));
   inspector.querySelector('#studio19-group-clear').addEventListener('click',()=>selectFurniture(null));
   inspector.querySelector('#studio19-group-remove').addEventListener('click',()=>{change(d=>removeFurnitureGroup(d,grouped.map(o=>o.id)),'Móveis removidos.');selectFurniture(null)});
   return;
  }
  if(!o){const room=doc.environments.find(r=>r.id===state.roomId)||doc.environments[0],scale=room?cellMeters(doc,room.id):.75;inspector.innerHTML=`<div class="floor-inspector-top"><span class="panel-eyebrow">DIMENSÕES DO AMBIENTE</span><h3>${esc(room?.name||'Selecione um ambiente')}</h3><small>Malha: ${GRID.columns} × ${GRID.rows} células</small></div>${room?`<label class="floor-link-label">Escala em metros por célula<input id="floor-room-scale" type="number" min="0.4" max="2" step="0.05" value="${scale.toFixed(2)}" aria-label="Metros por célula"></label><label class="floor-link-label">Altura das paredes (metros)<input id="floor-room-wall-height" type="number" min="1.8" max="4.2" step="0.1" value="${wallHeight(doc,room.id).toFixed(2)}" aria-label="Altura das paredes em metros"></label><div class="floor-dimensions"><b>${(GRID.columns*scale).toFixed(2)} m</b> largura × <b>${(GRID.rows*scale).toFixed(2)} m</b> profundidade</div><p class="floor-inspector-hint">Selecione Parede, Porta ou Passagem livre e clique na linha divisória da planta. Use Ver trajetos para testar o acesso aos postos.</p><p class="floor-inspector-hint">As dimensões são estimadas por células. Alterar a escala não altera os tempos operacionais.</p>`:'<p>Crie um ambiente para configurar a planta.</p>'}`;
 inspector.querySelector('#floor-room-scale')?.addEventListener('change',e=>change(d=>setRoomScale(d,room.id,e.target.value),'Dimensões atualizadas.'));inspector.querySelector('#floor-room-wall-height')?.addEventListener('change',e=>change(d=>setWallHeight(d,room.id,e.target.value),'Altura das paredes atualizada.'));return}
  const options=FURNITURE[o.kind]?.visualOnly?[]:doc.nodes.filter(n=>n.environmentId===o.roomId&&['activity','decision'].includes(n.type));
  inspector.innerHTML=`<div class="floor-inspector-top"><span class="panel-eyebrow">OBJETO SELECIONADO</span><h3>${esc(label(o.kind))}</h3><small>Coluna ${o.x+1} · Linha ${o.y+1} · Giro ${o.rotation}°</small></div>
  <label class="floor-link-label">Atividade neste posto<select id="floor-object-node"><option value="">Nenhuma · só visual</option>${options.map(n=>`<option value="${esc(n.id)}" ${n.id===o.nodeId?'selected':''}>${esc(n.title)}</option>`).join('')}</select></label>
  <p class="floor-inspector-hint">O vínculo posiciona os personagens durante a reprodução. Não modifica os tempos e a capacidade do motor.</p>
  <details class="workspace-inspector-section" data-workspace-section="size" ${inspectorExpanded.has("size")?"open":""}><summary>Dimensões do móvel</summary><fieldset class="studio19-size" aria-label="Tamanho personalizado do móvel"><legend>Dimensões do móvel</legend><div class="studio18-coordinates"><label>Largura · células<input id="studio19-width" type="number" min="1" max="${GRID.columns}" step="1" value="${furnitureDimensions(o)[0]}"></label><label>Profundidade · células<input id="studio19-height" type="number" min="1" max="${GRID.rows}" step="1" value="${furnitureDimensions(o)[1]}"></label></div><small>1 célula ≈ ${cellMeters(doc,o.roomId).toFixed(2).replace('.',',')} m neste ambiente.</small><button type="button" id="studio19-resize">↔ Aplicar tamanho</button><p class="floor-inspector-hint">O tamanho visual não altera automaticamente o tempo de atendimento.</p></fieldset></details>
  <details class="workspace-inspector-section" data-workspace-section="position" ${inspectorExpanded.has("position")?"open":""}><summary>Posição precisa</summary><fieldset class="studio18-position" aria-label="Posição precisa do móvel"><legend>Posição na grade</legend><div class="studio18-coordinates"><label>Coluna<input id="studio18-x" type="number" min="1" max="12" step="1" value="${o.x+1}"></label><label>Linha<input id="studio18-y" type="number" min="1" max="8" step="1" value="${o.y+1}"></label></div><button type="button" id="studio18-apply">✓ Aplicar posição</button></fieldset></details>
  <details class="workspace-inspector-section" data-workspace-section="nudge" ${inspectorExpanded.has("nudge")?"open":""}><summary>Ajuste fino por células</summary><fieldset class="studio18-nudge" aria-label="Mover objeto uma célula"><legend>Ajustar posição</legend><div><button type="button" data-studio18-nudge="0,-1" aria-label="Mover para cima">↑</button><button type="button" data-studio18-nudge="-1,0" aria-label="Mover para esquerda">←</button><button type="button" data-studio18-nudge="0,1" aria-label="Mover para baixo">↓</button><button type="button" data-studio18-nudge="1,0" aria-label="Mover para direita">→</button></div></fieldset></details>
  <div class="floor-prop-actions">${o.nodeId?'<button type="button" id="floor-edit-task">✎ Editar atividade</button>':''}<button type="button" id="floor-rotate">↻ Girar 90°</button><button type="button" id="studio18-duplicate">▣ Duplicar móvel</button><button type="button" id="floor-remove">🗑 Remover</button></div><small class="floor-keyboard-tip">Arraste ou use as setas · R gira · Shift+D duplica · Delete remove</small>`;
  if(FURNITURE[o.kind]?.visualOnly){inspector.querySelector('#floor-object-node')?.closest('label')?.remove();inspector.querySelector('.floor-inspector-top')?.insertAdjacentHTML('afterend','<p class="p7-visual-only">Pessoa ilustrativa. Não gera clientes, equipe nem eventos de simulação.</p>');}
  inspector.querySelectorAll('details[data-workspace-section]').forEach(section=>section.addEventListener('toggle',()=>{
   if(!section.isConnected)return;
   if(section.open)inspectorExpanded.add(section.dataset.workspaceSection);
   else inspectorExpanded.delete(section.dataset.workspaceSection);
  }));
  inspector.querySelector('#studio19-resize').addEventListener('click',()=>{
   const w=Number(inspector.querySelector('#studio19-width').value),h=Number(inspector.querySelector('#studio19-height').value);
   change(d=>resizeFurniture(d,o.id,w,h),'Dimensões atualizadas na planta e no 3D.');
  });
  inspector.querySelector('#floor-object-node')?.addEventListener('change',e=>change(d=>linkFurniture(d,o.id,e.target.value),'Posto vinculado à atividade.'));
  inspector.querySelector('#floor-edit-task')?.addEventListener('click',()=>onEdit?.(o.nodeId));
  inspector.querySelector('#studio18-apply').addEventListener('click',()=>{
   const x=Number(inspector.querySelector('#studio18-x').value),y=Number(inspector.querySelector('#studio18-y').value);
   if(!Number.isInteger(x)||!Number.isInteger(y)||x<1||y<1||x>GRID.columns||y>GRID.rows){message('⚠ Informe coluna e linha válidas dentro do ambiente.');return;}
   change(d=>moveFurnitureBy(d,o.id,x-1-o.x,y-1-o.y),'Posição exata aplicada.');
  });
  inspector.querySelectorAll('[data-studio18-nudge]').forEach(button=>button.addEventListener('click',()=>{
   const [dx,dy]=button.dataset.studio18Nudge.split(',').map(Number);
   change(d=>moveFurnitureBy(d,o.id,dx,dy),'Móvel ajustado uma célula.');
  }));
  inspector.querySelector('#studio18-duplicate').addEventListener('click',()=>{
   let copy;const ok=change(d=>{copy=duplicateFurniture(d,o.id)},'Cópia criada, sem duplicar o vínculo com a atividade.');
   if(ok){state.selected=copy.id;state.selectedIds=new Set([copy.id]);render();}
  });
  inspector.querySelector('#floor-rotate').addEventListener('click',()=>change(d=>rotateFurniture(d,o.id),'Móvel girado.'));
  inspector.querySelector('#floor-remove').addEventListener('click',()=>{change(d=>removeFurniture(d,o.id),'Objeto removido.');selectFurniture(null)});
 }
 function render(){if(!state.active)return;
  const d=getDocument();ensureFloorplan(d);
  const rooms=(d.environments||[]).filter(r=>r.id===state.roomId);canvas.innerHTML=rooms.length?rooms.map(r=>roomHTML(d,r,{selection:state.selected,selections:state.selectedIds,selectRoom:state.roomId,showRoutes:state.showRoutes})).join(''):`<div class="floor-no-rooms"><b>Seu espaço começa aqui</b><p>Use + Novo ambiente para iniciar sua planta 2D.</p></div>`;
  if(state.selected&&!validFurniture(d).some(o=>o.id===state.selected)){state.selected=null;state.selectedIds.clear();}
  updateControls();inspect();
 }
 palette.innerHTML=Object.entries(FURNITURE).filter(([kind])=>kind!=='door').map(([kind,p])=>`<button type="button" draggable="true" class="floor-palette-item" data-furniture-kind="${kind}" data-category="${esc(p.category)}" aria-label="Arrastar ${esc(p.name)} para o ambiente" aria-pressed="false">${thumbnail(kind)}<span class="floor-palette-label">${esc(p.name)}</span><small>${p.w}×${p.h}</small></button>`).join('');
 const search=wrapper.querySelector('#floor-library-search'),category=wrapper.querySelector('#floor-library-category');
 category.innerHTML='<option value="">Todas as categorias</option>';
 for(const name of [...new Set(Object.values(FURNITURE).map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'pt-BR'))){
  const option=document.createElement('option');option.value=name;option.textContent=name;category.appendChild(option);
 }
 const footer=document.createElement('div');footer.className='p7-library-footer';
 footer.innerHTML='<span id="p7-library-count" role="status"></span><button type="button" id="p7-library-clear">Limpar filtros</button>';
 const empty=document.createElement('p');empty.className='p7-library-empty';
 empty.textContent='Nenhum item encontrado. Limpe os filtros ou tente outro termo.';empty.hidden=true;
 palette.before(footer);palette.after(empty);
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 function filterLibrary(){
  const term=normalize(search.value),cat=category.value;let count=0;
  for(const button of palette.querySelectorAll('[data-furniture-kind]')){
   const info=FURNITURE[button.dataset.furnitureKind];
   const matched=(!term||normalize([info.name,info.category,info.tags||'',button.dataset.furnitureKind].join(' ')).includes(term))&&(!cat||info.category===cat);
   button.hidden=!matched;if(matched)count++;
  }
  footer.querySelector('#p7-library-count').textContent=count+' itens';
  empty.hidden=count>0;
 }
 footer.querySelector('#p7-library-clear').addEventListener('click',()=>{search.value='';category.value='';filterLibrary();search.focus()});
 search?.addEventListener('input',filterLibrary);category?.addEventListener('change',filterLibrary);filterLibrary();
 palette.addEventListener('dragstart',e=>{const b=e.target.closest('[data-furniture-kind]');if(!b||!FURNITURE[b.dataset.furnitureKind])return;state.placing=b.dataset.furnitureKind;state.structure=null;updateControls();e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData(FURNITURE_DRAG_TYPE,b.dataset.furnitureKind);e.dataTransfer.setData('text/plain',b.dataset.furnitureKind);message(`Solte ${FURNITURE[b.dataset.furnitureKind].name} sobre uma área livre do ambiente.`);});
 palette.addEventListener('dragend',()=>{state.placing=null;updateControls();wrapper.querySelectorAll('.floor-ghost').forEach(el=>el.remove())});
 palette.addEventListener('click',e=>{const b=e.target.closest('[data-furniture-kind]');if(!b)return;state.structure=null;state.placing=state.placing===b.dataset.furnitureKind?null:b.dataset.furnitureKind;state.selected=null;state.selectedIds.clear();message(state.placing?`Clique em uma posição livre de qualquer ambiente para colocar ${label(state.placing).toLowerCase()}.`:'Selecione um móvel para configurar.');updateControls();inspect()});
 const tools=wrapper.querySelector('#floor-structure-tools');
 tools?.addEventListener('click',e=>{const b=e.target.closest('[data-floor-structure]');if(!b)return;const type=b.dataset.floorStructure;state.structure=state.structure===type?null:type;state.placing=null;state.selected=null;state.selectedIds.clear();updateControls();inspect();message(state.structure?`Clique nas linhas da grade para definir ${type==='wall'?'paredes':type==='door'?'portas':'passagens livres'}.`: 'Modo de construção encerrado.');});
 wrapper.querySelector('#floor-show-routes')?.addEventListener('click',()=>{state.showRoutes=!state.showRoutes;render();message(state.showRoutes?'Trajetos verdes mostram o caminho disponível entre entrada e posto.':'Visualização de trajetos desativada.');});
 $('#floor-auto').addEventListener('click',()=>change(d=>{const n=autoFurnish(d,state.roomId);if(!n)throw Error('Não há postos livres para mobiliar automaticamente.');},'Layout inicial criado. Arraste os móveis para personalizar.'));
 $('#floor-clear-selection').addEventListener('click',()=>{state.placing=null;state.structure=null;state.selected=null;state.selectedIds.clear();updateControls();inspect();render();message('Seleção cancelada.')});
 let draggedGhost=null;
 function clearDragGhost(){draggedGhost?.remove();draggedGhost=null;}
 function dragSpot(e){const surface=e.target.closest('[data-floor-surface]');if(!surface)return null;const kind=e.dataTransfer?.getData(FURNITURE_DRAG_TYPE)||e.dataTransfer?.getData('text/plain');if(!FURNITURE[kind]||kind==='door')return null;const rect=surface.getBoundingClientRect();const spot=placementFromPoint(getDocument(),{roomId:surface.dataset.floorSurface,kind,pointX:(e.clientX-rect.left)/rect.width*GRID.columns,pointY:(e.clientY-rect.top)/rect.height*GRID.rows});return {surface,kind,spot};}
 canvas.addEventListener('dragover',e=>{
  if(![...e.dataTransfer.types].includes(FURNITURE_DRAG_TYPE))return;const surface=e.target.closest('[data-floor-surface]');if(!surface)return;
  e.preventDefault();e.dataTransfer.dropEffect='copy';const box=surface.getBoundingClientRect(),kind=state.placing;
  if(!FURNITURE[kind])return;
  const placement=placementFromPoint(getDocument(),{roomId:surface.dataset.floorSurface,kind,pointX:(e.clientX-box.left)/box.width*GRID.columns,pointY:(e.clientY-box.top)/box.height*GRID.rows});
  if(!placement.object)return;
  if(!draggedGhost||draggedGhost.parentElement!==surface){clearDragGhost();draggedGhost=document.createElement('div');draggedGhost.className='floor-ghost';surface.appendChild(draggedGhost);}
  const o=placement.object,[w,h]=furnitureDimensions(o);draggedGhost.dataset.valid=String(placement.valid);
  draggedGhost.style.cssText=`left:${o.x/GRID.columns*100}%;top:${o.y/GRID.rows*100}%;width:${w/GRID.columns*100}%;height:${h/GRID.rows*100}%`;
 });
 canvas.addEventListener('drop',e=>{if(![...e.dataTransfer.types].includes(FURNITURE_DRAG_TYPE))return;e.preventDefault();clearDragGhost();const p=dragSpot(e);if(!p)return;const {kind,spot}=p;if(!spot.valid){message('⚠ '+spot.reason);return;}let id;if(change(d=>{id=putFurniture(d,{roomId:p.surface.dataset.floorSurface,kind,x:spot.object.x,y:spot.object.y}).id},`${label(kind)} adicionado à planta.`)){state.selected=id;state.selectedIds=new Set([id]);state.placing=null;render();}});
 canvas.addEventListener('dragleave',e=>{if(!canvas.contains(e.relatedTarget))clearDragGhost()});
 canvas.addEventListener('click',e=>{
  if(e.target.closest('[data-floor-prop]')&&!state.structure)return;
  const surface=e.target.closest('[data-floor-surface]');if(!surface)return;
  const roomId=surface.dataset.floorSurface;state.roomId=roomId;onSelectRoom?.(roomId);
  if(state.structure){if(ignoreStructureClick)return;const box=surface.getBoundingClientRect(),px=(e.clientX-box.left)/box.width*GRID.columns,py=(e.clientY-box.top)/box.height*GRID.rows;let axis,x,y;if(Math.abs(px-Math.round(px))<=Math.abs(py-Math.round(py))){axis='v';x=Math.max(0,Math.min(GRID.columns,Math.round(px)));y=Math.max(0,Math.min(GRID.rows-1,Math.floor(py)));}else{axis='h';x=Math.max(0,Math.min(GRID.columns-1,Math.floor(px)));y=Math.max(0,Math.min(GRID.rows,Math.round(py)));}const type=state.structure;change(d=>setEdge(d,roomId,axis,x,y,type),type==='wall'?'Parede construída.':type==='door'?'Porta posicionada.':'Passagem liberada.');return}
  if(!state.placing){selectFurniture(null);return}
  const box=surface.getBoundingClientRect();const spec=FURNITURE[state.placing];const x=Math.max(0,Math.round((e.clientX-box.left)/box.width*GRID.columns-spec.w/2)),y=Math.max(0,Math.round((e.clientY-box.top)/box.height*GRID.rows-spec.h/2));let id;
  if(change(d=>{id=putFurniture(d,{roomId,kind:state.placing,x,y}).id;},`${label(state.placing)} posicionado.`)){state.selected=id;state.selectedIds=new Set([id]);state.placing=null;render()}
 });
 canvas.addEventListener('click',e=>{const b=e.target.closest('[data-floor-add-room]');if(!b)return;state.roomId=b.dataset.floorAddRoom;state.placing='desk';message('Clique na planta para posicionar uma mesa neste ambiente.');updateControls()});
 function focusSelected(){canvas.querySelector(`[data-floor-prop="${state.selected}"]`)?.focus({preventScroll:true})}
 let drag=null,resizeDrag=null,stroke=null,ignoreStructureClick=false,strokePreview=null;
 function edgeFromPointer(surface,e){
  const box=surface.getBoundingClientRect(),px=Math.max(0,Math.min(GRID.columns,(e.clientX-box.left)/box.width*GRID.columns)),py=Math.max(0,Math.min(GRID.rows,(e.clientY-box.top)/box.height*GRID.rows));
  if(Math.abs(px-Math.round(px))<=Math.abs(py-Math.round(py)))return {axis:'v',x:Math.round(px),y:Math.min(GRID.rows-1,Math.floor(py))};
  return {axis:'h',x:Math.min(GRID.columns-1,Math.floor(px)),y:Math.round(py)};
 }
 function strokeEnd(st,e){
  const box=st.surface.getBoundingClientRect();
  return st.start.axis==='v'?{...st.start,y:Math.max(0,Math.min(GRID.rows-1,Math.floor((e.clientY-box.top)/box.height*GRID.rows)))}:{...st.start,x:Math.max(0,Math.min(GRID.columns-1,Math.floor((e.clientX-box.left)/box.width*GRID.columns)))};
 }
 function showStructurePreview(st,end){
  if(!strokePreview){strokePreview=document.createElement('div');strokePreview.className='studio19-structure-preview';st.surface.appendChild(strokePreview)}
  const a=st.start,b=end,lo=Math.min(a[a.axis==='v'?'y':'x'],b[b.axis==='v'?'y':'x']),hi=Math.max(a[a.axis==='v'?'y':'x'],b[b.axis==='v'?'y':'x']);
  strokePreview.style.cssText=a.axis==='v'?`left:${a.x/GRID.columns*100}%;top:${lo/GRID.rows*100}%;height:${(hi-lo+1)/GRID.rows*100}%;width:3px;`:`left:${lo/GRID.columns*100}%;top:${a.y/GRID.rows*100}%;width:${(hi-lo+1)/GRID.columns*100}%;height:3px;`;
 }
 canvas.addEventListener('pointerdown',e=>{const grip=e.target.closest('[data-floor-resize]');if(grip&&state.selectedIds.size===1&&e.button===0){const id=grip.dataset.floorResize,o=validFurniture(getDocument()).find(o=>o.id===id);if(!o)return;const surface=grip.closest('[data-floor-surface]'),box=surface.getBoundingClientRect(),[width,height]=furnitureDimensions(o);resizeDrag={id,o,width,height,box,el:grip.closest('[data-floor-prop]'),startX:e.clientX,startY:e.clientY,nextW:width,nextH:height,valid:true};grip.setPointerCapture?.(e.pointerId);e.preventDefault();e.stopPropagation();return;}const target=e.target.closest('[data-floor-prop]');if(e.button===0&&state.structure){const surface=e.target.closest('[data-floor-surface]');if(!surface)return;stroke={surface,roomId:surface.dataset.floorSurface,start:edgeFromPointer(surface,e),end:null,fromX:e.clientX,fromY:e.clientY,moved:false};surface.setPointerCapture?.(e.pointerId);e.preventDefault();return;}
  if(!target||e.button!==0||state.placing||state.structure)return;
  const id=target.dataset.floorProp,o=validFurniture(getDocument()).find(o=>o.id===id);if(!o)return;
  if(e.shiftKey){selectFurniture(id,true);e.preventDefault();return;}
  if(!state.selectedIds.has(id))selectFurniture(id);state.roomId=o.roomId;const handle=canvas.querySelector(`[data-floor-prop="${CSS.escape(id)}"]`)||target;const surf=handle.closest('[data-floor-surface]'),box=surf.getBoundingClientRect();
  drag={id,el:handle,surf,roomId:o.roomId,startX:e.clientX,startY:e.clientY,oldX:o.x,oldY:o.y,x:o.x,y:o.y,w:furnitureDimensions(o)[0],h:furnitureDimensions(o)[1],box,moved:false};
  handle.setPointerCapture?.(e.pointerId);e.preventDefault();
 });
 canvas.addEventListener('pointermove',e=>{if(resizeDrag){const d=resizeDrag;d.nextW=Math.max(1,Math.min(GRID.columns-d.o.x,Math.round(d.width+(e.clientX-d.startX)/d.box.width*GRID.columns)));d.nextH=Math.max(1,Math.min(GRID.rows-d.o.y,Math.round(d.height+(e.clientY-d.startY)/d.box.height*GRID.rows)));try{const copy=structuredClone(getDocument());resizeFurniture(copy,d.id,d.nextW,d.nextH);d.valid=true;}catch{d.valid=false;}d.el.style.width=(100*d.nextW/GRID.columns)+'%';d.el.style.height=(100*d.nextH/GRID.rows)+'%';d.el.classList.toggle('invalid-resize',!d.valid);d.el.classList.add('is-resizing');return;}if(stroke){stroke.end=strokeEnd(stroke,e);stroke.moved=Math.hypot(e.clientX-stroke.fromX,e.clientY-stroke.fromY)>9;if(stroke.moved)showStructurePreview(stroke,stroke.end);return;}if(!drag)return;const d=drag;const dx=e.clientX-d.startX,dy=e.clientY-d.startY;if(Math.abs(dx)+Math.abs(dy)>3)d.moved=true;if(!d.moved)return;
  d.x=Math.max(0,Math.min(GRID.columns-d.w,Math.round(d.oldX+dx/d.box.width*GRID.columns)));
  d.y=Math.max(0,Math.min(GRID.rows-d.h,Math.round(d.oldY+dy/d.box.height*GRID.rows)));
  d.el.style.left=`${d.x/GRID.columns*100}%`;d.el.style.top=`${d.y/GRID.rows*100}%`;d.el.classList.add('is-dragging');
 });
 function drop(e){if(resizeDrag){const d=resizeDrag;resizeDrag=null;if(!d.valid){message('⚠ Redimensionamento bloqueado: verifique móveis e paredes.');render();return;}if(d.nextW!==d.width||d.nextH!==d.height)change(doc=>resizeFurniture(doc,d.id,d.nextW,d.nextH),'Dimensões alteradas pela alça.');else render();return;}if(stroke){const st=stroke;stroke=null;strokePreview?.remove();strokePreview=null;
   if(st.moved){ignoreStructureClick=true;setTimeout(()=>{ignoreStructureClick=false},0);
    change(d=>paintStructureLine(d,st.roomId,st.start,st.end||st.start,state.structure),`Trecho de ${state.structure==='wall'?'parede':state.structure==='door'?'portas':'passagem'} aplicado.`);}
   return;}
  if(!drag)return;const d=drag;drag=null;
  if(d.moved&&(d.x!==d.oldX||d.y!==d.oldY)){const ids=[...state.selectedIds];if(ids.length>1)change(doc=>moveFurnitureGroup(doc,ids,d.x-d.oldX,d.y-d.oldY),'Grupo reposicionado.');else change(doc=>moveFurniture(doc,d.id,d.x,d.y),'Objeto reposicionado.')}else render();focusSelected();
 }
 canvas.addEventListener('pointerup',drop);canvas.addEventListener('pointercancel',drop);
 canvas.addEventListener('keydown',e=>{
  if(!state.active||e.target.closest('input,textarea,select'))return;
  const o=validFurniture(getDocument()).find(x=>x.id===state.selected);if(!o)return;
  let dx=0,dy=0;if(e.key==='ArrowLeft')dx=-1;else if(e.key==='ArrowRight')dx=1;else if(e.key==='ArrowUp')dy=-1;else if(e.key==='ArrowDown')dy=1;
  if(dx||dy){e.preventDefault();if(state.selectedIds.size>1)change(d=>moveFurnitureGroup(d,[...state.selectedIds],dx,dy),'Grupo ajustado na grade.');else change(d=>moveFurnitureBy(d,o.id,dx,dy),'Objeto ajustado na grade.');focusSelected();}
  else if(e.shiftKey&&e.key.toLowerCase()==='d'){e.preventDefault();let copy;if(change(d=>{copy=duplicateFurniture(d,o.id)},'Móvel duplicado.')){state.selected=copy.id;state.selectedIds=new Set([copy.id]);render();focusSelected()}}
  else if(e.key.toLowerCase()==='r'){e.preventDefault();change(d=>rotateFurniture(d,o.id),'Objeto girado.');focusSelected();}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();const ids=[...state.selectedIds];change(d=>ids.length>1?removeFurnitureGroup(d,ids):removeFurniture(d,o.id),'Móvel(is) removido(s).');selectFurniture(null)}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.active&&(state.placing||state.structure)){state.placing=null;state.structure=null;updateControls();message('Inserção cancelada.')}});
 return {state,render,setRoom(id){if(state.roomId!==id){state.roomId=id;state.selected=null;state.selectedIds.clear();}},selectObject(id,additive=false){selectFurniture(id,additive)},show(){state.active=true;wrapper.hidden=false;render()},hide(){state.active=false;wrapper.hidden=true}};
}

export function renderSimWorld(container,doc,result,minute){
 const rooms=(doc.environments||[]);const modelKey=[result.modelId,result.createdAt,doc.updatedAt,rooms.map(r=>r.id).join('|')].join(':');
 if(container.dataset.modelKey!==modelKey){
  container.dataset.modelKey=modelKey;
  container.innerHTML=`<div class="floor-world">${rooms.map(r=>roomHTML(doc,r,{readonly:true,showRoutes:false})).join('')||'<p>Crie ambientes para acompanhar o deslocamento de clientes.</p>'}<div class="floor-actors" aria-label="Pessoas em movimento"></div></div>`;
 }
 const raw=peopleAt(doc,result,minute),people=(doc.environments||[]).flatMap(room=>roomInteractionPlan(doc,raw.filter(a=>a.roomId===room.id),room.id)),layer=container.querySelector('.floor-actors'),world=container.querySelector('.floor-world');if(!layer||!world)return {active:0,waiting:0};
 const frame=world.getBoundingClientRect(),visible=new Set();const countByRoom=new Map();
 for(const person of people){const room=container.querySelector(`[data-floor-room="${CSS.escape(person.roomId)}"]`);if(!room)continue;
  const surface=room.querySelector('.floor-surface'),box=surface.getBoundingClientRect();
  const key=person.id;let el=[...layer.children].find(x=>x.dataset.actor===key);
  if(!el){el=document.createElement('button');el.type='button';el.dataset.actor=key;el.className='floor-person';el.innerHTML='<span class="floor-person-head" aria-hidden="true"></span><span class="floor-person-torso" aria-hidden="true"></span><span class="floor-person-label" aria-hidden="true"></span>';layer.appendChild(el)}
  const x=box.left-frame.left+(person.x/GRID.columns)*box.width,y=box.top-frame.top+(person.y/GRID.rows)*box.height;
  el.style.left=`${x}px`;el.style.top=`${y}px`;
  el.className='floor-person '+(person.kind==='staff'?'floor-person-staff':'floor-person-client')+(person.status==='Na fila'?' floor-person-wait':'')+(person.status.includes('bloqueada')?' floor-person-blocked':'')+(person.pose==='seated'?' floor-person-seated':person.pose==='working'?' floor-person-working':'');
  el.querySelector('.floor-person-label').textContent=person.kind==='staff'?'✦':String(person.caseIndex);el.dataset.simTask=`${person.caseIndex}|${person.nodeId}`;
  el.setAttribute('aria-label',`${person.kind==='staff'?'Profissional':'Cliente'} ${person.caseIndex}: ${person.status}`);el.title=`${person.kind==='staff'?'Profissional':'Cliente'} #${person.caseIndex} · ${person.status}${person.pose==='seated'?' · sentado':person.pose==='working'?' · no posto de trabalho':''}`;visible.add(key);
  const roomCounts=countByRoom.get(person.roomId)||{clients:0,staff:0,queued:0};roomCounts[person.kind==='staff'?'staff':'clients']++;if(person.status==='Na fila')roomCounts.queued++;countByRoom.set(person.roomId,roomCounts);
 }
 for(const el of [...layer.children])if(!visible.has(el.dataset.actor))el.remove();
 for(const r of rooms){const el=container.querySelector(`[data-room-live="${CSS.escape(r.id)}"]`),c=countByRoom.get(r.id);if(el)el.textContent=c?`${c.clients} cliente(s) · ${c.staff} profissional(is)${c.queued?' · '+c.queued+' na fila':''}`:'○ Vazio';}
 return {active:people.filter(p=>p.kind==='client'&&p.status==='Em atendimento').length,waiting:people.filter(p=>p.kind==='client'&&p.status==='Na fila').length,clients:people.filter(p=>p.kind==='client').length,staff:people.filter(p=>p.kind==='staff').length};
}
