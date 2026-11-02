import {buildJourneyGraph} from './journey-flow.mjs';
import {evaluateServiceReadiness,serviceContext,SERVICE_CONTEXT_FIELDS} from './p82-service-readiness.mjs';
const p8Esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p8Short=(v,n=72)=>String(v||'').length>n?String(v).slice(0,n-1)+'…':String(v||'');
const TYPES=new Set(['sequence','dependency','handoff']);
const LABELS={audience:'Quem utiliza o serviço?',trigger:'Como o serviço começa?',outcome:'Qual é o resultado esperado?',scope:'Escopo do atendimento',assumptions:'Hipóteses e observações'};
export function workflowModel(doc){
 const graph=buildJourneyGraph(doc),steps=graph.steps.filter(step=>['activity','decision'].includes(step.type));
 const rooms=new Map((doc.environments||[]).map(r=>[r.id,r]));
 const byId=new Map((doc.nodes||[]).map(n=>[n.id,n]));
 const edges=(doc.edges||[]).filter(e=>TYPES.has(e.type)&&byId.has(e.from)&&byId.has(e.to));
 return {steps:steps.map(s=>({...s,room:rooms.get(s.roomId),node:byId.get(s.id)})),cyclic:graph.cyclic,connections:graph.precedenceCount,unassigned:graph.unassignedCount,isolated:graph.isolatedCount,edges,byId};
}
export function renderWorkflowBoard(doc,{focusRoom=null,connecting=false,origin=null}={}){
 const model=workflowModel(doc);
 if(!model.steps.length)return '<div class="p8-flow-empty"><div class="p8-empty-illustration">↗</div><h3>Descreva a primeira atividade</h3><p>Você pode começar pelo funcionamento, sem criar salas. Os espaços físicos serão vinculados depois, quando necessário.</p><button type="button" data-p8-flow="new">+ Criar atividade</button></div>';
 return '<div class="p8-flow-list">'+model.steps.map((step,i)=>{
  const room=step.room?.name||'Sem ambiente físico',color=/^#[0-9a-fA-F]{6}$/.test(step.room?.color)?step.room.color:'#5b83b6';
  const next=model.steps[i+1],direct=next&&model.edges.some(e=>e.from===step.id&&e.to===next.id);
  const outgoing=model.edges.filter(e=>e.from===step.id).map(e=>model.byId.get(e.to)?.title||'Destino');
  const connected=outgoing.length?'<span class="p82-card-links">→ '+p8Esc(outgoing.slice(0,2).join(' · '))+(outgoing.length>2?' · +'+(outgoing.length-2):'')+'</span>':'<span class="p82-card-links p82-unlinked">Sem saída vinculada</span>';
  const active=focusRoom&&step.roomId===focusRoom,dim=focusRoom&&step.roomId!==focusRoom;
  return '<div class="p8-flow-row'+(active?' p82-focus-active':'')+(dim?' p82-focus-muted':'')+'" style="--p8-accent:'+p8Esc(color)+'"><div class="p8-flow-lane"><span class="p8-flow-lane-icon">▣</span><b>'+p8Esc(room)+'</b><small>Atividade '+(i+1)+'</small></div><div class="p8-flow-path"><button type="button" class="p8-flow-card'+(origin===step.id?' p82-origin':'')+'" data-p8-flow="'+(connecting?'pick':'edit')+'" data-id="'+p8Esc(step.id)+'"><span class="p8-card-number">'+String(i+1).padStart(2,'0')+'</span><span class="p8-card-info"><strong>'+p8Esc(p8Short(step.title))+'</strong><small>'+p8Esc(step.team||'Equipe não definida')+' · '+(Number(step.duration)>0?p8Esc(step.duration)+' min informados':'Tempo não definido')+'</small>'+connected+'</span><span class="p8-card-arrow" aria-hidden="true">↗</span></button>'+(direct?'<span class="p8-flow-arrow" aria-label="Conexão registrada">↓</span>':'')+'</div></div>';
 }).join('')+'</div>'+(model.cyclic?'<p class="p8-flow-warning">⚠ Ciclo identificado: revise as conexões.</p>':'<p class="p8-flow-disclaimer">Setas somente representam conexões cadastradas. A ordem na tela não cria dependências; caminhos independentes podem acontecer em paralelo.</p>');
}
function contextMarkup(doc){
 const context=serviceContext(doc);
 const filled=Object.values(context).filter(Boolean).length;
 return '<div class="p82-context-bar"><div class="p82-context-main"><span class="p8-eyebrow">CONTEXTO DO SERVIÇO</span><strong>'+p8Esc(doc.name||'Serviço')+'</strong><span>'+p8Esc(context.outcome||'Resultado esperado ainda não definido')+'</span></div><div class="p82-context-meta"><span>'+p8Esc(context.audience||'Público não definido')+'</span><span>'+p8Esc(context.trigger||'Início não definido')+'</span></div><button type="button" data-p8-flow="context">Editar contexto <span aria-hidden="true">↗</span></button><span class="p82-context-progress" title="Campos de contexto preenchidos">'+filled+'/'+SERVICE_CONTEXT_FIELDS.length+'</span></div>';
}
function readinessMarkup(report){
 const issues=[...report.errors.map(x=>({...x,level:'blocker'})),...report.reviews.map(x=>({...x,level:'review'})),...report.informations.map(x=>({...x,level:'info'}))];
 return '<details class="p82-readiness"><summary><span>◈ <strong>Preparação da simulação</strong></span><span class="p82-readiness-count">'+(report.errors.length?report.errors.length+' impedimento(s)':'Simulação executável')+' · '+report.reviews.length+' pontos a revisar</span><span>▾</span></summary><div class="p82-readiness-body"><div class="p82-readiness-facts"><span><b>'+report.taskCount+'</b> atividades</span><span><b>'+report.connectionCount+'</b> conexões</span><span><b>'+report.documentedTimes+'/'+report.taskCount+'</b> com tempo</span><span><b>'+report.documentedTeams+'/'+report.taskCount+'</b> com equipe</span></div>'+(issues.length?issues.map(it=>'<button type="button" class="p82-issue p82-'+it.level+'" data-p8-flow="review" data-id="'+p8Esc(it.nodeId||'')+'"><b>'+p8Esc(it.title)+'</b><span>'+p8Esc(it.detail)+'</span><em>↗</em></button>').join(''):'<p class="p82-all-good">Sem pendências de modelagem identificadas.</p>')+'<p class="p82-readiness-disclaimer">A preparação não inventa dados: valores não preenchidos permanecem hipóteses ou limitações da simulação.</p></div></details>';
}
export function mountP8Workflow({root,getDocument,onEdit,onNew,onConnect,onSaveContext,onLink,onOpenRoom}){
 let connecting=false,origin=null,focusRoom=null;
 const container=document.createElement('section');
 container.className='p8-flow-surface';container.id='p8-flow-surface';container.setAttribute('aria-label','Mapa operacional do serviço');
 container.innerHTML='<div class="p82-context-target"></div><header class="p8-flow-head"><div><span class="p8-eyebrow">MAPA OPERACIONAL DO SERVIÇO</span><h2>Como o serviço funciona</h2><p>Organize atividades e conecte apenas as dependências reais.</p></div><div class="p8-flow-head-actions"><button type="button" class="p8-primary" data-p8-flow="new">+ Atividade</button><button type="button" data-p8-flow="connect" aria-pressed="false">↗ Conectar atividades</button><button type="button" data-p8-flow="all-rooms" hidden>Todos os ambientes ×</button></div></header><div class="p82-connect-note" role="status" hidden></div><div class="p8-flow-board"></div><div class="p82-readiness-target"></div><footer class="p8-flow-footer"></footer>';
 root.querySelector('.room-workflow-drawer').before(container);
 const dialog=document.createElement('dialog');dialog.className='p82-context-dialog';dialog.id='p82-context-dialog';dialog.setAttribute('aria-labelledby','p82-context-heading');
 dialog.innerHTML='<form id="p82-context-form"><header><div><span class="p8-eyebrow">DEFINIÇÃO DO SERVIÇO</span><h2 id="p82-context-heading">Contexto operacional</h2></div><button type="button" data-p82-dismiss aria-label="Fechar">×</button></header><p>Esses dados ajudam a compreender o funcionamento e não alteram as atividades nem a planta 3D.</p><div class="p82-context-fields">'+SERVICE_CONTEXT_FIELDS.map(k=>'<label>'+LABELS[k]+'<textarea name="'+k+'" maxlength="500" rows="2" placeholder="Descreva com suas palavras"></textarea></label>').join('')+'</div><footer><button type="button" data-p82-dismiss>Cancelar</button><button type="submit" class="p8-primary">Salvar contexto</button></footer></form>';
 root.append(dialog);
 dialog.addEventListener('click',e=>{if(e.target.closest('[data-p82-dismiss]'))dialog.close();});
 dialog.querySelector('form').addEventListener('submit',e=>{
  e.preventDefault();const fields=Object.fromEntries(SERVICE_CONTEXT_FIELDS.map(k=>[k,String(new FormData(e.currentTarget).get(k)||'').trim().slice(0,500)]));
  try{onSaveContext?.(fields);dialog.close();render();}catch(err){container.querySelector('.p82-connect-note').hidden=false;container.querySelector('.p82-connect-note').textContent='Não foi possível salvar: '+err.message;}
 });
 function render(){
  const doc=getDocument(),model=workflowModel(doc),report=evaluateServiceReadiness(doc);
  const board=container.querySelector('.p8-flow-board');const wasOpen=container.querySelector('.p82-readiness')?.open||false;
  container.querySelector('.p82-context-target').innerHTML=contextMarkup(doc);
  board.innerHTML=renderWorkflowBoard(doc,{connecting,origin,focusRoom});
  container.querySelector('.p82-readiness-target').innerHTML=readinessMarkup(report);
  container.querySelector('.p82-readiness').open=wasOpen;
  const button=container.querySelector('[data-p8-flow="connect"]');button.setAttribute('aria-pressed',String(connecting));button.classList.toggle('p82-linking',connecting);button.textContent=connecting?'Cancelar ligação ×':'↗ Conectar atividades';
  container.querySelector('[data-p8-flow="all-rooms"]').hidden=!focusRoom;
  container.querySelector('.p8-flow-footer').textContent=model.steps.length+' atividades · '+model.connections+' ligações operacionais · '+model.unassigned+' sem ambiente físico';
  const note=container.querySelector('.p82-connect-note');
  note.hidden=!connecting;note.textContent=connecting?(origin?'Selecione o cartão de destino. Esc cancela.':'Selecione o primeiro cartão para iniciar a conexão. Esc cancela.'):'';
 }
 container.addEventListener('click',e=>{
  const btn=e.target.closest('[data-p8-flow]');if(!btn)return;const action=btn.dataset.p8Flow,id=btn.dataset.id;
  if(action==='new')return onNew();
  if(action==='edit')return onEdit(id);
  if(action==='context'){const ctx=serviceContext(getDocument());SERVICE_CONTEXT_FIELDS.forEach(k=>{dialog.querySelector('[name="'+k+'"]').value=ctx[k]});dialog.showModal();return;}
  if(action==='connect'){connecting=!connecting;origin=null;render();return;}
  if(action==='all-rooms'){focusRoom=null;render();return;}
  if(action==='review'){if(id)return onEdit(id);const ctx=serviceContext(getDocument());SERVICE_CONTEXT_FIELDS.forEach(k=>{dialog.querySelector('[name="'+k+'"]').value=ctx[k]});dialog.showModal();return;}
  if(action==='pick'){
   if(!origin){origin=id;render();return;}
   if(id===origin){origin=null;render();return;}
   try{onLink?.(origin,id);connecting=false;origin=null;render();}
   catch(err){const note=container.querySelector('.p82-connect-note');note.hidden=false;note.textContent='Não foi possível conectar: '+err.message;}
  }
 });
 container.addEventListener('keydown',e=>{if(e.key==='Escape'&&connecting){connecting=false;origin=null;render();}});
 render();
 return {render,element:container,setFocusRoom(id){focusRoom=id||null;connecting=false;origin=null;render();},clearConnection(){connecting=false;origin=null;render();}};
}
