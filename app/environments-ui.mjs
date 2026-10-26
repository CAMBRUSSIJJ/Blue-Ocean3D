/** Standalone Sims-like room builder: no copies of canonical nodes or links. */
import {CARD_TYPES,EDGE_TYPES,LANES,addEdge,deleteEdge,deleteNode} from './core.mjs';
import {ROOM_PRESETS,projectRooms,createRoom,updateRoom,deleteRoom,assignRoom,createTemplate,applyRoomTemplate,roomById,roomNodes} from './environments.mjs';
import {insertComponent} from './build.mjs';
import {reviewServiceFlow} from './simulation-insights.mjs';
import {initFloorEditor} from './floorplan-ui.mjs';
import {initRoom3D} from './room3d.mjs';
import {initSiteOverview} from './site-overview.mjs';
import {confirmAction} from './confirm-dialog.mjs';
import {initWorkspaceControls} from './workspace-controls.mjs';
import {buildJourneyGraph} from './journey-flow.mjs';
import {initLayoutReview} from './layout-review-ui.mjs';
const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const palette=['#1F927F','#587EB7','#B67E48','#9373B4','#D0748F','#5692AA','#7B9167'];
const initials=s=>String(s||'').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const short=(s,n=45)=>String(s||'').length>n?String(s).slice(0,n-1)+'…':String(s||'');

/** Hybrid layout: reparent existing working controls instead of creating duplicate editors. */
function installHybridLayout(root){
 const shell=root.querySelector('.rooms-shell');
 document.body.classList.add('bo-ocean');
 const main=shell.querySelector('.rooms-main');
 const left=document.createElement('aside');left.className='hybrid-left-dock';left.setAttribute('aria-label','Ambientes e móveis do projeto');
 left.innerHTML=`<div class="hybrid-dock-tabs" role="tablist" aria-label="Navegação lateral"><button id="hybrid-tab-rooms" type="button" role="tab" aria-selected="true">Ambientes</button><button id="hybrid-tab-furniture" type="button" role="tab" aria-selected="false">Móveis</button></div><p class="hybrid-side-caption">Ambientes deste serviço</p>`;
 shell.insertBefore(left,main);
 left.appendChild(document.querySelector('#room-tab-nav'));
 left.appendChild(document.querySelector('#room-furniture-palette'));
 const mobileNav=document.createElement('div');mobileNav.className='hybrid-mobile-panels';mobileNav.innerHTML='<button type="button" id="hybrid-mobile-rooms">☰ Salas</button><button type="button" id="hybrid-mobile-furniture">▦ Móveis</button><button type="button" id="hybrid-mobile-properties">☷ Propriedades</button>';main.prepend(mobileNav);
 const right=document.createElement('aside');right.className='hybrid-right-dock';right.setAttribute('aria-label','Propriedades da seleção');
 right.innerHTML=`<div class="hybrid-dock-tabs" role="tablist" aria-label="Propriedades"><button type="button" id="hybrid-tab-object" role="tab" aria-selected="true">Objeto</button><button type="button" id="hybrid-tab-environment" role="tab" aria-selected="false">Ambiente</button></div>`;
 main.after(right);right.appendChild(document.querySelector('#floor-editor-inspector'));right.appendChild(document.querySelector('#room-detail'));
 const preview=document.createElement('button');preview.type='button';preview.className='hybrid-sim-action';preview.textContent='▶ Simular a partir daqui';preview.addEventListener('click',()=>document.querySelector('.rail-btn[data-view="simulation"]')?.click());right.appendChild(preview);
 const breadcrumb=document.createElement('button');breadcrumb.type='button';breadcrumb.className='hybrid-breadcrumb';breadcrumb.innerHTML='Planta geral <span>›</span> <strong>Ambiente</strong>';breadcrumb.title='Abrir visão geral física';breadcrumb.addEventListener('click',()=>root.querySelector('[data-room-display="overview"]')?.click());main.querySelector('.floor-editor-toolbar').prepend(breadcrumb);
 const journey=document.createElement('section');journey.id='hybrid-journey';journey.className='hybrid-journey';journey.setAttribute('aria-label','Jornada do cliente');journey.innerHTML='<div class="hybrid-journey-title"><strong>Jornada do cliente</strong><span id="hybrid-journey-note">Ordem baseada nas conexões de execução</span><button type="button" id="hybrid-journey-expand" aria-expanded="false" aria-controls="hybrid-journey-list">Expandir</button><button type="button" id="hybrid-layout-compare">Comparar layouts</button><button type="button" id="hybrid-preview">▶ Simular</button></div><div id="hybrid-journey-list" class="hybrid-journey-list" role="region" aria-label="Atividades ordenadas pelas conexões de execução" tabindex="0"></div>';
 shell.after(journey);journey.querySelector('#hybrid-preview').addEventListener('click',()=>document.querySelector('.rail-btn[data-view="simulation"]')?.click());
 journey.querySelector('#hybrid-journey-expand').addEventListener('click',e=>{
  const expanded=journey.classList.toggle('is-expanded');
  e.currentTarget.setAttribute('aria-expanded',String(expanded));
  e.currentTarget.textContent=expanded?'Recolher':'Expandir';
 });
 const switcher=document.createElement('nav');switcher.className='hybrid-top-modes';switcher.setAttribute('aria-label','Modo do Service Builder');switcher.innerHTML='<button type="button" id="hybrid-construct" class="active" aria-current="page">Construir</button><button type="button" id="hybrid-simulate">Simular</button>';
 document.querySelector('.topbar')?.insertBefore(switcher,document.querySelector('.top-actions'));
 switcher.querySelector('#hybrid-construct').addEventListener('click',()=>document.querySelector('.rail-btn[data-view="rooms"]')?.click());switcher.querySelector('#hybrid-simulate').addEventListener('click',()=>document.querySelector('.rail-btn[data-view="simulation"]')?.click());
 const move=document.createElement('button');move.type='button';move.className='hybrid-move active';move.textContent='↖ Mover';move.addEventListener('click',()=>{const active=root.querySelector('.room3d-structure-bar [aria-pressed="true"]');if(active)active.click();root.querySelector('#floor-clear-selection')?.click();move.classList.add('active');});document.querySelector('.room3d-structure-bar')?.prepend(move);
 const tabs=(type)=>{const furniture=type==='furniture';shell.classList.toggle('hybrid-furniture-active',furniture);left.querySelector('#hybrid-tab-rooms').setAttribute('aria-selected',String(!furniture));left.querySelector('#hybrid-tab-furniture').setAttribute('aria-selected',String(furniture));left.querySelector('.hybrid-side-caption').textContent=furniture?'Biblioteca de móveis':'Ambientes deste serviço';};
 left.querySelector('#hybrid-tab-rooms').addEventListener('click',()=>tabs('rooms'));
 left.querySelector('#hybrid-tab-furniture').addEventListener('click',()=>tabs('furniture'));
 mobileNav.querySelector('#hybrid-mobile-rooms').addEventListener('click',()=>{tabs('rooms');shell.classList.toggle('hybrid-mobile-left-open');shell.classList.remove('hybrid-mobile-right-open')});
 mobileNav.querySelector('#hybrid-mobile-furniture').addEventListener('click',()=>{tabs('furniture');shell.classList.add('hybrid-mobile-left-open');shell.classList.remove('hybrid-mobile-right-open')});
 mobileNav.querySelector('#hybrid-mobile-properties').addEventListener('click',()=>{shell.classList.toggle('hybrid-mobile-right-open');shell.classList.remove('hybrid-mobile-left-open')});
 const rightTabs=type=>{const env=type==='environment';right.querySelector('#hybrid-tab-object').setAttribute('aria-selected',String(!env));right.querySelector('#hybrid-tab-environment').setAttribute('aria-selected',String(env));};
 right.querySelector('#hybrid-tab-object').addEventListener('click',()=>{root.querySelector('#room-toggle-details')?.getAttribute('aria-pressed')==='true'&&root.querySelector('#room-toggle-details')?.click();rightTabs('object')});
 right.querySelector('#hybrid-tab-environment').addEventListener('click',()=>{root.querySelector('#room-toggle-details')?.getAttribute('aria-pressed')!=='true'&&root.querySelector('#room-toggle-details')?.click();rightTabs('environment')});
 root.addEventListener('click',e=>{if(e.target.closest('[data-room3d-structure]')){move.classList.toggle('active',!root.querySelector('.room3d-structure-bar [data-room3d-structure][aria-pressed="true"]'));}});
 const workspace=initWorkspaceControls({shell,main,left,right});
 const controls=document.createElement('div');controls.className='bo-canvas-tools';
 controls.innerHTML='<button type="button" id="bo-catalog-tool" aria-label="Alternar entre biblioteca e ambientes" aria-pressed="false" title="Biblioteca de móveis">▦ <span>Biblioteca</span></button><button type="button" id="bo-inspector-tool" aria-expanded="false" title="Abrir ou recolher propriedades">☷ <span>Propriedades</span></button>';
 const toolbar=main.querySelector('.floor-editor-toolbar');
 toolbar?.insertBefore(controls,toolbar.lastElementChild);
 controls.querySelector('#bo-catalog-tool').addEventListener('click',()=>{
  const open=!shell.classList.contains('hybrid-furniture-active');
  tabs(open?'furniture':'rooms');
  workspace.setCollapsed('left',false);
  controls.querySelector('#bo-catalog-tool').setAttribute('aria-pressed',String(open));
 });
 controls.querySelector('#bo-inspector-tool').addEventListener('click',()=>{
  workspace.setCollapsed('right',!workspace.state.rightCollapsed);
  controls.querySelector('#bo-inspector-tool').setAttribute('aria-expanded',String(!workspace.state.rightCollapsed));
 });
 return {tabs,rightTabs,workspace};
}
function renderHybridJourney(doc,selected){
 const list=document.querySelector('#hybrid-journey-list');if(!list)return;
 const flow=buildJourneyGraph(doc);
 const note=document.querySelector('#hybrid-journey-note');
 if(note)note.textContent=flow.cyclic?'⚠ Ciclo identificado: revise as conexões antes de simular':
  `${flow.steps.length} componentes · ${flow.tasks.length} atividades · ${flow.precedenceCount} conexões de execução`;
 if(!flow.steps.length){list.innerHTML='<p class="hybrid-journey-empty">A jornada aparece quando você adiciona atividades ao serviço.</p>';return;}
 const levels=new Map();
 for(const task of flow.steps){if(!levels.has(task.level))levels.set(task.level,[]);levels.get(task.level).push(task)}
 list.innerHTML=[...levels].map(([level,tasks])=>`<div class="hybrid-journey-group" data-journey-level="${level}">
  <div class="hybrid-journey-level">${level===0?'Início / atividades independentes':`Após ${level} conexão(ões)`}${tasks.length>1?'<small> · possíveis execuções paralelas</small>':''}</div>
  <div class="hybrid-journey-tasks">${tasks.map(task=>`<div class="hybrid-journey-step" style="--journey-color:${/^#[0-9a-fA-F]{6}$/.test(task.roomColor)?task.roomColor:'#81939b'}">
   <button type="button" class="hybrid-journey-task" data-hybrid-step="${esc(task.id)}" ${task.roomId?`data-hybrid-room-id="${esc(task.roomId)}"`:''} title="${esc(task.title)} · clique para editar"><strong>${esc(short(task.title,40))}</strong><small>${esc(CARD_TYPES[task.type]?.title||'Componente')} · ${['activity','decision'].includes(task.type)?(task.duration>0?`${task.duration} min previstos`:'Marco sem duração'):'Informativo'}${task.isolated&&['activity','decision'].includes(task.type)?' · Sem sequência':''}${task.outgoing>1?' · Ramificação':''}</small></button>
   ${task.roomId?`<button type="button" class="hybrid-journey-location" data-hybrid-room="${esc(task.roomId)}" title="Abrir ambiente no editor 3D">${esc(task.roomName)} ↗</button>`:'<span class="hybrid-journey-orphan">Sem ambiente vinculado</span>'}
  </div>`).join('')}</div>
 </div>`).join('');
}

export function initRoomBuilder({getDocument,mutate,onEdit,onBack}){
 const root=$('#rooms-view'),hybrid=installHybridLayout(root),ui={active:false,selected:null,editing:null,search:'',stage:0,kitTab:'catalog',display:'three'};
 const layoutReview=initLayoutReview({root,getDocument,getRoomId:()=>ui.selected});
 root.querySelector('#hybrid-layout-compare').addEventListener('click',()=>layoutReview.open());
 root.querySelector('.rooms-shell').classList.add('studio-full','show-object-inspector');
 window.matchMedia('(max-width:1050px)').addEventListener('change',e=>{if(e.matches)setFurniture(false)});
 const overview=initSiteOverview({root:$('#site-overview'),getDocument,mutate,onOpen:id=>{ui.display='three';root.querySelectorAll('[data-room-display]').forEach(x=>{const on=x.dataset.roomDisplay==='three';x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on))});select(id);studioMode();},onMessage:msg=>$('#floor-editor-notice').textContent=msg});
 const floor=initFloorEditor({getDocument,mutate,onEdit:id=>openTask(id),onSelectRoom:id=>{ui.selected=id;renderInspector();}});
 const studio3d=initRoom3D({element:$('#room-3d-stage'),getDocument,getRoomId:()=>ui.selected,getSelection:()=>floor.state.selected,getSelections:()=>[...floor.state.selectedIds],getPlacing:()=>floor.state.placing,mutate,onSelect:(id,additive=false)=>{floor.selectObject(id,additive);setObjectInspector(Boolean(floor.state.selected));},onPlaced:()=>{floor.state.placing=null;draw();},onCancel:()=>{floor.state.placing=null;floor.state.structure=null;floor.render();},onMessage:msg=>$('#floor-editor-notice').textContent=msg,onUnavailable:()=>{if(!ui.active||ui.display!=='three')return;ui.display='visual';root.querySelectorAll('[data-room-display]').forEach(x=>{const yes=x.dataset.roomDisplay==='visual';x.classList.toggle('active',yes);x.setAttribute('aria-pressed',String(yes))});studioMode();draw();$('#floor-editor-notice').textContent='3D indisponível neste navegador. A planta 2D permanece editável.';}});
 function syncTabState(){
   root.querySelectorAll('[data-room-display]').forEach(b=>{
     const selected=b.dataset.roomDisplay===ui.display;
     b.classList.toggle('active',selected);
     b.setAttribute('aria-selected',String(selected));
     b.setAttribute('aria-pressed',String(selected));
     b.tabIndex=selected?0:-1;
   });
 }
 function keyboardTabs(event,selector){
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   const buttons=[...event.currentTarget.querySelectorAll(selector)];
   const position=buttons.indexOf(document.activeElement);
   if(position<0 || !buttons.length)return;
   event.preventDefault();
   const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
       (position+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
   const target=buttons[next];const identity=target.dataset.roomTab||target.dataset.roomDisplay;
   target.click();
   const replacement=[...event.currentTarget.querySelectorAll(selector)].find(b=>(b.dataset.roomTab||b.dataset.roomDisplay)===identity);
   replacement?.focus();
 }
 function studioMode(){root.querySelector('.rooms-shell').dataset.currentDisplay=ui.display;syncTabState();if(ui.display==='cards'||ui.display==='overview'){setFurniture(false);setObjectInspector(false);setDetails(false);}const is3d=ui.display==='three',is2d=ui.display==='visual',isCards=ui.display==='cards',isOverview=ui.display==='overview';$('#floor-editor').hidden=isCards||isOverview;$('#site-overview').hidden=!isOverview;$('#room-3d-stage').hidden=!is3d;$('#floor-editor-map').hidden=!is2d;$('#room-grid').hidden=!isCards;
   if(is3d)studio3d.activate();else studio3d.deactivate();if(isCards){floor.hide();root.querySelector('.room-workflow-drawer').open=true;}else if(isOverview){floor.hide();overview.render()}else floor.show();
 }
 function renderTabs(){const d=getDocument(),nav=$('#room-tab-nav');nav.innerHTML=(d.environments||[]).map(r=>`<button type="button" data-room-tab="${esc(r.id)}" class="room-tab ${ui.selected===r.id?'active':''}" role="tab" aria-selected="${ui.selected===r.id?'true':'false'}" tabindex="${ui.selected===r.id?0:-1}" aria-controls="floor-editor"><span class="room-tab-icon" style="--tab-color:${esc(r.color||'#228b75')}">${esc(r.icon)}</span>${esc(short(r.name,23))}<small>${d.nodes.filter(n=>n.environmentId===r.id).length} atividades</small></button>`).join('')+`<button type="button" class="room-tab-add" id="room-tab-add">＋ Novo ambiente</button>`;
   const current=d.environments?.find(r=>r.id===ui.selected);$('#room-studio-heading').textContent=current?`Editando: ${current.name}`:'Crie um ambiente para começar';$('#room-studio-subtitle').textContent=current?'Só este ambiente aparece no editor. Móveis, dimensões e atividades são preservados ao trocar de sala.':'Crie seu primeiro ambiente no botão Novo ambiente.';
   $('#room-current-activities').innerHTML=current?`<div class="room-activities-header"><div><span class="panel-eyebrow">ATIVIDADES DO AMBIENTE ATUAL</span><h3>${esc(current.name)}</h3><p>Vincule os postos na biblioteca de objetos. As conexões continuam válidas entre ambientes.</p></div><button type="button" data-current-add class="button muted">＋ Atividade</button></div><div class="room-activity-chips">${d.nodes.filter(n=>n.environmentId===current.id).map(n=>`<button type="button" data-room-node="${esc(n.id)}"><b>${esc(n.title)}</b><small>${esc(n.team||'Sem equipe')} · ${Number(n.duration)||0} min ↗</small></button>`).join('')||'<span class="room-empty-activities">Nenhuma atividade neste ambiente. Adicione uma para definir como o serviço funciona.</span>'}</div>`:'<p class="room-empty-activities">Adicione seu primeiro ambiente para começar.</p>';
 }
 
 function status(s){$('#room-live').textContent=s}
 function setFurniture(open){const shell=root.querySelector('.rooms-shell');root.querySelector('#bo-catalog-tool')?.setAttribute('aria-pressed',String(open));shell.classList.toggle('hybrid-furniture-active',open);hybrid.tabs(open?'furniture':'rooms');shell.classList.toggle('show-furniture',open);$('#room-toggle-library').setAttribute('aria-expanded',String(open));}
 function setObjectInspector(open){if(open){hybrid.workspace.setCollapsed('right',false);root.querySelector('#bo-inspector-tool')?.setAttribute('aria-expanded','true');setDetails(false);if(window.matchMedia('(max-width:900px)').matches){root.querySelector('.rooms-shell').classList.add('hybrid-mobile-right-open');root.querySelector('.rooms-shell').classList.remove('hybrid-mobile-left-open');}}root.querySelector('.rooms-shell').classList.toggle('show-object-inspector',open);$('#room-toggle-object-inspector').setAttribute('aria-expanded',String(open));}
 function setDetails(open){const shell=root.querySelector('.rooms-shell');if(open){hybrid.workspace.setCollapsed('right',false);root.querySelector('#bo-inspector-tool')?.setAttribute('aria-expanded','true');}if(open&&window.matchMedia('(max-width:900px)').matches){shell.classList.add('hybrid-mobile-right-open');shell.classList.remove('hybrid-mobile-left-open');}shell.classList.toggle('show-details',open);hybrid.rightTabs(open?'environment':'object');$('#room-toggle-details').setAttribute('aria-pressed',String(open));$('#room-toggle-details').textContent=open?'✕ Fechar detalhes':'⚙ Configurar ambiente';}
 function openCreateDialog(){const d=getDocument(),select=$('#room-create-mode');select.innerHTML='<option value="">Ambiente vazio</option>'+Object.entries(ROOM_PRESETS).map(([key,room])=>`<option value="${esc(key)}">Modelo: ${esc(room.name)}</option>`).join('')+(d.roomTemplates||[]).map(room=>`<option value="${esc(room.id)}">Meu modelo: ${esc(room.name)}</option>`).join('');const dialog=$('#room-create-dialog');if(!dialog.open)dialog.showModal();$('#room-create-dialog-name').focus();}
 
 function apply(change,message){try{mutate(change);draw();status(message||'Ambientes atualizados.');}catch(e){status('Não foi possível: '+e.message);console.error('Erro ao atualizar ambiente:',e)}}
 function select(id){setFurniture(false);setObjectInspector(false);setDetails(false);root.querySelector('.rooms-shell').classList.remove('hybrid-mobile-left-open','hybrid-mobile-right-open');ui.selected=id;floor.state.selected=null;floor.state.placing=null;floor.state.structure=null;floor.setRoom(id);draw();}
 function roomCard(r,proj){const isUnassigned=r.id==='unassigned',selected=ui.selected===r.id;
   const names=r.nodes.filter(n=>!ui.search||[n.title,n.team,n.owner].join(' ').toLocaleLowerCase('pt-BR').includes(ui.search)).slice(0,12);
   const more=r.nodes.length-names.length;
   const incoming=proj.links.filter(l=>l.to===r.id).reduce((t,l)=>t+l.count,0),outgoing=proj.links.filter(l=>l.from===r.id).reduce((t,l)=>t+l.count,0);
   return `<article class="room-tile ${selected?'is-selected':''} ${isUnassigned?'room-unassigned':''}" data-room-id="${esc(r.id)}" tabindex="0" aria-label="Ambiente ${esc(r.name)} com ${r.nodes.length} peças" style="--room-accent:${esc(r.color)}">
      <header class="room-tile-header"><span class="room-emoji" aria-hidden="true">${esc(r.icon)}</span><span class="room-head-copy"><small>${isUnassigned?'ÁREA DE ORGANIZAÇÃO':'AMBIENTE DO SERVIÇO'}</small><strong>${esc(r.name)}</strong><em>${r.nodes.length} peça${r.nodes.length===1?'':'s'} · ${incoming} entra${incoming===1?'':'m'} / ${outgoing} sai${outgoing===1?'':'m'}</em></span><button type="button" class="room-select" data-room-select="${esc(r.id)}" aria-label="Configurar ${esc(r.name)}">⚙</button></header>
      <div class="room-floor" data-room-drop="${esc(r.id)}"><span class="room-floor-label">${isUnassigned?'Arraste peças daqui para um ambiente':'Arraste peças para este ambiente'}</span><div class="room-floor-grid">${names.map(n=>`<div class="room-part" draggable="true" data-room-node="${esc(n.id)}" tabindex="0" role="button" title="Editar peça: ${esc(n.title)}"><span class="part-icon">${esc(CARD_TYPES[n.type]?.icon)}</span><span class="part-text"><b>${esc(short(n.title,34))}</b><small>${esc(docStage(n))} · ${esc(n.team||CARD_TYPES[n.type]?.title)}</small></span><button type="button" class="part-change-room" data-room-move="${esc(n.id)}" title="Mover esta peça para outro ambiente" aria-label="Mover ${esc(n.title)} para outro ambiente">⇄</button></div>`).join('')||'<div class="room-floor-empty"><span>＋</span><strong>Ambiente vazio</strong><small>Adicione uma peça ou arraste uma existente</small></div>'}</div>${more>0?`<p class="room-more">+${more} peças adicionais — use a busca para encontrar</p>`:''}</div>
      <footer class="room-tile-foot"><span>${esc(r.team||'Equipe não definida')}</span>${isUnassigned?'<span>Organize as peças</span>':`<button type="button" data-room-add="${esc(r.id)}">＋ Adicionar peça</button>`}</footer></article>`;
 }
 function docStage(n){return getDocument().stages[n.stage]?.name||'Etapa';}
 function renderCatalog(){const d=getDocument(), saved=d.roomTemplates||[];
   const options=Object.entries(ROOM_PRESETS).map(([key,v])=>`<button class="room-template" data-add-room-kit="${key}"><span style="--template-color:${v.color}" class="template-icon">${esc(v.icon)}</span><span><b>${esc(v.name)}</b><small>${esc(v.description)}</small></span><span class="template-plus" aria-hidden="true">＋</span></button>`).join('');
   const own=saved.map(v=>`<div class="saved-template"><button data-add-room-kit="${esc(v.id)}"><span class="template-icon" style="--template-color:${esc(v.color)}">${esc(v.icon)}</span><span><b>${esc(v.name)}</b><small>${v.nodes.length} peças · modelo pessoal</small></span><span class="template-plus">＋</span></button><button data-delete-template="${esc(v.id)}" class="template-remove" aria-label="Excluir modelo ${esc(v.name)}">×</button></div>`).join('');
   $('#room-catalog-list').innerHTML=ui.kitTab==='catalog'?options:own||'<div class="room-catalog-empty">Seus ambientes salvos como modelo aparecerão aqui.</div>';
   root.querySelectorAll('[data-room-template-tab]').forEach(b=>{b.classList.toggle('is-on',b.dataset.roomTemplateTab===ui.kitTab);b.setAttribute('aria-pressed',String(b.dataset.roomTemplateTab===ui.kitTab))});
 }
 function renderInspector(){const d=getDocument(),room=roomById(d,ui.selected),holder=$('#room-detail');
   if(!room){holder.innerHTML=`<div class="room-detail-intro"><span>✦</span><h2>Monte um ambiente</h2><p>Selecione uma sala funcional do mapa para configurá-la. As atividades criadas aqui formam o fluxo que será simulado.</p><div class="room-mini-guide">① Escolha um kit<br>② Organize peças nas áreas<br>③ Clique nas peças para editar</div></div>`;return}
   const nodes=roomNodes(d,room.id),options=`<option value="">Escolha a peça para adicionar...</option>`+Object.entries(CARD_TYPES).map(([key,t])=>`<option value="${key}">${esc(t.title)}</option>`).join('');
   holder.innerHTML=`<div class="room-detail-head"><span class="panel-eyebrow">PROPRIEDADES DO AMBIENTE</span><div class="room-detail-symbol" style="--room-accent:${esc(room.color)}">${esc(room.icon)}</div><h2>${esc(room.name)}</h2><p>${nodes.length} componente${nodes.length===1?'':'s'}</p></div>
    <form id="room-config-form"><label>Nome do ambiente<input name="name" maxlength="72" required value="${esc(room.name)}"></label><label>Equipe de referência<input name="team" maxlength="80" value="${esc(room.team)}" placeholder="Ex.: Recepção"></label><label>Descrição<textarea name="description" rows="3" maxlength="240" placeholder="Qual é a função deste ambiente?">${esc(room.description)}</textarea></label><fieldset class="room-colors"><legend>Cor do ambiente</legend>${palette.map(color=>`<label class="room-color-chip"><input type="radio" name="color" value="${color}" ${room.color===color?'checked':''}><span style="background:${color}"></span></label>`).join('')}</fieldset><button class="button primary room-full" type="submit">Salvar alterações</button></form>
    <div class="room-add-part"><h3>＋ Colocar peça no ambiente</h3><label>Tipo de peça<select id="room-new-part-type">${options}</select></label><label>Nome (opcional)<input id="room-new-part-title" maxlength="100" placeholder="Ex.: Conferir dados do cliente"></label><label>Duração (minutos)<input id="room-new-part-duration" type="number" min="0" max="100000" step="0.5" value="5"></label><label>Momento do serviço<select id="room-new-part-stage">${d.stages.map((s,i)=>`<option value="${i}">${esc(s.name)}</option>`).join('')}</select></label><button class="button muted room-full" id="room-new-part-btn" ${d.nodes.length>=600?'disabled':''}>Adicionar peça</button></div>
    <div class="room-detail-footer"><button class="button muted room-full" id="room-save-template" ${!nodes.length?'disabled':''}>▤ Salvar como modelo</button><button class="room-delete" id="room-delete-btn">Excluir ambiente sem apagar peças</button></div>`;
   holder.querySelector('#room-config-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target);apply(d=>updateRoom(d,room.id,Object.fromEntries(data)),'Ambiente atualizado.');});
   holder.querySelector('#room-new-part-btn').addEventListener('click',()=>{const type=$('#room-new-part-type').value,stage=Number($('#room-new-part-stage').value),title=$('#room-new-part-title').value.trim(),duration=Number($('#room-new-part-duration').value);if(!type)return status('Escolha um componente.');if(!Number.isFinite(duration)||duration<0||duration>100000)return status('Informe uma duração válida.');apply(d=>{const {node}=insertComponent(d,{type,stage,fields:{team:room.team,title:title||undefined,duration}});assignRoom(d,node.id,room.id);},'Peça adicionada ao ambiente.');});
   holder.querySelector('#room-save-template').addEventListener('click',()=>apply(d=>createTemplate(d,room.id),'Ambiente salvo na biblioteca de modelos.'));
   holder.querySelector('#room-delete-btn').addEventListener('click',async()=>{if(!await confirmAction({title:'Excluir ambiente?',message:`“${room.name}” será excluído. As ${nodes.length} atividades permanecerão no serviço, sem ambiente.`,confirmLabel:'Excluir ambiente'}))return;apply(d=>deleteRoom(d,room.id),'Ambiente removido; peças preservadas.');ui.selected=null;draw();});
 }
 // Activities can be configured and connected without opening the hidden legacy blueprint editor.
 function openTask(id){
   const d=getDocument(),n=d.nodes.find(x=>x.id===id);if(!n){status('Peça não encontrada.');return}
   ui.editing=id;
   const dialog=$('#room-task-dialog'),form=$('#room-task-form');form.elements.title.value=n.title||'';
   form.elements.team.value=n.team||'';form.elements.owner.value=n.owner||'';
   form.elements.duration.value=n.duration??0;form.elements.cost.value=n.cost??0;
   form.elements.description.value=n.description||'';
   $('#task-stage').innerHTML=d.stages.map((st,i)=>`<option value="${i}" ${i===n.stage?'selected':''}>${esc(st.name)}</option>`).join('');
   $('#room-task-heading').textContent=n.title;
   $('#room-task-status').textContent='';
   renderTaskLinks();
   if(!dialog.open)dialog.showModal();
 }
 function closesTask(){ui.editing=null;$('#room-task-dialog').close()}
 function renderTaskLinks(){
   const d=getDocument(),n=d.nodes.find(x=>x.id===ui.editing);if(!n)return;
   const options=d.nodes.filter(x=>x.id!==n.id).map(x=>`<option value="${esc(x.id)}">${esc(short(x.title,43))} · ${esc(d.environments.find(r=>r.id===x.environmentId)?.name||'Sem ambiente')}</option>`);
   $('#room-link-destination').innerHTML='<option value="">Selecione o próximo passo...</option>'+options.join('');
   const edges=d.edges.filter(e=>e.from===n.id||e.to===n.id);
   $('#room-task-links-list').innerHTML=edges.length?edges.map(e=>{
     const target=d.nodes.find(x=>x.id===(e.from===n.id?e.to:e.from));
     return `<div class="room-task-link"><span>${e.from===n.id?'→ Saída':'← Entrada'}</span><b>${esc(target?.title||'Peça')} · ${esc(EDGE_TYPES[e.type]?.title||e.type)}</b><button type="button" data-room-unlink="${esc(e.id)}" aria-label="Remover conexão">Remover</button></div>`;
   }).join(''):'<p>Nenhuma conexão. Adicione uma sequência para que a simulação respeite a ordem.</p>';
 }
 function isCycle(doc,from,to){ // prevent cycles in simulation-precedence links
   const found=new Set(),stack=[to];
   while(stack.length){const curr=stack.pop();if(curr===from)return true;if(found.has(curr))continue;found.add(curr);
     for(const e of doc.edges){if(['sequence','dependency','handoff'].includes(e.type)&&e.from===curr)stack.push(e.to);}}
   return false;
 }
 $('#room-task-close').addEventListener('click',closesTask);
 $('#room-task-dialog').addEventListener('close',()=>{ui.editing=null});
 $('#room-task-form').addEventListener('submit',e=>{
   e.preventDefault();const id=ui.editing,fd=new FormData(e.currentTarget),title=String(fd.get('title')||'').trim(),duration=Number(fd.get('duration')),cost=Number(fd.get('cost')),stage=Number(fd.get('stage'));
   if(!title||!Number.isFinite(duration)||duration<0||duration>100000||!Number.isFinite(cost)||cost<0||cost>1e9){$('#room-task-status').textContent='Confira o nome, duração e custo.';return;}
   apply(d=>{const n=d.nodes.find(x=>x.id===id);if(!n)throw Error('Peça removida.');Object.assign(n,{title,team:String(fd.get('team')||'').trim().slice(0,80),owner:String(fd.get('owner')||'').trim().slice(0,100),description:String(fd.get('description')||'').trim().slice(0,500),duration,cost,stage});},'Atividade salva.');
   // Keep the dialog open, but refresh connections after changing team or title.
   if(ui.editing)openTask(ui.editing);
   $('#room-task-status').textContent='✓ Alterações salvas.';
 });
 $('#room-task-delete').addEventListener('click',async()=>{
   const id=ui.editing,n=getDocument().nodes.find(x=>x.id===id);if(!n)return;
   if(!await confirmAction({title:'Excluir atividade?',message:`A atividade “${n.title}” e suas conexões serão excluídas.`,confirmLabel:'Excluir atividade'}))return;
   closesTask();apply(d=>deleteNode(d,id),'Peça excluída.');
 });
 $('#room-link-type').addEventListener('change',e=>{$('#room-handoff-label').hidden=e.target.value!=='handoff'});
 $('#room-link-add').addEventListener('click',()=>{
   const from=ui.editing,to=$('#room-link-destination').value,type=$('#room-link-type').value,label=$('#room-link-label').value.trim();
   if(!from||!to){$('#room-task-status').textContent='Escolha uma peça de destino.';return;}
   if(type==='handoff'&&!label){$('#room-task-status').textContent='Informe o que será transferido entre equipes.';return;}
   const d=getDocument();if(isCycle(d,from,to)){$('#room-task-status').textContent='Essa ligação criaria um ciclo e impediria a simulação.';return;}
   try{mutate(d=>addEdge(d,{from,to,type,label}));draw();renderTaskLinks();$('#room-task-status').textContent='✓ Conexão criada.';$('#room-link-label').value='';}
   catch(e){$('#room-task-status').textContent='Não foi possível conectar: '+e.message;}
 });
 $('#room-task-links-list').addEventListener('click',e=>{
   const b=e.target.closest('[data-room-unlink]');if(!b)return;
   apply(d=>deleteEdge(d,b.dataset.roomUnlink),'Conexão removida.');renderTaskLinks();
 });
 function renderFlow(proj){const d=getDocument(),byId=new Map(proj.rooms.map(r=>[r.id,r.name]));const sorted=[...proj.links].sort((a,b)=>b.count-a.count);
   $('#room-flow-list').innerHTML=sorted.length?sorted.slice(0,12).map(l=>`<div class="room-flow"><span>${esc(byId.get(l.from)||'Área')}</span><span class="flow-arrow">→</span><span>${esc(byId.get(l.to)||'Área')}</span><b>${l.count}</b></div>`).join(''):'<p class="room-flow-empty">Ao conectar peças de ambientes diferentes, as passagens aparecerão aqui.</p>';
   $('#room-flow-note').textContent=`${sorted.reduce((a,b)=>a+b.count,0)} conexões entre ambientes · relações existentes, sem inferências.`;
 }
 function draw(){if(!ui.active)return;const d=getDocument();if(!d.environments?.some(r=>r.id===ui.selected))ui.selected=d.environments?.[0]?.id||null;floor.setRoom(ui.selected);const proj=projectRooms(d);const shown=proj.rooms.filter(r=>r.id!=='unassigned').filter(r=>!ui.search||[r.name,r.team,r.description,...r.nodes.map(n=>n.title)].join(' ').toLocaleLowerCase('pt-BR').includes(ui.search));
   const check=reviewServiceFlow(d);
   $('#room-readiness').innerHTML=check.warnings.length?`<details class="room-check-details"><summary>⚑ ${check.warnings.length} ponto(s) para revisar no fluxo · clique para conferir</summary><p>Verifique o fluxo antes de simular. Atividades independentes podem executar em paralelo quando essa for a intenção.</p><div class="room-check-items">${check.warnings.map(issue=>`<button type="button" data-room-review="${esc(issue.nodeId)}"><b>${issue.count}</b> ${esc(issue.text)} <span aria-hidden="true">↗</span></button>`).join('')}</div></details>`:`<div class="room-check-good"><b>✓ Fluxo básico revisado</b><span>${check.tasks} atividade(s) verificadas. Os resultados continuam hipotéticos.</span></div>`;
   $('#room-stats').innerHTML=[['▦','Ambientes',d.environments?.length||0],['▣','Peças organizadas',proj.assigned],['◇','Sem ambiente',proj.unassigned],['↗','Ligações entre ambientes',proj.links.reduce((a,l)=>a+l.count,0)]].map(([icon,l,v])=>`<div class="room-stat"><span>${icon}</span><b>${v}</b><small>${l}</small></div>`).join('');
   $('#room-grid').innerHTML=shown.map(r=>roomCard(r,proj)).join('')+roomCard(proj.rooms.find(r=>r.id==='unassigned'),proj);
   $('#room-count-label').textContent=`${shown.length} ambientes • ${d.nodes.length} peças totais`;
   renderCatalog();renderFlow(proj);renderInspector();renderTabs();renderHybridJourney(d,ui.selected);syncTabState();if(ui.display==='overview')overview.render();else if(ui.display!=='cards')floor.render();if(ui.display==='three')studio3d.render();
 }
 root.addEventListener('click',async e=>{const kit=e.target.closest('[data-add-room-kit]'),remove=e.target.closest('[data-delete-template]'),sel=e.target.closest('[data-room-select]'),room=e.target.closest('.room-tile'),item=e.target.closest('[data-room-node]'),add=e.target.closest('[data-room-add]');
   const hybridRoom=e.target.closest('[data-hybrid-room]');if(hybridRoom&&!e.target.closest('[data-hybrid-step]')){select(hybridRoom.dataset.hybridRoom);return}const hybridStep=e.target.closest('[data-hybrid-step]');if(hybridStep){if(hybridStep.dataset.hybridRoomId&&ui.selected!==hybridStep.dataset.hybridRoomId)select(hybridStep.dataset.hybridRoomId);openTask(hybridStep.dataset.hybridStep);return}const review=e.target.closest('[data-room-review]');if(review){openTask(review.dataset.roomReview);return}
   if(remove){e.stopPropagation();if(!await confirmAction({title:'Excluir modelo?',message:'O modelo reutilizável será excluído, mas os ambientes existentes não serão alterados.',confirmLabel:'Excluir modelo'}))return;apply(d=>{d.roomTemplates=d.roomTemplates.filter(t=>t.id!==remove.dataset.deleteTemplate)},'Modelo removido.');return}
   if(kit){const key=kit.dataset.addRoomKit;apply(d=>{const v=applyRoomTemplate(d,key,{startStage:0});Object.assign(d,v.document);ui.selected=v.room.id},'Kit inserido: ambiente, peças e conexões criados.');return}
   const move=e.target.closest('[data-room-move]');if(move){e.stopPropagation();const dialog=$('#room-move-dialog');dialog.dataset.node=move.dataset.roomMove;$('#room-move-to').innerHTML=`<option value="">Sem ambiente</option>`+(getDocument().environments||[]).map(r=>`<option value="${esc(r.id)}" ${getDocument().nodes.find(n=>n.id===move.dataset.roomMove)?.environmentId===r.id?'selected':''}>${esc(r.name)}</option>`).join('');dialog.showModal();return}
   if(sel){select(sel.dataset.roomSelect);return}
   if(add){select(add.dataset.roomAdd);setDetails(true);setTimeout(()=>$('#room-new-part-type')?.focus(),0);return}
   if(item){openTask(item.dataset.roomNode);return}
   if(room){select(room.dataset.roomId==='unassigned'?null:room.dataset.roomId)}
 });
 root.addEventListener('keydown',e=>{const card=e.target.closest('.room-tile'),item=e.target.closest('.room-part');if(!['Enter',' '].includes(e.key))return;if(e.target.tagName==='BUTTON')return;if(item){e.preventDefault();openTask(item.dataset.roomNode)}else if(card){e.preventDefault();select(card.dataset.roomId)}});
 root.addEventListener('dragstart',e=>{const item=e.target.closest('[data-room-node]');if(!item)return;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/x-service-room-node',item.dataset.roomNode);});
 root.addEventListener('dragover',e=>{const target=e.target.closest('[data-room-drop]');if(!target)return;e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('is-drag-over')});
 root.addEventListener('dragleave',e=>{const t=e.target.closest('[data-room-drop]');if(t&&!t.contains(e.relatedTarget))t.classList.remove('is-drag-over')});
 root.addEventListener('drop',e=>{const target=e.target.closest('[data-room-drop]');if(!target)return;e.preventDefault();const node=e.dataTransfer.getData('text/x-service-room-node'),room=target.dataset.roomDrop;target.classList.remove('is-drag-over');if(!node)return;apply(d=>assignRoom(d,node,room==='unassigned'?null:room),'Peça movida sem alterar suas conexões.');});
 root.querySelector('.floor-display-switch').addEventListener('keydown',e=>keyboardTabs(e,'[data-room-display]'));
 $('#room-tab-nav').addEventListener('keydown',e=>keyboardTabs(e,'[data-room-tab]'));
 root.querySelector('.floor-display-switch').addEventListener('click',e=>{const b=e.target.closest('[data-room-display]');if(!b)return;ui.display=b.dataset.roomDisplay;syncTabState();studioMode();draw()});
 $('#room-tab-nav').addEventListener('click',e=>{const tab=e.target.closest('[data-room-tab]');if(tab){if(ui.display==='overview'){ui.display='three';root.querySelectorAll('[data-room-display]').forEach(x=>{const isOn=x.dataset.roomDisplay==='three';x.classList.toggle('active',isOn);x.setAttribute('aria-pressed',String(isOn))});studioMode();}select(tab.dataset.roomTab);return}if(e.target.closest('#room-tab-add'))openCreateDialog();});
 $('#room-current-activities').addEventListener('click',e=>{if(e.target.closest('[data-current-add]'))$('#floor-add-task').click()});
 $('#room-toggle-catalog').addEventListener('click',()=>{const hide=root.querySelector('.rooms-shell').classList.toggle('hide-catalog');$('#room-toggle-catalog').setAttribute('aria-pressed',String(!hide));});
 $('#room-toggle-library').addEventListener('click',()=>setFurniture(!root.querySelector('.rooms-shell').classList.contains('show-furniture')));
 $('#room-close-library').addEventListener('click',()=>setFurniture(false));
 $('#room-toggle-object-inspector').addEventListener('click',()=>setObjectInspector(!root.querySelector('.rooms-shell').classList.contains('show-object-inspector')));
 $('#room-create-close').addEventListener('click',()=>$('#room-create-dialog').close());
 $('#room-create-cancel').addEventListener('click',()=>$('#room-create-dialog').close());
 $('#room-create-form').addEventListener('submit',e=>{e.preventDefault();const name=$('#room-create-dialog-name').value.trim(),key=$('#room-create-mode').value;if(!name){$('#room-create-dialog-name').focus();return}apply(d=>{if(key){const result=applyRoomTemplate(d,key,{startStage:0});Object.assign(d,result.document);ui.selected=result.room.id;if(result.room.name!==name)updateRoom(d,result.room.id,{name});}else{ui.selected=createRoom(d,{name}).id;}},'Novo ambiente criado e aberto.');$('#room-create-dialog').close();e.target.reset();});
 $('#floor-structure-tools').addEventListener('click',e=>{if(!e.target.closest('[data-floor-structure]')||ui.display==='visual')return;ui.display='visual';root.querySelectorAll('[data-room-display]').forEach(x=>{const yes=x.dataset.roomDisplay==='visual';x.classList.toggle('active',yes);x.setAttribute('aria-pressed',String(yes))});studioMode();draw();$('#floor-editor-notice').textContent='Edite paredes, portas e passagens com precisão na planta 2D.';});
 $('#room-kit-tabs').addEventListener('click',e=>{let button=e.target.closest('[data-room-template-tab]');if(button){ui.kitTab=button.dataset.roomTemplateTab;renderCatalog()}});
 $('#room-create-btn').addEventListener('click',()=>{const name=$('#room-create-name').value.trim();if(!name){$('#room-create-name').focus();return}apply(d=>{const r=createRoom(d,{name});ui.selected=r.id},'Ambiente vazio criado.');$('#room-create-name').value='';});
 $('#room-create-name').addEventListener('keydown',e=>{if(e.key==='Enter'){$('#room-create-btn').click();e.preventDefault()}});
 $('#room-search').addEventListener('input',e=>{ui.search=e.target.value.toLocaleLowerCase('pt-BR');draw()});
 $('#room-team-organize').addEventListener('click',()=>{const d=getDocument();const matches=d.nodes.filter(n=>!n.environmentId&&n.team?.trim()&&d.environments.some(r=>r.team?.trim()&&r.team.toLocaleLowerCase('pt-BR')===n.team.trim().toLocaleLowerCase('pt-BR')));if(!matches.length){status('Não há peças sem ambiente com equipe correspondente.');return;}apply(d=>{for(const n of matches){const room=d.environments.find(r=>r.team.toLocaleLowerCase('pt-BR')===n.team.trim().toLocaleLowerCase('pt-BR'));assignRoom(d,n.id,room.id)}},`${matches.length} peças organizadas por equipe.`);});
 $('#room-move-confirm').addEventListener('click',()=>{const dialog=$('#room-move-dialog'),node=dialog.dataset.node,target=$('#room-move-to').value;dialog.close();apply(d=>assignRoom(d,node,target),'Peça transferida, preservando suas conexões.');});
 $('#floor-add-task').addEventListener('click',()=>{
   if(!getDocument().environments?.length){openCreateDialog();status('Crie um ambiente para adicionar atividades.');return;}
   if(!roomById(getDocument(),ui.selected))ui.selected=getDocument().environments[0].id;
   setFurniture(false);setObjectInspector(false);setDetails(true);
   renderInspector();
   $('#room-new-part-type').value='activity';
   $('#room-new-part-type').focus();
   status('Configure a atividade no painel do ambiente e clique em Adicionar peça.');
 });
 $('#room-toggle-details').addEventListener('click',()=>{
   const open=!root.querySelector('.rooms-shell').classList.contains('show-details');
   if(open){setFurniture(false);setObjectInspector(false);}setDetails(open);
   if(open&&ui.selected==null&&getDocument().environments?.length){ui.selected=getDocument().environments[0].id;renderInspector();}
 });
 $('#room-back').addEventListener('click',onBack);
 $('#room-help').addEventListener('click',()=>$('#room-how').hidden=!$('#room-how').hidden);
 return {show(){ui.active=true;root.hidden=false;document.body.classList.add('sb-hybrid-active');document.querySelector('#hybrid-construct')?.classList.add('active');document.querySelector('#hybrid-simulate')?.classList.remove('active');document.querySelector('#hybrid-construct')?.setAttribute('aria-current','page');document.querySelector('#hybrid-simulate')?.removeAttribute('aria-current');if(window.matchMedia('(max-width:1400px)').matches)setFurniture(false);studioMode();draw();},hide(){ui.active=false;document.body.classList.remove('sb-hybrid-active');document.querySelector('#hybrid-construct')?.classList.remove('active');document.querySelector('#hybrid-simulate')?.classList.add('active');document.querySelector('#hybrid-simulate')?.setAttribute('aria-current','page');document.querySelector('#hybrid-construct')?.removeAttribute('aria-current');floor.hide();studio3d.deactivate();root.hidden=true;},refresh(){draw()},openTask,state:ui};
}
