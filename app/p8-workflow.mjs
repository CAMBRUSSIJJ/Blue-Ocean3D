import {buildJourneyGraph} from './journey-flow.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const short=(v,n=75)=>String(v||'').length>n?String(v).slice(0,n-1)+'…':String(v||'');
/** Read-only view of the canonical journey; controls dispatch to the editor, not a copied model. */
export function workflowModel(doc){
 const graph=buildJourneyGraph(doc),steps=graph.steps.filter(step=>['activity','decision'].includes(step.type));
 const rooms=new Map((doc.environments||[]).map(r=>[r.id,r]));
 return {steps:steps.map(s=>({...s,room:rooms.get(s.roomId)})),cyclic:graph.cyclic,connections:graph.precedenceCount,unassigned:graph.unassignedCount,isolated:graph.isolatedCount};
}
export function renderWorkflowBoard(doc){
 const model=workflowModel(doc);
 if(!model.steps.length)return '<div class="p8-flow-empty"><div class="p8-empty-illustration">↗</div><h3>Desenhe o primeiro passo do atendimento</h3><p>Crie uma atividade, vincule-a a um ambiente e depois conecte o próximo passo.</p><button type="button" data-p8-flow="new">+ Criar atividade</button></div>';
 return '<div class="p8-flow-list">'+model.steps.map((step,i)=>{
  const room=step.room?.name||'Sem ambiente';
  const color=/^#[0-9a-fA-F]{6}$/.test(step.room?.color)?step.room.color:'#5b83b6';
  const minutes=step.duration>0?step.duration+' min previstos':'Sem duração definida';
  return '<div class="p8-flow-row" style="--p8-accent:'+esc(color)+'"><div class="p8-flow-lane"><span class="p8-flow-lane-icon">▣</span><b>'+esc(room)+'</b><small>Etapa '+(i+1)+'</small></div><div class="p8-flow-path">'+(i?'<span class="p8-path-connector" aria-hidden="true"></span>':'')+'<button type="button" class="p8-flow-card" data-p8-flow="edit" data-id="'+esc(step.id)+'"><span class="p8-card-number">'+String(i+1).padStart(2,'0')+'</span><span class="p8-card-info"><strong>'+esc(short(step.title))+'</strong><small>'+esc(step.team||'Equipe não definida')+' · '+esc(minutes)+'</small></span><span class="p8-card-arrow" aria-hidden="true">↗</span></button>'+((i<model.steps.length-1)?'<span class="p8-flow-arrow" aria-hidden="true">↓</span>':'')+'</div></div>';
 }).join('')+'</div>'+(model.cyclic?'<p class="p8-flow-warning">⚠ Foi encontrado um ciclo. Revise as conexões antes da simulação.</p>':'<p class="p8-flow-disclaimer">A ordem acima segue as dependências registradas; atividades independentes podem executar em paralelo. A visualização não cria conexões automaticamente.</p>');
}
export function mountP8Workflow({root,getDocument,onEdit,onNew,onConnect}){
 const container=document.createElement('section');
 container.className='p8-flow-surface';
 container.id='p8-flow-surface';
 container.setAttribute('aria-label','Mapa operacional do serviço');
 container.innerHTML='<header class="p8-flow-head"><div><span class="p8-eyebrow">MAPA OPERACIONAL DO SERVIÇO</span><h2>Como o serviço funciona</h2><p>Crie atividades diretamente no mapa e conecte o próximo passo.</p></div><div class="p8-flow-head-actions"><button type="button" class="p8-primary" data-p8-flow="new">+ Atividade</button><button type="button" data-p8-flow="connect">↗ Conectar atividades</button></div></header><div class="p8-flow-board"></div><footer class="p8-flow-footer"></footer>';
 root.querySelector('#room-grid').before(container);
 container.addEventListener('click',event=>{
  const btn=event.target.closest('[data-p8-flow]');
  if(!btn)return;
  if(btn.dataset.p8Flow==='new')onNew();
  else if(btn.dataset.p8Flow==='edit')onEdit(btn.dataset.id);
  else if(btn.dataset.p8Flow==='connect')onConnect();
 });
 function render(){
  const doc=getDocument(),model=workflowModel(doc);
  container.querySelector('.p8-flow-board').innerHTML=renderWorkflowBoard(doc);
  container.querySelector('.p8-flow-footer').textContent=model.steps.length+' atividades · '+model.connections+' conexões de execução · '+model.unassigned+' sem ambiente';
 }
 render();
 return {render,element:container};
}
