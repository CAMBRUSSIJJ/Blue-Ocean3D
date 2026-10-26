/** v0.9 — Modo Simulação: somente leitura, não modifica documentos canônicos. */
import {simulateService,stateAt,simulationCsv,prepareSimulation} from './simulation.mjs';
import {journeySimulationSummary} from './journey-flow.mjs';
import {readLayoutBaseline,professionalReportHTML} from './professional-review.mjs';
import {environmentSnapshot,capacityOpportunities,quickScenario,reviewServiceFlow} from './simulation-insights.mjs';
import {renderSimWorld} from './floorplan-ui.mjs';
import {initSimulation3D,simulationRoomActors,simulationRoomStatus} from './simulation3d.mjs';
import {renderSiteTraffic} from './site-traffic.mjs';
import {createSite3D} from './site3d.mjs';
import {corridorHotspots} from './spatial.mjs';
import {siteRouteReport} from './site-routing.mjs';
import {cellMeters} from './floorplan-navigation.mjs';
import {interactionSummary} from './simulation-poses.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const compact=(v,d=1)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(Number(v)||0);
const clip=(s,n=31)=>String(s??'').length>n?String(s).slice(0,n-1)+'…':String(s??'');
const simPalette=['#269b89','#577da9','#b17b46','#9277ac','#d07a8e','#4c93a6','#8a9e59'];
function download(name,data,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500)}
function durationLabel(t){return `${compact(t)} min`}
function renderEvents(result,time,selected){
 const total=Math.max(1,result.metrics.elapsed),teams=[...new Set(result.events.filter(e=>e.task).map(e=>e.team))];const colors=new Map(teams.map((t,i)=>[t,simPalette[i%simPalette.length]]));
 const rows=result.byCase.map(c=>{
   const events=result.events.filter(e=>e.caseIndex===c.caseIndex&&e.task);
   // Tasks running simultaneously share a case, but must never overlap visually.
   // Each concurrent interval gets a separate sublane (interval partitioning).
   const slotEnds=[];
   const bars=events.map(e=>{
     const x=Math.max(0,e.start/total*100),w=Math.max(.7,e.duration/total*100),active=e.start<=time&&e.end>time,done=e.end<=time,chosen=selected?.nodeId===e.nodeId&&selected?.caseIndex===e.caseIndex;
     let slot=slotEnds.findIndex(end=>end<=e.start);if(slot<0){slot=slotEnds.length;slotEnds.push(-1);}slotEnds[slot]=Math.max(e.end,e.start+.3);
     const barColor=colors.get(e.team),wait=e.wait>0?` · espera ${durationLabel(e.wait)}`:'';
     return `<button type="button" class="sim-bar ${active?'is-running':''} ${done?'is-done':''} ${chosen?'is-selected':''}" data-sim-task="${esc(e.caseIndex)}|${esc(e.nodeId)}" style="left:${x}%;width:${w}%;top:${5+slot*35}px;--sim-bar-color:${barColor}" title="${esc(`${e.title}: ${durationLabel(e.start)}–${durationLabel(e.end)}${wait}`)}" aria-label="Ocorrência ${e.caseIndex}, ${esc(e.title)}, inicia ${durationLabel(e.start)}, dura ${durationLabel(e.duration)}" ${e.duration===0?'data-zero="1"':''}><span>${esc(clip(e.title,22))}</span></button>`;
   }).join('');
   const until=Math.min(100,Math.max(0,(c.end/total)*100));
   const playhead=Math.min(100,Math.max(0,time/total*100));
   return `<div class="sim-lane" role="group" aria-label="Ocorrência ${c.caseIndex}"><div class="sim-lane-label"><b>#${String(c.caseIndex).padStart(2,'0')}</b><small>${durationLabel(c.cycle)}</small></div><div class="sim-lane-track" style="height:${Math.max(43,slotEnds.length*35+9)}px"><span class="sim-lane-end" style="left:${until}%"></span>${bars}<span class="sim-playhead" style="left:${playhead}%"></span></div></div>`;
 }).join('');
 const axis=[0,.25,.5,.75,1].map(x=>`<span style="left:${x*100}%">${durationLabel(total*x)}</span>`).join('');
 return `<div class="sim-timeline-head"><h3>Execução por ocorrência</h3><p>Cada faixa representa um atendimento. As barras mostram atividades; a cor identifica a equipe.</p></div><div class="sim-plot">${rows}</div><div class="sim-axis"><span></span><div>${axis}</div></div><div class="sim-teams-legend">${[...colors].map(([team,color])=>`<span><i style="background:${color}"></i>${esc(team)}</span>`).join('')}</div>`;
}
function resultPanel(r){const m=r.metrics;const cards=[['Duração do cenário',durationLabel(m.elapsed),'Da primeira chegada ao último término'],['Ciclo médio',durationLabel(m.averageCycle),'Chegada até a conclusão'],['Espera média',durationLabel(m.averageWait),'Acumulada por ocorrência'],['Custo estimado',(m.totalCost>0?`R$ ${compact(m.totalCost,2)}`:'—'),(m.totalCost>0?'Valores informados por atividade':'Nenhum custo informado nas atividades')]];return cards.map(([value,title,desc])=>`<div class="sim-stat"><small>${value}</small><strong>${title}</strong><span>${desc}</span></div>`).join('')}
function statusPanel(r,time,selected){const s=stateAt(r,time),ending=r.events.filter(e=>e.task&&e.start>time).sort((a,b)=>a.start-b.start).slice(0,3),curr=s.current.slice(0,6);
 return `<div class="sim-now-head"><span class="sim-live-dot"></span><div><small>NA LINHA DO TEMPO</small><strong>${durationLabel(time)}</strong></div></div><div class="sim-now-numbers"><div><strong>${s.arrivals}</strong><small>Chegaram</small></div><div><strong>${s.current.length}</strong><small>Atividades em execução</small></div><div><strong>${s.waiting.length}</strong><small>Atividades na fila</small></div><div><strong>${s.completedCases}</strong><small>Concluídas</small></div></div><h3>Em execução agora</h3>${curr.length?curr.map(e=>`<button class="sim-activity-row" data-sim-task="${e.caseIndex}|${esc(e.nodeId)}"><b>${esc(e.title)}</b><small>Atendimento ${e.caseIndex} · ${esc(e.team)}</small></button>`).join(''):'<p class="sim-empty-note">Nenhuma atividade em execução neste minuto.</p>'}<h3>Próximas atividades</h3>${ending.length?ending.map(e=>`<div class="sim-next-row"><span>${durationLabel(e.start)}</span><b>${esc(e.title)}</b></div>`).join(''):'<p class="sim-empty-note">Todas as atividades já foram iniciadas.</p>'}`;
}
function teamPanel(result){if(!result.teamStats.length)return '<p class="sim-empty-note">Cadastre atividades com equipe e duração para visualizar ocupação.</p>';
 return result.teamStats.map(t=>`<div class="sim-team-row"><div class="sim-team-title"><b>${esc(clip(t.name,30))}</b><span>${compact(t.utilization*100)}% · ${t.capacity} vaga(s)</span></div><div class="sim-meter"><i style="width:${Math.min(100,Math.max(0,t.utilization*100))}%" class="${t.utilization>.85?'sim-hot':''}"></i></div><small>${t.count} execuções · ${durationLabel(t.busy)} ocupados · ${durationLabel(t.waiting)} de espera acumulada</small></div>`).join('');
}
function floorPanel(doc,result,time){
 const snapshot=environmentSnapshot(doc,result,time);
 const html=snapshot.rooms.map(r=>{
  const occupied=r.active.length,waiting=r.waiting.length;
  const tokens=[...r.active.map(x=>({...x,queued:false})),...r.waiting.map(x=>({...x,queued:true}))];
  return `<article class="sim-floor-room ${occupied?'is-busy':''} ${waiting?'is-queued':''}" style="--floor-accent:${/^#[0-9a-fA-F]{6}$/.test(r.color)?r.color:'#7A9890'}" aria-label="${esc(r.name)}: ${occupied} em atendimento e ${waiting} na fila"><header><span aria-hidden="true">${esc(r.icon||'▣')}</span><div><strong>${esc(r.name)}</strong><small>${occupied||waiting?'Com atendimentos no minuto atual':'Nenhuma fila ou atividade neste minuto'}</small></div></header><div class="sim-floor-metrics"><b>${occupied} em atendimento</b><b class="${waiting?'has-queue':''}">${waiting} na fila</b></div><div class="sim-floor-avatars">${tokens.slice(0,9).map(t=>`<button type="button" class="${t.queued?'is-waiting':''}" data-sim-task="${t.caseIndex}|${esc(t.nodeId)}" title="Atendimento #${t.caseIndex} · ${esc(t.title)} · ${t.queued?'aguardando':'em execução'}" aria-label="Atendimento ${t.caseIndex} ${t.queued?'na fila de':'em'} ${esc(r.name)}">${t.queued?'◷':'●'} ${t.caseIndex}</button>`).join('')||'<span class="sim-floor-empty">Área livre</span>'}${tokens.length>9?`<span class="sim-floor-empty">+${tokens.length-9} adicionais</span>`:''}</div></article>`;
 }).join('');
 return {html:html||'<p class="sim-opportunities-empty">Adicione atividades aos ambientes para visualizar a operação.</p>',summary:`${snapshot.active} em atendimento · ${snapshot.waiting} na fila`};
}
function opportunityPanel(options){
 const top=options.find(o=>o.savedWait>.01 || o.savedCycle>.01);
 if(!top)return '<p class="sim-opportunities-empty">Nenhum reforço individual de equipe reduziu a espera ou o ciclo neste cenário. Experimente alterar as chegadas ou conectar atividades que trabalham em sequência.</p>';
 const delta=top.savedWait>0.01?`−${durationLabel(top.savedWait)} na espera média`:`−${durationLabel(top.savedCycle)} no ciclo médio`;
 return `<div class="sim-opportunities-body"><div><b>Reforçar ${esc(top.team)} de ${top.from} para ${top.to} vaga(s)</b><p>Resultado de uma simulação alternativa, mantendo as demais hipóteses.</p><strong>${delta}</strong></div><button id="sim-apply-reinforcement" type="button" data-team="${esc(top.team)}" data-cap="${top.to}">Aplicar no cenário ↗</button></div>`;
}
function warningPanel(result){return result.warnings.length?result.warnings.map(w=>`<li>${esc(w)}</li>`).join(''):'<li>Não foram encontrados alertas adicionais para estas hipóteses.</li>'}
function comparison(base,live){if(!base)return '<p>Execute o cenário atual e clique em <b>Fixar referência</b> para comparar mudanças nas configurações.</p>';
 const fields=[['Duração total','elapsed','min'],['Ciclo médio','averageCycle','min'],['Espera média','averageWait','min'],['Custo estimado','totalCost','R$']];
 return `<div class="sim-compare-grid"><div class="sim-compare-header"><span>Indicador</span><span>Referência</span><span>Atual</span><span>Diferença</span></div>${fields.map(([name,key,unit])=>{const old=base.metrics[key],curr=live.metrics[key],delta=curr-old,good=delta<0,neutral=Math.abs(delta)<.00001;return `<div class="sim-compare-row"><b>${name}</b><span>${unit==='R$'?'R$ ':''}${compact(old,1)}${unit==='min'?' min':''}</span><span>${unit==='R$'?'R$ ':''}${compact(curr,1)}${unit==='min'?' min':''}</span><span class="${neutral?'':good?'sim-good':'sim-bad'}">${delta>0?'+':''}${compact(delta,1)}${unit==='min'?' min':''}</span></div>`}).join('')}</div><p class="sim-footnote">Comparação determinística de hipóteses, não previsão de desempenho real. O modelo de atividades permanece o mesmo.</p>`;
}
/** O diagnóstico é derivado dos mesmos eventos do motor, sem inferir causalidade externa. */
export function serviceDiagnosis(result){
 const byWait=[...result.teamStats].filter(t=>t.waiting>0).sort((a,b)=>b.waiting-a.waiting);
 const totalWait=result.events.filter(e=>e.task).reduce((s,e)=>s+e.wait,0);
 const top=byWait[0];
 if(!top)return {severity:'good',text:'Neste cenário, nenhuma equipe acumulou espera por capacidade. Confira ainda os tempos e as dependências.'};
 const share=totalWait>0?Math.round(top.waiting/totalWait*100):0;
 return {severity:'warning',team:top.name,waiting:top.waiting,share,
 text:`A equipe ${top.name} concentra ${share}% da espera acumulada por atividades (${compact(top.waiting)} min). Teste reforçar sua capacidade para verificar o impacto.`};
}
export function initSimulator({getDocument,onBack,onEdit}){
 const root=$('#simulation-view'),ui={active:false,result:null,reference:null,time:0,playing:false,selected:null,speed:2,opportunities:[],sceneMode:'3d',sceneRoom:null,journeyCase:1},q=s=>root.querySelector(s);
 let journeySignature='';
 let timer=null,appliedMode=null,scaleTouched=false;
 const sim3d=initSimulation3D({container:q('#sim16-webgl'),onSelect:entry=>selectTask(entry.caseIndex,entry.nodeId),onUnavailable:msg=>{
  ui.sceneMode='2d';q('#sim16-alert').textContent=msg;q('#sim16-alert').hidden=false;renderFloor();
 }});
 const sceneEsc=s=>esc(s);
 function selectTask(caseIndex,nodeId){ui.selected={caseIndex:Number(caseIndex),nodeId};renderTimeline();renderStatus();renderSelection();renderSimJourney();if(ui.sceneMode==='2d')q('.sim16-analytics').open=true;announce('Atividade selecionada: confira o painel lateral.')}
 function renderSelection(){const box=q('#sim16-selection');if(!box)return;
  const event=ui.selected&&ui.result?.events.find(e=>e.caseIndex===ui.selected.caseIndex&&e.nodeId===ui.selected.nodeId);
  box.innerHTML=event?`<h4>Atividade selecionada</h4><strong>${esc(event.title)}</strong><small>Cliente #${event.caseIndex} · ${esc(event.team)}</small><p>Início: ${durationLabel(event.start)} · duração: ${durationLabel(event.duration)} · espera: ${durationLabel(event.wait)}</p><button type="button" id="sim16-open-detail">▤ Detalhes na linha do tempo ↓</button>`:'';
 }
 function sceneRooms(){
  const rooms=getDocument().environments||[];
  if(!rooms.some(r=>r.id===ui.sceneRoom))ui.sceneRoom=rooms[0]?.id||null;
  return rooms;
 }
 function sceneTabs(rooms){
  const wrap=q('#sim16-rooms');if(!wrap)return;
  const actors=ui.result?sceneRooms().map(r=>[r.id,simulationRoomStatus(simulationRoomActors(getDocument(),ui.result,ui.time,r.id))]):[];
  const byRoom=new Map(actors);
  wrap.innerHTML=rooms.map(room=>{const s=byRoom.get(room.id)||{clients:0,waiting:0,staff:0};return `<button type="button" data-sim16-room="${sceneEsc(room.id)}" class="${ui.sceneRoom===room.id?'active':''}" aria-pressed="${ui.sceneRoom===room.id}">${sceneEsc(room.name)} <small>${s.clients} cliente(s)${s.waiting?' · '+s.waiting+' na fila':''}</small></button>`}).join('');
 }
 function renderScene(){if(!ui.result||!ui.active)return;
  const rooms=sceneRooms(),room=rooms.find(r=>r.id===ui.sceneRoom);
  const actors=simulationRoomActors(getDocument(),ui.result,ui.time,ui.sceneRoom),status={...simulationRoomStatus(actors),...interactionSummary(actors)};
  q('#sim16-room-label').textContent=room?.name||'Nenhum ambiente';
  q('#sim16-room-count').textContent=`${status.clients} cliente(s) · ${status.staff} profissional(is)`;
  q('#sim16-counts').innerHTML=`<span><b>${status.serving}</b><small>Em atendimento</small></span><span><b>${status.waiting}</b><small>Na fila</small></span><span><b>${status.staff}</b><small>Profissionais</small></span><span><b>${status.seated}</b><small>Sentados (visual)</small></span><span><b>${status.working}</b><small>Em postos (visual)</small></span>`;
  q('#sim23-occupancy').textContent=`${status.seated} pessoa(s) usando assentos · ${status.queued} pessoa(s) aguardando sem assento · ${status.working} profissional(is) em interação visual`;
  renderSelection();
  q('#sim16-actors').innerHTML=actors.length?actors.map(p=>`<button type="button" data-sim16-actor="${p.caseIndex}|${sceneEsc(p.nodeId)}" class="${p.kind==='staff'?'is-staff':''} ${p.status==='Na fila'?'is-waiting':''}" title="${sceneEsc(p.status)}"><span>${p.kind==='staff'?'✦':'#'+p.caseIndex}</span><span><b>${p.kind==='staff'?'Profissional':'Cliente #'+p.caseIndex}</b><small>${sceneEsc(p.status)} · ${sceneEsc(({seated:'Sentado',queued:'Em pé na fila',working:'Interagindo com posto',walking:'Em caminhada',reclining:'Na maca','being-served':'Em atendimento'})[p.pose]||'Em pé')}</small></span></button>`).join(''):'<p class="sim16-empty">Nenhuma pessoa neste ambiente neste minuto. Avance o relógio ou selecione outra sala.</p>';
  if(status.blocked)q('#sim16-alert').textContent=`⚠ ${status.blocked} personagem(ns) sem trajeto transitável neste ambiente. Verifique paredes e portas.`;
  if(status.blocked)q('#sim16-alert').hidden=false;
  else if(!sim3d.unavailable)q('#sim16-alert').hidden=true;
  sceneTabs(rooms);
  sim3d.update(getDocument(),ui.result,ui.time,ui.sceneRoom,{playing:ui.playing});
 }
 function updateMode(){const enabled=ui.sceneMode==='3d',site=['site','site3d'].includes(ui.sceneMode);q('#sim16-scene').hidden=!enabled;q('#sim21-site').hidden=!site;q('#sim-floor').hidden=enabled||site;
  q('#sim16-mode-3d').classList.toggle('active',enabled);q('#sim16-mode-2d').classList.toggle('active',!enabled&&!site);q('#sim21-mode-site').classList.toggle('active',ui.sceneMode==='site');q('#sim22-mode-site-3d').classList.toggle('active',ui.sceneMode==='site3d');
  q('#sim16-mode-3d').setAttribute('aria-pressed',String(enabled));q('#sim16-mode-2d').setAttribute('aria-pressed',String(!enabled&&!site));q('#sim21-mode-site').setAttribute('aria-pressed',String(ui.sceneMode==='site'));q('#sim22-mode-site-3d').setAttribute('aria-pressed',String(ui.sceneMode==='site3d'));
  if(appliedMode!==ui.sceneMode){if(enabled)sim3d.show();else sim3d.hide();if(ui.sceneMode!=='site3d')site3d.hide();appliedMode=ui.sceneMode;}
 }
 
 function announce(text){q('#sim-live').textContent=text}
 function renderSimJourney(){
  if(!ui.result)return;
  const panel=q('#sim-journey'),container=q('#sim-journey-steps'),insights=q('#sim-journey-insights');
  const report=journeySimulationSummary(getDocument(),ui.result,ui.time,ui.journeyCase);
  panel.hidden=false;
  const signature=ui.result.createdAt+'|'+ui.journeyCase+'|'+report.steps.map(t=>t.id).join(',');
  if(signature!==journeySignature){
   journeySignature=signature;
   container.innerHTML=report.steps.map((task,index)=>`<button type="button" class="sim-journey-step" data-sim-journey-step="${esc(task.id)}" data-journey-status="upcoming" title="${esc(task.title)} · ir para a atividade no ambiente">
    <span class="sim-journey-order">${index+1}</span><strong>${esc(clip(task.title,45))}</strong>
    <small class="sim-journey-room">${esc(task.roomName)}</small>
    <small class="sim-journey-time">${['activity','decision'].includes(task.type)?(task.duration>0?`${compact(task.duration)} min previstos`:'Marco sem duração'):'Componente informativo'}</small>
    <small class="sim-journey-state">Aguardando</small>
   </button>`).join('')||'<p>Nenhuma atividade cadastrada para esta jornada.</p>';
  }
  const rowMap=new Map(report.rows.map(row=>[row.id,row]));
  const labels={complete:'Concluída',running:'Executando',waiting:'Na fila',upcoming:'Ainda não iniciada','not-executed':'Sem evento'};
  for(const button of container.querySelectorAll('[data-sim-journey-step]')){
   const row=rowMap.get(button.dataset.simJourneyStep);
   if(!row)continue;
   button.dataset.journeyStatus=row.status;
   button.classList.toggle('is-selected',ui.selected?.nodeId===row.id&&ui.selected?.caseIndex===ui.journeyCase);
   button.setAttribute('aria-pressed',String(ui.selected?.nodeId===row.id&&ui.selected?.caseIndex===ui.journeyCase));
   const text=labels[row.status]||'Aguardando';
   button.querySelector('.sim-journey-state').textContent=row.wait>0?`${text} · espera ${compact(row.wait)} min`:text;
   button.setAttribute('aria-label',`${row.title}, ${row.roomName}, ${text}, ${row.duration} minutos previstos`);
  }
  const spatial=ui.result.settings.spatialEnabled;
  q('#sim-journey-context').textContent=`Atendimento #${ui.journeyCase} · ${report.precedenceCount} ligações operacionais · ${report.isolatedCount} atividades sem sequência${spatial?' · caminhada estimada incluída':' · deslocamento apenas ilustrativo'}`;
  if(report.peakWait.length){
   insights.innerHTML='<strong>Maiores esperas acumuladas no cenário</strong>'+
    report.peakWait.map(row=>`<button type="button" data-sim-bottleneck="${esc(row.id)}" title="Inspecionar gargalo na ocorrência selecionada">${esc(clip(row.title,35))} · ${compact(row.totalWait)} min no total</button>`).join('');
  }else insights.innerHTML='<span>Nenhuma espera por capacidade foi calculada neste cenário.</span>';
  panel.dataset.modelState=report.cyclic?'cyclic':'valid';
 }
 function focusJourneyTask(nodeId){
  if(!ui.result)return;
  const event=ui.result.events.find(e=>e.nodeId===nodeId&&e.caseIndex===ui.journeyCase);
  if(!event){announce('Esta atividade não possui evento calculado para a ocorrência.');return}
  stop();
  if(getDocument().environments?.some(r=>r.id===event.environmentId))ui.sceneRoom=event.environmentId;
  if(ui.sceneRoom&&ui.sceneMode!=='3d'&&ui.sceneMode!=='2d')ui.sceneMode='3d';
  setTime(event.start);
  selectTask(event.caseIndex,event.nodeId);
  q('#sim16-scene')?.scrollIntoView({behavior:'auto',block:'nearest'});
 }
 function stop(){ui.playing=false;clearInterval(timer);timer=null;q('#sim-play').textContent='▶ Reproduzir';q('#sim-play').setAttribute('aria-pressed','false');if(ui.active&&ui.result&&ui.sceneMode==='3d')renderScene()}
 function setTime(time){ui.time=Math.max(0,Math.min(ui.result?.metrics.elapsed||0,time));q('#sim-time').textContent=durationLabel(ui.time);q('#sim-progress').value=String(ui.time);q('#sim-progress').max=String(Math.max(1,ui.result?.metrics.elapsed||1));q('#sim-progress-label').textContent=`${durationLabel(ui.time)} / ${durationLabel(ui.result?.metrics.elapsed||0)}`;renderTimeline();renderStatus();renderFloor();renderSimJourney()}
 function preflight(){
   const checks=reviewServiceFlow(getDocument());
   const parallel=checks.requiresParallelConfirmation;
   const acknowledged=Boolean(q('#sim-allow-parallel')?.checked);
   q('#sim-preflight').innerHTML=`<div class="sim-preflight-heading"><div><b>${checks.warnings.length?'⚑ Conferência antes de simular':'✓ Fluxo de atividades conectado'}</b><span>${checks.tasks} atividades · ${checks.precedenceCount} conexões de execução${checks.warnings.length?' · '+checks.warnings.length+' observação(ões)':''}</span></div><button type="button" id="sim-open-rooms-review">Revisar ambientes ↗</button></div>${checks.warnings.length?`<ul>${checks.warnings.map(w=>`<li>${simEsc(w.text)}</li>`).join('')}</ul>`:''}${parallel?`<label class="sim-parallel-accept"><input type="checkbox" id="sim-allow-parallel" ${acknowledged?'checked':''}><span>Confirmo que os grupos sem ligação podem executar em paralelo neste cenário.</span></label>`:''}`;
   q('#sim-run').disabled=parallel&&!acknowledged;
   if(parallel&&!acknowledged)q('#sim-preflight').classList.add('requires-review');
   else q('#sim-preflight').classList.remove('requires-review');
   return {checks,ready:!parallel||acknowledged};
 }
 const site3d=createSite3D(q('#sim22-map-3d'),{onUnavailable(message){ui.sceneMode='site';announce(message);renderFloor();}});
 function spatialSummary(doc,r){const m=r.metrics,s=r.settings;
  if(!s.spatialEnabled)return '<b>Modo operacional</b> · A caminhada não altera os horários. Ative o modo espacial para comparar.';
  const ordinary=simulateService(doc,{...s,spatialEnabled:false});const delta=m.averageCycle-ordinary.metrics.averageCycle;
  const congest=corridorHotspots(r);
  return `<b>Modo espacial ativo</b> · Caminhada média: <strong>${durationLabel(m.averageWalkingMinutes)}</strong> por cliente · Percurso total: <strong>${compact(m.totalWalkingMeters)} m</strong> · Variação do ciclo médio: <strong>+${durationLabel(delta)}</strong> em relação ao modo sem caminhada · Pico ilustrativo: <strong>${congest.peak}</strong> pessoa(s) na mesma célula do corredor. <small>Sem modelagem de congestionamento ou variabilidade. A espera por equipe permanece calculada separadamente do deslocamento.</small>`;
 }
 function renderFloor(){if(!ui.result)return;updateMode();if(['site','site3d'].includes(ui.sceneMode)){const info=renderSiteTraffic(getDocument(),ui.result,ui.time);
  q('#sim21-map').innerHTML=info.html;q('#sim21-map').hidden=ui.sceneMode==='site3d';
  q('#sim22-map-3d').hidden=ui.sceneMode!=='site3d';
  q('#sim21-route-status').textContent=`${info.interactions.seated} sentado(s) · ${info.interactions.working} em postos · ${info.travellers.length} pessoa(s) em caminhada${ui.result.settings.spatialEnabled?' calculada':' ilustrativa'} · ${info.report.linked}/${info.report.links.length} rotas transitáveis · pico ${info.congestion.peak} pessoa(s)/célula`;
  q('#sim-floor-total').textContent=`${info.actors.filter(a=>a.kind==='client').length} cliente(s) visíveis no espaço total`;
  if(ui.sceneMode==='site3d'){if(site3d.unavailable){ui.sceneMode='site';renderFloor();return;}site3d.show(getDocument(),info.actors);}
  return;}if(ui.sceneMode==='3d'){renderScene();const s=simulationRoomStatus(simulationRoomActors(getDocument(),ui.result,ui.time,ui.sceneRoom));q('#sim-floor-total').textContent=`${s.clients} cliente(s) · ${s.waiting} na fila · ${s.staff} profissional(is)`;return}const shown=renderSimWorld(q('#sim-floor'),getDocument(),ui.result,ui.time);q('#sim-floor-total').textContent=`${shown.clients||0} cliente(s) visíveis · ${shown.waiting||0} na fila · ${shown.staff||0} profissional(is)`}
 function renderTimeline(){if(!ui.result)return;q('#sim-timeline').innerHTML=renderEvents(ui.result,ui.time,ui.selected)}
 function renderStatus(){if(!ui.result)return;q('#sim-now').innerHTML=statusPanel(ui.result,ui.time,ui.selected);if(ui.selected){const e=ui.result.events.find(e=>e.caseIndex===ui.selected.caseIndex&&e.nodeId===ui.selected.nodeId);q('#sim-selected').innerHTML=e?`<div class="sim-selected-head"><b>${esc(e.title)}</b><span>Atendimento #${e.caseIndex}</span></div><p><b>Equipe:</b> ${esc(e.team)}<br><b>Executa:</b> ${durationLabel(e.duration)}<br><b>Espera:</b> ${durationLabel(e.wait)}<br><b>Início / fim:</b> ${durationLabel(e.start)} – ${durationLabel(e.end)}</p><button class="button small muted" id="sim-edit-selected">Editar em Ambientes ↗</button>`:'';q('#sim-edit-selected')?.addEventListener('click',()=>onEdit(e.nodeId));}else q('#sim-selected').innerHTML='<p class="sim-empty-note">Clique em um personagem ou em uma barra para inspecionar uma atividade.</p>'}
 function syncSpatialScale(){
  const rooms=getDocument().environments||[],scales=[...new Set(rooms.map(r=>cellMeters(getDocument(),r.id)))];
  if(!scaleTouched&&scales.length)q('#sim22-cell-meters').value=String(scales[0]);
  q('#sim-spatial-scale-note').textContent=scales.length>1?'Atenção: os ambientes usam escalas diferentes ('+scales.join(', ')+' m/célula). Escolha e valide uma escala global para esta hipótese.':'Escala padrão dos ambientes: '+(scales[0]||.75)+' m/célula.';
 }
 function spatialHelp(force=false){const enabled=q('#sim22-enable-walking').checked,report=siteRouteReport(getDocument());
  const missing=report.links.filter(l=>!l.connected).length,show=enabled&&(missing>0||force);
  q('#sim-spatial-help').hidden=!show;
  q('#sim-spatial-detail').textContent=missing?missing+' de '+report.links.length+' transições entre ambientes não têm um caminho físico completo. Vá à visão geral, alinhe portas e conecte os corredores.': 'Confira a escala, as portas e os caminhos antes de calcular novamente.';
  return missing;
 }
 function config(){return {spatialEnabled:q('#sim22-enable-walking').checked,metersPerCell:Number(q('#sim22-cell-meters').value),walkingSpeed:Number(q('#sim22-walk-speed').value),cases:Number(q('#sim-cases').value),arrivalInterval:Number(q('#sim-interval').value),teamCapacity:Number(q('#sim-capacity').value),teamCapacities:Object.fromEntries([...root.querySelectorAll('[data-sim-team-cap]')].map(e=>[e.dataset.simTeamCap,Number(e.value)]))}}
 function capacities(){let data=getDocument();const teams=[...new Set(data.nodes.filter(n=>['activity','decision'].includes(n.type)&&n.team?.trim()).map(n=>n.team.trim()))].sort((a,b)=>a.localeCompare(b,'pt-BR'));q('#sim-team-controls').innerHTML=teams.length?teams.map(team=>`<label><span>${esc(team)}</span><input type="number" min="1" max="8" step="1" value="${q('#sim-capacity').value}" data-sim-team-cap="${esc(team)}" aria-label="Capacidade da equipe ${esc(team)}"></label>`).join(''):'<p>Sem equipes atribuídas.</p>'}
 function execute(){stop();spatialHelp();if(!preflight().ready){q('#sim-error').textContent='Confirme o paralelismo das atividades desconectadas ou revise o fluxo em Ambientes de Serviço.';q('#sim-error').hidden=false;announce(q('#sim-error').textContent);return;}try{let doc=getDocument();let r=simulateService(doc,config());ui.result=r;ui.selected=null;ui.time=0;ui.journeyCase=1;journeySignature='';
  q('#sim-journey-case').innerHTML=Array.from({length:r.settings.cases},(_,i)=>`<option value="${i+1}">#${i+1}</option>`).join('');
  root.classList.add('sim-has-result');q('#sim-stats').innerHTML=resultPanel(r);q('#sim22-spatial-summary').innerHTML=spatialSummary(doc,r);const diagnosis=serviceDiagnosis(r);q('#sim-diagnosis').className='sim-diagnosis '+diagnosis.severity;q('#sim-diagnosis').textContent=diagnosis.text;q('#sim-team-load').innerHTML=teamPanel(r);ui.opportunities=capacityOpportunities(doc,r);q('#sim-opportunities').innerHTML=opportunityPanel(ui.opportunities);q('#sim-warnings').innerHTML=warningPanel(r);q('#sim-comparison').innerHTML=comparison(ui.reference,r);q('#sim-cases-tag').textContent=`${r.settings.cases} ocorrência(s)`;q('#sim-reference').disabled=false;q('#p4-export-report').disabled=false;q('#sim-csv').disabled=false;q('#sim-json').disabled=false;setTime(0);announce('Simulação concluída. Resultados calculados com dados hipotéticos do projeto.');}catch(err){root.classList.remove('sim-has-result');ui.result=null;q('#p4-export-report').disabled=true;q('#sim-error').textContent=err.message;q('#sim-error').hidden=false;spatialHelp(true);announce('Não foi possível simular: '+err.message);return}q('#sim-error').hidden=true;spatialHelp()}
 function play(){if(!ui.result)return;if(ui.playing){stop();return}if(ui.time>=ui.result.metrics.elapsed)setTime(0);ui.playing=true;q('#sim-play').textContent='Ⅱ Pausar';q('#sim-play').setAttribute('aria-pressed','true');timer=setInterval(()=>{if(ui.time>=ui.result.metrics.elapsed){stop();return}setTime(ui.time+Math.max(.25,ui.speed*.25))},260)}
 root.addEventListener('click',e=>{
  const journey=e.target.closest('[data-sim-journey-step],[data-sim-bottleneck]');
  if(journey){focusJourneyTask(journey.dataset.simJourneyStep||journey.dataset.simBottleneck);return}
  let task=e.target.closest('[data-sim-task]');if(!task)return;
  let [caseIndex,nodeId]=task.dataset.simTask.split('|');selectTask(caseIndex,nodeId);
 });
 q('#sim-journey-case').addEventListener('change',e=>{
  const next=Number(e.target.value);
  if(!Number.isInteger(next)||next<1||next>(ui.result?.settings.cases||0))return;
  stop();ui.journeyCase=next;ui.selected=null;journeySignature='';renderSimJourney();renderStatus();renderSelection();
 });
 q('#sim16-rooms').addEventListener('click',e=>{const b=e.target.closest('[data-sim16-room]');if(!b)return;ui.sceneRoom=b.dataset.sim16Room;renderFloor();announce('Acompanhando o ambiente selecionado.')});
 q('#sim16-actors').addEventListener('click',e=>{const b=e.target.closest('[data-sim16-actor]');if(!b)return;const [n,id]=b.dataset.sim16Actor.split('|');selectTask(n,id)});
 q('#sim16-selection').addEventListener('click',e=>{if(!e.target.closest('#sim16-open-detail'))return;q('.sim16-analytics').open=true;q('#sim-selected').scrollIntoView({behavior:'smooth',block:'center'})});
 q('#sim16-mode-3d').addEventListener('click',()=>{ui.sceneMode='3d';if(sim3d.unavailable){ui.sceneMode='2d';q('#sim16-alert').hidden=false;}renderFloor()});
 q('#sim16-mode-2d').addEventListener('click',()=>{ui.sceneMode='2d';renderFloor()});
 q('#sim21-mode-site').addEventListener('click',()=>{ui.sceneMode='site';renderFloor();announce('Visualização de circulação entre todos os ambientes.');});
 q('#sim22-mode-site-3d').addEventListener('click',()=>{ui.sceneMode='site3d';renderFloor();announce('Visão geral 3D dos ambientes e corredores.');});
 q('#sim21-map').addEventListener('click',e=>{const el=e.target.closest('[data-sim21-person]');if(el?.dataset.sim21Node)selectTask(el.dataset.sim21Case,el.dataset.sim21Node)});
 q('#sim16-scene').addEventListener('click',e=>{const b=e.target.closest('[data-sim16-camera]');if(b)sim3d.control(b.dataset.sim16Camera)});
 q('#sim-preflight').addEventListener('change',e=>{if(e.target.id==='sim-allow-parallel'){preflight();q('#sim-error').hidden=true;}});
 q('#sim-preflight').addEventListener('click',e=>{if(e.target.id==='sim-open-rooms-review'){onBack();document.querySelector('#room-readiness')?.scrollIntoView({behavior:'smooth',block:'start'});document.querySelector('.room-check-details')?.setAttribute('open','');}});
 q('#sim22-cell-meters').addEventListener('input',()=>{scaleTouched=true});q('#sim22-enable-walking').addEventListener('change',()=>{syncSpatialScale();spatialHelp()});q('#sim-open-corridors').addEventListener('click',()=>{onBack();document.querySelector('[data-room-display="overview"]')?.click()});q('#sim-ignore-walking').addEventListener('click',()=>{q('#sim22-enable-walking').checked=false;spatialHelp();execute()});
 q('#sim-run').addEventListener('click',execute);q('#sim-play').addEventListener('click',play);q('#sim-reset').addEventListener('click',()=>{stop();setTime(0)});q('#sim-forward').addEventListener('click',()=>{stop();setTime(ui.time+5)});
 q('#sim-progress').addEventListener('input',e=>{stop();setTime(Number(e.target.value))});q('#sim-speed').addEventListener('change',e=>ui.speed=Number(e.target.value));
 q('#sim-capacity').addEventListener('change',()=>{for(const el of root.querySelectorAll('[data-sim-team-cap]'))el.value=q('#sim-capacity').value});
 root.querySelector('.sim-presets').addEventListener('click',e=>{const b=e.target.closest('[data-sim-preset]');if(!b)return;try{const s=quickScenario(config(),b.dataset.simPreset);q('#sim-cases').value=s.cases;q('#sim-interval').value=s.arrivalInterval;q('#sim-capacity').value=s.teamCapacity;for(const el of root.querySelectorAll('[data-sim-team-cap]'))el.value=String(s.teamCapacities[el.dataset.simTeamCap]??s.teamCapacity);execute();announce('Cenário rápido aplicado e recalculado.')}catch(error){announce(error.message)}});
 q('#sim-opportunities').addEventListener('click',e=>{const b=e.target.closest('[data-team][data-cap]');if(!b)return;const cap=root.querySelectorAll('[data-sim-team-cap]');const input=[...cap].find(x=>x.dataset.simTeamCap===b.dataset.team);if(!input)return;input.value=b.dataset.cap;execute();announce('Reforço simulado para '+b.dataset.team+'. Compare com a referência se desejar.')});
 q('#sim-reference').addEventListener('click',()=>{if(!ui.result)return;ui.reference=ui.result;q('#sim-reference-label').textContent='Referência fixa · '+ui.reference.settings.cases+' ocorrências';q('#sim-comparison').innerHTML=comparison(ui.reference,ui.result);announce('Referência fixada. Modifique capacidade ou chegadas e execute novamente.')});
 q('#p4-export-report').addEventListener('click',()=>{
  if(!ui.result)return;
  try{
   const doc=getDocument();let layoutBaseline=null;
   try{layoutBaseline=readLayoutBaseline(doc)}catch{/* Browser storage unavailable */}
   const html=professionalReportHTML({doc,result:ui.result,reference:ui.reference,layoutBaseline});
   download('blue-ocean-relatorio-servico.html',html,'text/html;charset=utf-8');
   announce('Relatório profissional exportado. Abra o HTML para imprimir ou salvar em PDF.');
  }catch(err){announce('Não foi possível criar o relatório: '+err.message)}
 });
 q('#sim-csv').addEventListener('click',()=>ui.result&&download('service-builder-simulacao.csv',simulationCsv(ui.result),'text/csv;charset=utf-8'));
 q('#sim-json').addEventListener('click',()=>ui.result&&download('service-builder-simulacao.json',JSON.stringify(ui.result,null,2),'application/json'));
 q('#sim-back').addEventListener('click',onBack);
 function show(){ui.active=true;root.hidden=false;root.scrollTop=0;syncSpatialScale();spatialHelp();capacities();preflight();if(ui.result&&ui.result.modelUpdatedAt!==getDocument().updatedAt){ui.result=null;ui.reference=null;journeySignature='';q('#sim-journey').hidden=true;q('#p4-export-report').disabled=true;root.classList.remove('sim-has-result');q('#sim-reference-label').textContent='Nenhuma referência fixada';}if(!ui.result)execute();else setTime(ui.time);}
 function hide(){stop();ui.active=false;site3d.hide();sim3d.hide();appliedMode=null;root.hidden=true;}
 return {state:ui,show,hide,refresh(){if(ui.active&&ui.result?.modelUpdatedAt!==getDocument().updatedAt){stop();ui.result=null;ui.reference=null;journeySignature='';q('#sim-journey').hidden=true;q('#p4-export-report').disabled=true;root.classList.remove('sim-has-result');q('#sim-error').hidden=false;q('#sim-error').textContent='O serviço mudou; execute novamente para atualizar as estimativas.';capacities();preflight()}}};
}
