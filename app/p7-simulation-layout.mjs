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
 const report=document.createElement('section');report.id='p7-analysis';report.className='p7-analysis';
 report.innerHTML='<header class="p7-analysis-header"><div><span class="p7-eyebrow">RESULTADOS DO CENÁRIO</span><h1>Analisar desempenho</h1><p>Indicadores estimados, utilização, gargalos e comparações do último cenário calculado.</p></div><div class="p7-analysis-actions"><button type="button" id="p7-go-simulation">Ver simulação</button></div></header><div class="p7-no-result" id="p7-no-result" hidden>Execute um cenário na aba Simular para consultar indicadores e análises.</div>';
 const stage=root.querySelector('.sim-floor-card');
 const playbar=root.querySelector('.sim-playbar');
 if(!stage||!playbar)throw Error('Playback components missing');
 sim.append(stage,playbar);
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
 return {setMode,openSettings:()=>{settings.open=true},report,sim,settings};
}
