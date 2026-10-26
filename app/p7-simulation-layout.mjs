/**
 * P7 — single simulation controller, two independent views.
 * Reparents existing nodes; never duplicates metrics or recomputes events.
 */
export function installP7SimulationLayout(root){
 const original=root.querySelector('.sim-results');
 const config=root.querySelector('.sim-scene');
 const hero=root.querySelector('.sim-hero');
 if(!original||!config||!hero)throw Error('Simulation surface unavailable');
 const header=document.createElement('header');
 header.className='p7-sim-header';
 header.innerHTML='<div><span class="p7-eyebrow">LABORATÓRIO DE SERVIÇO</span><h1>Simular serviço</h1><p>Clientes, equipes, filas e deslocamentos em movimento.</p></div><div class="p7-sim-actions"><button type="button" id="p7-configure" aria-expanded="false" aria-controls="p7-settings">Configurar cenário</button><button type="button" id="p7-start">▶ Iniciar simulação</button></div>';
 const settings=document.createElement('details');settings.id='p7-settings';settings.className='p7-settings';
 const summary=document.createElement('summary');summary.textContent='Configurações do cenário';settings.append(summary,config);
 settings.addEventListener('toggle',()=>header.querySelector('#p7-configure').setAttribute('aria-expanded',String(settings.open)));
 header.querySelector('#p7-configure').addEventListener('click',()=>{settings.open=!settings.open});
 header.querySelector('#p7-start').addEventListener('click',()=>root.querySelector('#sim-run').click());
 const sim=document.createElement('section');sim.className='p7-sim-runtime';sim.id='p7-runtime';
 const compact=document.createElement('div');compact.className='p7-playback-hint';
 compact.textContent='Pessoas e percursos calculados a partir das atividades. Use a linha do tempo para reproduzir.';

 const report=document.createElement('section');report.id='p7-analysis';report.className='p7-analysis';
 report.innerHTML='<header class="p7-analysis-header"><div><span class="p7-eyebrow">RESULTADOS DO CENÁRIO</span><h1>Analisar desempenho</h1><p>Indicadores estimados, utilização, gargalos e comparações do último cenário calculado.</p></div><div class="p7-analysis-actions"><button type="button" id="p7-go-simulation">Ver simulação</button></div></header><div class="p7-no-result" id="p7-no-result" hidden>Execute um cenário na aba Simular para consultar indicadores e análises.</div>';
 const exportTools=hero.querySelector('.sim-export');
 if(exportTools)report.querySelector('.p7-analysis-actions').append(exportTools);
 const backButton=hero.querySelector('#sim-back');if(backButton){backButton.hidden=true;header.append(backButton)}
 const charts=document.createElement('section');charts.id='p7-analysis-charts';charts.className='p7-analysis-charts';charts.setAttribute('aria-label','Comparação das esperas entre atividades');report.append(charts);
 const stage=root.querySelector('.sim-floor-card');
 const playbar=root.querySelector('.sim-playbar');
 if(!stage||!playbar)throw Error('Playback components missing');
 sim.append(compact,stage,playbar);
 for(const selector of ['#sim-stats','#sim22-spatial-summary','#sim-diagnosis','#sim-journey','.sim16-analytics','.sim-opportunities','.sim-lower','.sim-comparison']){
  const node=original.querySelector(selector);
  if(node)report.appendChild(node);
 }
 original.prepend(sim,report);
 hero.replaceWith(header);
 root.querySelector('#sim-preflight')?.before(settings);
 root.querySelector('#p7-go-simulation').addEventListener('click',()=>document.querySelector('#hybrid-simulate')?.click());
 const legend=document.createElement('div');legend.className='p7-scene-legend';
 legend.innerHTML='<span><i class="p7-person-dot p7-client"></i> Clientes simulados</span><span><i class="p7-person-dot p7-staff"></i> Profissionais</span><span><i class="p7-person-dot p7-wait"></i> Fila</span><span>Os deslocamentos são ilustrativos, salvo modo espacial.</span>';
 sim.insertBefore(legend,playbar);
 function renderCharts(result){
  if(!result?.events){charts.innerHTML='<p>Execute um cenário para ver os tempos por atividade.</p>';return}
  const entries=new Map();
  for(const event of result.events){
   if(!event.task)continue;
   const id=event.nodeId;
   const row=entries.get(id)||{name:event.title||'Atividade',total:0,count:0};
   row.total+=Math.max(0,Number(event.wait)||0);row.count+=1;entries.set(id,row);
  }
  const values=[...entries.values()].map(x=>({...x,average:x.total/x.count}))
   .sort((a,b)=>b.average-a.average).slice(0,10);
  const max=Math.max(1,...values.map(x=>x.average));
  const escape=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  charts.innerHTML='<div class="p7-chart-header"><h2>Espera por atividade</h2><p>Tempo médio estimado nas ocorrências deste cenário, em minutos.</p></div>'+
   (values.length?values.map(x=>'<div class="p7-chart-row"><span>'+escape(x.name)+'</span><div class="p7-chart-track"><i style="width:'+
   (x.average/max*100).toFixed(2)+'%"></i></div><strong>'+x.average.toLocaleString('pt-BR',{maximumFractionDigits:1})+' min</strong></div>').join(''):
   '<p>Nenhuma atividade com duração está disponível.</p>');
 }
 function setMode(mode){
  const analyzing=mode==='analyze';
  root.dataset.p7Mode=analyzing?'analyze':'simulate';
  report.hidden=!analyzing;sim.hidden=analyzing;header.hidden=analyzing;
  settings.hidden=analyzing;
  const has=root.classList.contains('sim-has-result');
  report.querySelector('#p7-no-result').hidden=has;
  if(analyzing&&has)report.querySelector('.p7-analysis-header')?.scrollIntoView({block:'start'});
  return analyzing;
 }
 setMode('simulate');
 return {setMode,renderCharts,openSettings:()=>{settings.open=true},report,sim,settings};
}
