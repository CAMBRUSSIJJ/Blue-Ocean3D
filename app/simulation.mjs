/** v0.5 — Motor determinístico de execução de serviços.
 * Um serviço/modelo é imutável durante a simulação; cada ocorrência percorre
 * somente conexões sequence/dependency/handoff. Recursos são informativos.
 * Tempos, capacidades e custos são hipóteses cadastradas, nunca medições reais.
 */
import {validateDocument} from './core.mjs';
import {validateSpatialSettings,planSpatialTransfers} from './spatial.mjs';
export const SIM_VERSION=1;
export const SIM_LIMITS={cases:30,interval:240,capacity:8,events:2400};
const isTask=n=>n.type==='activity'||n.type==='decision';
const num=(v,fallback)=>v===''||v==null?fallback:Number(v);
export function normalizeScenario(input={}){
  const cases=num(input.cases,6),arrivalInterval=num(input.arrivalInterval,8),teamCapacity=num(input.teamCapacity,1);
  if(!Number.isInteger(cases)||cases<1||cases>SIM_LIMITS.cases)throw Error('Ocorrências devem estar entre 1 e 30.');
  if(!Number.isFinite(arrivalInterval)||arrivalInterval<0||arrivalInterval>SIM_LIMITS.interval)throw Error('Intervalo entre chegadas deve estar entre 0 e 240 minutos.');
  if(!Number.isInteger(teamCapacity)||teamCapacity<1||teamCapacity>SIM_LIMITS.capacity)throw Error('Capacidade por equipe deve estar entre 1 e 8.');
  const teamCapacities={};
  for(const [team,value] of Object.entries(input.teamCapacities||{})){
    if(!team||team.length>80)throw Error('Nome de equipe inválido.');
    const v=Number(value);if(!Number.isInteger(v)||v<1||v>SIM_LIMITS.capacity)throw Error('Capacidade de equipe inválida.');
    teamCapacities[team]=v;
  }
  return {cases,arrivalInterval,teamCapacity,teamCapacities,...(input.spatialEnabled?validateSpatialSettings(input):{})};
}
export function prepareSimulation(doc){
  validateDocument(doc);
  const byId=new Map(doc.nodes.map(n=>[n.id,n]));
  const precedence=doc.edges.filter(e=>['sequence','dependency','handoff'].includes(e.type));
  const indegree=new Map(doc.nodes.map(n=>[n.id,0])),children=new Map(doc.nodes.map(n=>[n.id,[]]));
  for(const edge of precedence){indegree.set(edge.to,indegree.get(edge.to)+1);children.get(edge.from).push(edge);}
  // Kahn: if cyclic, no silent partial or infinite loop.
  const count=new Map(indegree),queue=doc.nodes.filter(n=>count.get(n.id)===0).map(n=>n.id);
  let visited=0;
  for(let head=0;head<queue.length;head++){
    const id=queue[head];visited++;
    for(const e of children.get(id)){count.set(e.to,count.get(e.to)-1);if(count.get(e.to)===0)queue.push(e.to)}
  }
  if(visited!==doc.nodes.length)throw Error('O fluxo contém ciclo de sequência ou passagem. Revise as conexões antes de simular.');
  // Imported files may be syntactically valid yet contain unusable numbers.
  for(const n of doc.nodes.filter(isTask)){
    const duration=Number(n.duration??0),cost=Number(n.cost??0);
    if(!Number.isFinite(duration)||duration<0||duration>100000)throw Error(`Duração inválida em “${n.title}”. Corrija a peça antes de simular.`);
    if(!Number.isFinite(cost)||cost<0||cost>1e9)throw Error(`Custo inválido em “${n.title}”. Corrija a peça antes de simular.`);
  }
  for(const e of precedence){
    if(e.type!=='handoff')continue;
    const delay=Number(e.slaMinutes??0);
    if(!Number.isFinite(delay)||delay<0||delay>100000)throw Error('Uma passagem entre equipes contém prazo inválido.');
  }
  const warnings=[];
  if(!doc.nodes.some(isTask))warnings.push('Não existem atividades nem decisões com duração para simular.');
  const missing=doc.nodes.filter(n=>isTask(n)&&!n.team?.trim()).length;
  if(missing)warnings.push(`${missing} atividade(s) sem equipe: cada uma terá capacidade independente, provisória.`);
  if(doc.nodes.some(n=>isTask(n)&&!(Number(n.duration)>0)))warnings.push('Atividades sem duração usam 0 minuto; informe tempos para uma estimativa útil.');
  if(doc.edges.some(e=>e.type==='resource'))warnings.push('Vínculos de recursos são informativos; limites de capacidade de sistemas não são simulados nesta versão.');
  if(doc.nodes.some(n=>n.rules?.trim()))warnings.push('Regras em texto não são executadas automaticamente; configure tempos e dependências no modelo.');
  if(doc.edges.some(e=>e.type==='handoff'&&e.slaMinutes>0))warnings.push('Prazo de passagem é considerado como atraso mínimo antes da atividade seguinte (não como prazo máximo).');
  return {byId,precedence,indegree,children,warnings};
}
export function simulateService(doc,settings={}){
  const scenario=normalizeScenario(settings),graph=prepareSimulation(doc),spatialPlans=planSpatialTransfers(doc,scenario);
  if(doc.nodes.length*scenario.cases>SIM_LIMITS.events)throw Error('Cenário muito grande para execução local. Reduza o número de ocorrências.');
  if(!doc.nodes.some(isTask))throw Error('Adicione ao menos uma atividade ou decisão ao serviço antes de simular.');
  const order=new Map(doc.nodes.map((n,i)=>[n.id,i])),jobs=new Map(),ready=[],running=[],completed=[];
  const teams=new Map(),events=[],trace=[],transfers=[];
  const teamName=n=>n.team?.trim()||`__sem-equipe__${n.id}`;
  const teamCapacity=name=>scenario.teamCapacities[name]??scenario.teamCapacity;
  for(const n of doc.nodes)if(isTask(n)){const name=teamName(n);if(!teams.has(name))teams.set(name,{name,capacity:teamCapacity(name),active:0,busy:0,wait:0,count:0});}
  for(let caseIndex=0;caseIndex<scenario.cases;caseIndex++){
    const arrival=caseIndex*scenario.arrivalInterval;
    for(const n of doc.nodes){const id=`${caseIndex}|${n.id}`;let job={id,caseIndex,node:n,arrival,remaining:graph.indegree.get(n.id),readyAt:arrival,start:null,end:null,status:'pending'};jobs.set(id,job);if(!job.remaining){job.status='ready';ready.push(job)}}
  }
  let time=0,done=0,guard=0;
  function finish(job){
    job.status='done';done++;completed.push(job);const node=job.node;
    if(isTask(node)){const team=teams.get(teamName(node));team.active--;team.busy+=job.end-job.start;team.wait+=job.start-job.readyAt;team.count++;}
    const row={caseIndex:job.caseIndex+1,nodeId:node.id,title:node.title,type:node.type,team:node.team||'Sem equipe',environmentId:node.environmentId||'',stage:node.stage,arrivedAt:job.arrival,readyAt:job.readyAt,start:job.start,end:job.end,duration:job.end-job.start,wait:job.start-job.readyAt,cost:isTask(node)?Math.max(0,Number(node.cost)||0):0,task:isTask(node)};
    events.push(row);trace.push({time:job.end,kind:'complete',caseIndex:row.caseIndex,nodeId:node.id});
    for(const edge of graph.children.get(node.id)){
      const child=jobs.get(`${job.caseIndex}|${edge.to}`);
      const handoffDelay=edge.type==='handoff'?Math.max(0,Number(edge.slaMinutes)||0):0;
      const travel=spatialPlans.get(`${node.id}|${edge.to}`);
      if(travel){
        const start=job.end+handoffDelay;
        transfers.push({...travel,caseIndex:job.caseIndex+1,start,end:start+travel.minutes});
      }
      child.readyAt=Math.max(child.readyAt,job.end+handoffDelay+(travel?.minutes||0));
      child.remaining--;
      if(!child.remaining){child.status='ready';ready.push(child)}
    }
  }
  while(done<jobs.size){
    if(++guard>SIM_LIMITS.events*8+2000)throw Error('Limite de eventos atingido; revise o fluxo e as estimativas.');
    // Release completed work first, including zero-duration milestones.
    let changed=true;
    while(changed){
      changed=false;
      for(let i=running.length-1;i>=0;i--)if(running[i].end<=time+1e-8){const [j]=running.splice(i,1);finish(j);changed=true;}
      ready.sort((a,b)=>a.readyAt-b.readyAt||a.caseIndex-b.caseIndex||order.get(a.node.id)-order.get(b.node.id));
      for(let i=0;i<ready.length;){
        const job=ready[i];if(job.readyAt>time+1e-8){i++;continue}
        const node=job.node,team=isTask(node)?teams.get(teamName(node)):null;
        if(team&&team.active>=team.capacity){i++;continue}
        ready.splice(i,1);job.start=time;job.end=time+(isTask(node)?Math.max(0,Number(node.duration)||0):0);job.status='running';
        if(team)team.active++;
        trace.push({time,kind:'start',caseIndex:job.caseIndex+1,nodeId:node.id});running.push(job);changed=true;
        // Start all currently eligible jobs before advancing time.
      }
    }
    if(done===jobs.size)break;
    const future=[...running.map(j=>j.end).filter(t=>t>time+1e-8),...ready.map(j=>j.readyAt).filter(t=>t>time+1e-8)];
    if(!future.length)throw Error('Execução bloqueada: existem atividades sem condições de avanço.');
    time=Math.min(...future);
  }
  events.sort((a,b)=>a.start-b.start||a.caseIndex-b.caseIndex||a.end-b.end);
  const elapsed=Math.max(...completed.map(j=>j.end))-Math.min(...completed.map(j=>j.arrival));
  const byCase=Array.from({length:scenario.cases},(_,i)=>{
    const subset=events.filter(e=>e.caseIndex===i+1),start=i*scenario.arrivalInterval,end=Math.max(start,...subset.map(e=>e.end));
    return {caseIndex:i+1,arrival:start,end,cycle:end-start,waiting:subset.reduce((v,e)=>v+e.wait,0),work:subset.filter(e=>e.task).reduce((v,e)=>v+e.duration,0)};
  });
  const teamStats=[...teams.values()].map(t=>({name:t.name.startsWith('__sem-equipe__')?'Sem equipe · atividade isolada':t.name,capacity:t.capacity,count:t.count,busy:t.busy,waiting:t.wait,utilization:elapsed>0?t.busy/(t.capacity*elapsed):0})).sort((a,b)=>b.utilization-a.utilization);
  const waiting=events.reduce((v,e)=>v+e.wait,0),totalCost=events.reduce((v,e)=>v+e.cost,0);
  const metrics={cases:scenario.cases,elapsed,averageCycle:byCase.reduce((s,c)=>s+c.cycle,0)/scenario.cases,averageWait:waiting/scenario.cases,waiting,totalCost,averageCost:totalCost/scenario.cases,completed:scenario.cases,utilization:teamStats.length?teamStats.reduce((v,t)=>v+t.utilization,0)/teamStats.length:0};
  const warnings=[...graph.warnings];if(teamStats.some(t=>t.utilization>.85))warnings.push('Uma ou mais equipes ultrapassam 85% de ocupação nesta simulação.');
  if(metrics.averageWait>10)warnings.push('Espera média superior a 10 minutos por ocorrência; revise capacidade e sequenciamento.');
  if(scenario.spatialEnabled){metrics.totalWalkingMinutes=transfers.reduce((n,t)=>n+t.minutes,0);
    metrics.averageWalkingMinutes=metrics.totalWalkingMinutes/scenario.cases;
    metrics.totalWalkingMeters=transfers.reduce((n,t)=>n+t.meters,0);
    warnings.push('Tempos de caminhada estimados pela grade global e velocidade informada. Não considera congestionamento, acessibilidade nem variabilidade.');
    if(graph.precedence.some(e=>graph.children.get(e.from)?.length>1))warnings.push('Fluxos paralelos podem representar uma pessoa em trajetos simultâneos; revise as dependências do serviço.');
  }
  return {version:SIM_VERSION,modelId:doc.id,modelUpdatedAt:doc.updatedAt,createdAt:new Date().toISOString(),settings:scenario,events,trace,transfers,byCase,teamStats,metrics,warnings};
}
export function stateAt(result,minute){
  const time=Math.max(0,Number(minute)||0);
  const current=result.events.filter(e=>e.start<=time&&e.end>time&&e.task);
  const finished=result.events.filter(e=>e.end<=time), waiting=result.events.filter(e=>e.readyAt<=time&&e.start>time&&e.task);
  const arrivals=result.byCase.filter(c=>c.arrival<=time).length;
  return {minute:time,current,finished,waiting,arrivals,completedCases:result.byCase.filter(c=>c.end<=time).length};
}
export function simulationCsv(result){
  const safe=v=>{let s=String(v??'').replace(/[\r\n]+/g,' ');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
  return '\uFEFF'+[['Ocorrência','Componente','Tipo','Equipe','Etapa','Pronto no minuto','Início','Fim','Duração','Espera','Custo informado'],...result.events.map(e=>[e.caseIndex,e.title,e.type,e.team,e.stage+1,e.readyAt,e.start,e.end,e.duration,e.wait,e.cost])].map(row=>row.map(safe).join(';')).join('\r\n')+'\r\n';
}
