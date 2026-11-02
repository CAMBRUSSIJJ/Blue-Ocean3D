/** P8.4: the attached space_planner.html concept, connected to the real floorplan.
 * Keeps the canonical graph, rooms, corridors, zoom, 2D and 3D editors.
 * No CDN, duplicate model, or simulated button handlers.
 */
import {GRID,validFurniture} from './floorplan.mjs';
import {cellMeters} from './floorplan-navigation.mjs';
const p84Esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P84_COLORS=['#1F927F','#587EB7','#B67E48','#9373B4','#D0748F','#5692AA','#7B9167'];
export function installP84SpacePlanner({root,getDocument,onCreate,onOpen,onFlow,onUpdate,onDelete,onNotice}){
 let selected='',diagnostics=false;
 root.classList.add('p84-space-planner');
 const getRoom=id=>(getDocument().environments||[]).find(x=>x.id===id);
 const ensurePanel=()=>{
  let panel=root.querySelector('#p84-properties');
  if(panel)return panel;
  panel=document.createElement('aside');
  panel.id='p84-properties';panel.className='p84-properties';
  panel.setAttribute('aria-label','Propriedades do ambiente');panel.hidden=true;
  root.append(panel);
  return panel;
 };
 function renderInspector(){
  const panel=ensurePanel(),room=getRoom(selected);
  if(!room){panel.hidden=true;root.classList.remove('p84-inspector-open');return;}
  const doc=getDocument(),scale=cellMeters(doc,room.id);
  const area=(GRID.columns*scale*GRID.rows*scale).toFixed(1);
  const activityCount=(doc.nodes||[]).filter(n=>n.environmentId===room.id&&['activity','decision'].includes(n.type)).length;
  const furnitureCount=validFurniture(doc).filter(obj=>obj.roomId===room.id).length;
  const chips=P84_COLORS.map(color=>'<button type="button" class="p84-color-chip" data-p84-color="'+color+'" style="--p84-chip:'+color+'" title="Definir cor '+color+'" aria-label="Cor '+color+'" aria-pressed="'+String(room.color?.toLowerCase()===color.toLowerCase())+'"></button>').join('');
  panel.innerHTML='<header class="p84-properties-head"><div><span class="p84-eyebrow">AMBIENTE SELECIONADO</span><h3>Propriedades</h3></div><button type="button" data-p84-action="close" aria-label="Fechar propriedades">×</button></header>'+
   '<div class="p84-properties-content"><form id="p84-room-form"><label>Nome da sala<input id="p84-room-name" maxlength="72" name="name" required value="'+p84Esc(room.name)+'"></label>'+
   '<div class="p84-room-metrics"><div><small>Área estimada</small><strong>'+area+' m²</strong></div><div><small>Atividades</small><strong>'+activityCount+'</strong></div><div><small>Móveis</small><strong>'+furnitureCount+'</strong></div></div>'+
   '<p class="p84-room-dimensions">'+(GRID.columns*scale).toFixed(1)+' × '+(GRID.rows*scale).toFixed(1)+' m · Planta esquemática</p>'+
   '<fieldset class="p84-colors"><legend>Identificação visual</legend><div>'+chips+'</div></fieldset><button type="submit" class="p84-save-room">Salvar nome</button></form>'+
   '<div class="p84-properties-links"><button type="button" data-p84-action="open3d">↗ Abrir ambiente 3D</button><button type="button" data-p84-action="flow">↗ Ver atividades vinculadas</button><button type="button" data-p84-action="delete" class="p84-danger">Excluir ambiente sem apagar atividades</button></div>'+
   '<p class="p84-room-hint">Movimente a sala diretamente na planta. Portas, móveis e atividades permanecem vinculados.</p></div>';
  panel.hidden=false;root.classList.add('p84-inspector-open');
 }
 function clearSelection(){
  selected='';
  renderInspector();
  root.querySelectorAll('[data-site-room]').forEach(card=>card.classList.remove('p71-selected-room'));
 }
 function select(id){selected=getRoom(id)?id:'';renderInspector();}
 function decorate(){
  // Rebuild-safe: the physical map is re-rendered after each document mutation.
  // Reparent the ORIGINAL mode/zoom controls, so all existing listeners keep working.
  const scroll=root.querySelector('.site-scroll'),modes=root.querySelector('.site21-modes');
  if(!scroll||!modes)return;
  const dock=document.createElement('nav');dock.className='p84-floating-tools';dock.setAttribute('aria-label','Ferramentas da planta');
  const add=document.createElement('button');add.type='button';add.dataset.p84Action='new';
  add.textContent='＋';add.title='Adicionar ambiente (R)';add.setAttribute('aria-label','Adicionar ambiente');
  dock.append(add);
  const separator=document.createElement('span');separator.className='p84-tool-divider';separator.setAttribute('aria-hidden','true');dock.append(separator);
  const labelByMode={view:['↖','Mover ambientes (V)'],paint:['▦','Desenhar corredor (C)'],connect:['⇢','Ligar salas A→B (L)'],erase:['⌫','Apagar corredor (E)']};
  for(const button of modes.querySelectorAll('[data-site-mode]')){
   const [icon,title]=labelByMode[button.dataset.siteMode]||['◈','Ferramenta'];
   button.textContent=icon;button.title=title;button.setAttribute('aria-label',title);
   button.setAttribute('aria-keyshortcuts',button.dataset.siteMode==='view'?'V':button.dataset.siteMode==='paint'?'C':button.dataset.siteMode==='connect'?'L':'E');
  }
  dock.append(...modes.querySelectorAll('[data-site-mode]'));
  const divider2=document.createElement('span');divider2.className='p84-tool-divider';divider2.setAttribute('aria-hidden','true');dock.append(divider2);
  const diag=document.createElement('button');diag.type='button';diag.dataset.p84Action='diagnostics';
  diag.textContent='☷';diag.title='Ver rotas e diagnósticos';diag.setAttribute('aria-label','Ver diagnóstico dos percursos');
  diag.setAttribute('aria-pressed',String(diagnostics));dock.append(diag);
  const more=document.createElement('details');more.className='p84-tools-more';more.innerHTML='<summary aria-label="Mais opções de planta" title="Mais opções">···</summary><div class="p84-menu"></div>';
  const reset=root.querySelector('[data-site-reset]');if(reset)more.querySelector('.p84-menu').append(reset);
  const advanced=root.querySelector('.p72-connection-options');if(advanced)more.querySelector('.p84-menu').append(advanced);
  dock.append(more);
  root.append(dock);
  const zoom=root.querySelector('.p71-zoom-controls');
  if(zoom){zoom.classList.add('p84-floating-zoom');root.append(zoom)}
  // The older top-level toolbar remains in DOM for compatibility, but its
  // controls now live in this bottom toolbar and overflow menu.
  const notes=root.querySelector('.site-notes');
  if(notes){notes.classList.toggle('p84-visible',diagnostics);}
  // Put status feedback in a discreet toast-like row above the canvas.
  const feedback=root.querySelector('.site-feedback');
  if(feedback)feedback.classList.add('p84-status-feedback');
  const panel=ensurePanel();
  if(panel.parentElement!==root)root.append(panel);
  renderInspector();
 }
 root.addEventListener('p71-room-selected',event=>{if(event.detail?.id)select(event.detail.id);});
 root.addEventListener('click',event=>{
  const action=event.target.closest('[data-p84-action]')?.dataset.p84Action;
  if(action==='new'){onCreate?.();return;}
  if(action==='diagnostics'){diagnostics=!diagnostics;root.querySelector('.site-notes')?.classList.toggle('p84-visible',diagnostics);event.target.setAttribute('aria-pressed',String(diagnostics));return;}
  if(action==='close'){clearSelection();return;}
  if(action==='open3d'){if(selected)onOpen?.(selected);return;}
  if(action==='flow'){if(selected)onFlow?.(selected);return;}
  if(action==='delete'){if(selected)Promise.resolve(onDelete?.(selected)).then(ok=>{if(ok){selected='';renderInspector();}}).catch(err=>onNotice?.('⚠ '+err.message));return;}
  const button=event.target.closest('[data-p84-color]');
  if(button&&selected){try{onUpdate?.(selected,{color:button.dataset.p84Color});renderInspector();}catch(err){onNotice?.('⚠ '+err.message);}return;}
  if(event.target.matches('.site-scroll')&&selected)clearSelection();
 });
 root.addEventListener('submit',event=>{
  if(event.target.id!=='p84-room-form')return;
  event.preventDefault();
  if(!selected)return;
  const name=String(new FormData(event.target).get('name')||'').trim();
  if(!name){event.target.querySelector('input')?.focus();return;}
  try{onUpdate?.(selected,{name});renderInspector();}catch(err){onNotice?.('⚠ '+err.message);}
 });
 root.addEventListener('keydown',event=>{
  if(event.target.closest('input,textarea,select,[contenteditable="true"]')||event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.key==='Escape'&&selected){clearSelection();return;}
  const modes={v:'view',c:'paint',l:'connect',e:'erase'};
  const key=event.key.toLowerCase();
  if(modes[key]&&!event.target.closest('button,summary,[role="button"]')){
   const mode=root.querySelector('[data-site-mode="'+modes[key]+'"]');
   if(mode){event.preventDefault();mode.click();}
  }else if(key==='r'&&!event.target.closest('button,summary,[role="button"]')){
   event.preventDefault();onCreate?.();
  }
 });
 return {decorate,select,clearSelection};
}
