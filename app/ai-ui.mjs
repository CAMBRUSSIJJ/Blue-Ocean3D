/** UI isolada: sem edição direta, sem armazenar conteúdo do chat no navegador. */
import {summarizeProject,normalizeProposals,readableAction,applyApprovedProposals} from './ai-core.mjs';
const $=s=>document.querySelector(s);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export function initCopilot({getDocument,applyApproved,onApplied,getLatestSimulation,onUndo}){
 const panel=$('#ai-panel'),launch=$('#ai-launch'),close=$('#ai-close'),models=$('#ai-models'),status=$('#ai-connection'),feed=$('#ai-messages'),form=$('#ai-form'),input=$('#ai-input'),submit=$('#ai-submit'),sendContext=$('#ai-send-context'),preview=$('#ai-preview'),previewList=$('#ai-preview-list'),apply=$('#ai-apply'),discard=$('#ai-discard');
 const state={history:[],pending:null,pendingSnapshot:null,busy:false,connected:false,lastAppliedSnapshot:null};const setup=$('#ai-setup');
 const undoButton=$('#ai-undo');undoButton.addEventListener('click',()=>{if(!undoButton.hidden){if(JSON.stringify(getDocument())!==state.lastAppliedSnapshot){say('assistant','O projeto mudou desde a aplicação. Use o histórico de desfazer para não reverter outras edições.');undoButton.hidden=true;return}onUndo?.();undoButton.hidden=true;state.lastAppliedSnapshot=null;say('assistant','Última aplicação do copiloto desfeita.')}});
 const say=(who,message)=>{const node=document.createElement('div');node.className=`ai-message ai-${who}`;const label=document.createElement('small');label.textContent=who==='user'?'Você':'Copiloto';const body=document.createElement('p');body.textContent=message;node.append(label,body);feed.append(node);feed.scrollTop=feed.scrollHeight;return node};
 const setStatus=(message,kind='neutral')=>{status.textContent=message;status.dataset.kind=kind};
 const setBusy=bool=>{state.busy=bool;submit.disabled=bool;input.disabled=bool;submit.textContent=bool?'Consultando…':'Enviar';models.disabled=bool};
 const resetPreview=()=>{state.pending=null;state.pendingSnapshot=null;preview.hidden=true;previewList.replaceChildren()};
 async function reload(){
  setStatus('Verificando o Ollama local…');models.innerHTML='<option value="">Verificando…</option>';
  try{
   const response=await fetch('/api/ai/models',{cache:'no-store'});
   if(!response.ok)throw Error('Servidor indisponível');
   const info=await response.json();state.connected=Boolean(info.connected);
   const all=info.models||[];models.replaceChildren();
   if(all.length){for(const item of all){const option=document.createElement('option');option.value=item.name;option.textContent=item.name;models.append(option)}const preferred=all.find(i=>i.name==='qwen3:4b')||all.find(i=>/4b/.test(i.name))||all[0];models.value=preferred.name;}
   else{const option=document.createElement('option');option.value='';option.textContent='Nenhum modelo instalado';models.append(option)}
   setup.hidden=Boolean(all.length);setStatus(!info.connected?'Ollama desligado · Veja como iniciar abaixo':all.length?`Conectado · ${all.length} modelo(s) local(is)`:'Ollama conectado, mas falta baixar um modelo',all.length?'success':'warning');
  }catch(e){state.connected=false;setup.hidden=false;models.innerHTML='<option value="">Ollama indisponível</option>';setStatus('Servidor local indisponível','warning')}
 }
 function open(){panel.hidden=false;launch.setAttribute('aria-expanded','true');reload();setTimeout(()=>input.focus(),80)}
 function hide(){panel.hidden=true;launch.setAttribute('aria-expanded','false');launch.focus()}
 launch.addEventListener('click',()=>panel.hidden?open():hide());close.addEventListener('click',hide);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden&&document.activeElement?.closest('#ai-panel'))hide()});
 $('#ai-refresh').addEventListener('click',reload);
 $('#ai-clear').addEventListener('click',()=>{state.history=[];resetPreview();feed.replaceChildren();say('assistant','Conversa limpa. Nenhuma alteração foi aplicada ao projeto.')});
 document.querySelectorAll('[data-ai-example]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.aiExample;input.focus()}));
 discard.addEventListener('click',()=>{resetPreview();say('assistant','Proposta descartada. O projeto não foi modificado.')});
 apply.addEventListener('click',()=>{
  if(!state.pending?.length)return;
  try{
   if(state.pendingSnapshot!==JSON.stringify(getDocument()))throw Error('O projeto foi editado após a proposta; peça um plano atualizado antes de aplicar.');
   const current=getDocument();const applied=applyApprovedProposals(current,state.pending); // validação atomicamente ANTES do commit
   applyApproved(d=>Object.assign(d,applied.document)); // 1 registro de desfazer
   say('assistant',`${applied.report.length} alteração(ões) aplicada(s). Use Desfazer (Ctrl+Z) se precisar reverter.`);
   resetPreview();state.lastAppliedSnapshot=JSON.stringify(getDocument());undoButton.hidden=false;onApplied?.();
  }catch(e){say('assistant',`Não apliquei as alterações: ${e.message}. Reveja a proposta ou descarte-a.`)}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(state.busy)return;
  const question=input.value.trim();if(!question)return;
  if(!models.value){say('assistant','Para conversar, instale o Ollama e baixe um modelo. Veja os comandos logo abaixo.');return}
  input.value='';resetPreview();say('user',question);setBusy(true);
  const placeholder=say('assistant','Analisando o projeto com o modelo local…');
  try{
   const context=sendContext.checked?summarizeProject(getDocument(),{latestSimulation:getLatestSimulation?.()}):{notice:'Contexto do projeto não autorizado nesta pergunta.'};
   const res=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:models.value,message:question,context,history:state.history.slice(-8)})});
   const payload=await res.json();if(!res.ok)throw Error(payload.error||`Erro ${res.status}`);
   placeholder.querySelector('p').textContent=payload.answer||'O modelo não retornou uma resposta.';
   state.history.push({role:'user',content:question},{role:'assistant',content:payload.answer||''});state.history=state.history.slice(-8);
   let proposed=[];
   try{proposed=normalizeProposals(payload.proposals)}catch(e){say('assistant',`Não exibi o plano porque contém uma ação inválida: ${e.message}`)}
   if(proposed.length){
    state.pending=proposed;state.pendingSnapshot=JSON.stringify(getDocument());previewList.replaceChildren();
    for(const action of proposed){
     const item=document.createElement('li');item.textContent=readableAction(action);previewList.append(item);
     if(action.type==='build_service'){
      const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');
      summary.textContent='Conferir salas, atividades, móveis e circulação';
      for(const room of action.rooms){const child=document.createElement('li');child.textContent=`${room.name}: ${room.activities.map(a=>a.title+' ('+a.duration+' min)').join(', ')||'sem atividades'} · ${room.furniture.length} móveis · ${room.doors.length} portas`;list.append(child)}
      details.append(summary,list);item.append(details);
     }
    }
    preview.hidden=false;preview.scrollIntoView({block:'nearest',behavior:'smooth'});
   }
  }catch(e){placeholder.querySelector('p').textContent=`Falha na consulta: ${e.message}. Verifique se o Ollama está ativo e se o modelo já foi baixado.`}
  finally{setBusy(false);input.focus()}
 });
 return {open,hide,reload,state};
}
