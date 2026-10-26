/** Read-only operational views over the deterministic simulation. */
import {simulateService,normalizeScenario} from './simulation.mjs';

/** A case is represented at the room where it is actually processing or waiting. */
export function environmentSnapshot(doc,result,minute){
  const time=Math.max(0,Math.min(result.metrics.elapsed,Number(minute)||0));
  const rooms=(doc.environments||[]).map(r=>({...r,id:r.id,active:[],waiting:[],completed:0}));
  const ids=new Set(rooms.map(r=>r.id));
  const orphan={id:'unassigned',name:'Sem ambiente',icon:'◌',color:'#8E9E9C',active:[],waiting:[],completed:0};
  const roomMap=new Map([...rooms,orphan].map(r=>[r.id,r]));
  const nodeRoom=new Map(doc.nodes.map(n=>[n.id,ids.has(n.environmentId)?n.environmentId:'unassigned']));
  // At zero-duration milestones the case must not be counted as occupying a room.
  for(const e of result.events){
    if(!e.task)continue;
    const r=roomMap.get(nodeRoom.get(e.nodeId)||'unassigned');
    const token={caseIndex:e.caseIndex,nodeId:e.nodeId,title:e.title,team:e.team,minute:time};
    if(e.start<=time&&e.end>time)r.active.push(token);
    else if(e.readyAt<=time&&e.start>time)r.waiting.push(token);
    else if(e.end<=time)r.completed++;
  }
  const visible=rooms.filter(r=>doc.nodes.some(n=>n.environmentId===r.id));
  if(orphan.active.length||orphan.waiting.length||doc.nodes.some(n=>!ids.has(n.environmentId)))visible.push(orphan);
  const active=visible.reduce((sum,r)=>sum+r.active.length,0);
  const waiting=visible.reduce((sum,r)=>sum+r.waiting.length,0);
  return {time,rooms:visible,active,waiting,completedCases:result.byCase.filter(c=>c.end<=time).length};
}

/** Analyze what would actually change if exactly one team gained one slot. */
export function capacityOpportunities(doc,result){
  const settings=normalizeScenario(result.settings);
  const options=[];
  for(const t of result.teamStats.filter(t=>t.waiting>0).slice(0,10)){
    // A missing-team placeholder cannot be safely controlled with one group capacity.
    if(t.name.startsWith('Sem equipe ·')||t.capacity>=8)continue;
    const next={...settings,teamCapacities:{...settings.teamCapacities,[t.name]:t.capacity+1}};
    let changed;
    try{changed=simulateService(doc,next)}catch{continue}
    const savedWait=result.metrics.averageWait-changed.metrics.averageWait;
    const savedCycle=result.metrics.averageCycle-changed.metrics.averageCycle;
    options.push({team:t.name,from:t.capacity,to:t.capacity+1,savedWait,savedCycle,waiting:t.waiting,utilization:t.utilization,scenario:next});
  }
  return options.sort((a,b)=>b.savedWait-a.savedWait||b.savedCycle-a.savedCycle||b.waiting-a.waiting);
}

export function quickScenario(base,preset){
  const scenario=normalizeScenario(base);
  if(preset==='normal')return {...scenario,arrivalInterval:8,cases:6,teamCapacity:1,teamCapacities:{}};
  if(preset==='peak')return {...scenario,arrivalInterval:Math.max(0,Math.floor(scenario.arrivalInterval/2)),cases:Math.min(30,Math.max(10,scenario.cases+4))};
  if(preset==='quiet')return {...scenario,arrivalInterval:Math.min(240,Math.max(1,scenario.arrivalInterval*2)),cases:Math.max(1,Math.min(6,scenario.cases))};
  throw Error('Cenário rápido desconhecido.');
}

/** Non-blocking model checks: disconnected tasks may legitimately be parallel. */
export function reviewServiceFlow(doc){
  const tasks=doc.nodes.filter(n=>n.type==='activity'||n.type==='decision');
  const links=new Set(doc.edges.filter(e=>['sequence','dependency','handoff'].includes(e.type)).flatMap(e=>[e.from,e.to]));
  const isolated=tasks.length<2?[]:tasks.filter(n=>!links.has(n.id));
  const noTime=tasks.filter(n=>!(Number(n.duration)>0));
  const noTeam=tasks.filter(n=>!n.team?.trim());
  const missingRoom=tasks.filter(n=>!doc.environments?.some(r=>r.id===n.environmentId));
  // Componentes fracos do grafo de execução: dois conjuntos internamente conectados
  // ainda são independentes entre si. Somente grupos contendo tarefas importam.
  const neighbors=new Map(doc.nodes.map(n=>[n.id,new Set()]));
  for(const e of doc.edges.filter(e=>['sequence','dependency','handoff'].includes(e.type))){
    if(!neighbors.has(e.from)||!neighbors.has(e.to))continue;
    neighbors.get(e.from).add(e.to);neighbors.get(e.to).add(e.from);
  }
  const visited=new Set(),groups=[];
  for(const n of doc.nodes){
    if(visited.has(n.id))continue;
    const queue=[n.id],ids=[];visited.add(n.id);
    for(let i=0;i<queue.length;i++){
      const id=queue[i];ids.push(id);
      for(const adjacent of neighbors.get(id)||[]){if(!visited.has(adjacent)){visited.add(adjacent);queue.push(adjacent)}}
    }
    const contained=tasks.filter(t=>ids.includes(t.id));
    if(contained.length)groups.push(contained.map(t=>t.id));
  }
  const warnings=[];
  if(groups.length>1)warnings.push({key:'parallel',count:groups.length,text:`${groups.length} grupos de atividades sem ligação entre si — iniciarão em paralelo.`,nodeId:groups[1][0]});
  if(isolated.length)warnings.push({key:'isolated',count:isolated.length,text:'Atividade(s) sem sequência — poderão começar em paralelo.',nodeId:isolated[0].id});
  if(noTime.length)warnings.push({key:'time',count:noTime.length,text:'Atividade(s) com duração zero — não consomem tempo.',nodeId:noTime[0].id});
  if(noTeam.length)warnings.push({key:'team',count:noTeam.length,text:'Atividade(s) sem equipe — terão capacidade independente.',nodeId:noTeam[0].id});
  if(missingRoom.length)warnings.push({key:'room',count:missingRoom.length,text:'Atividade(s) fora de um ambiente.',nodeId:missingRoom[0].id});
  const precedence=doc.edges.filter(e=>['sequence','dependency','handoff'].includes(e.type));
  // Informações legíveis para a revisão prévia: atividades realmente isoladas não
  // possuem qualquer predecessor/sucessor de execução. Grupos paralelos são válidos.
  return {tasks:tasks.length,warnings,isolatedNodes:isolated.map(n=>n.id),
    missingRoomNodes:missingRoom.map(n=>n.id),noTeamNodes:noTeam.map(n=>n.id),
    noTimeNodes:noTime.map(n=>n.id),precedenceCount:precedence.length,
    independentGroups:groups,requiresParallelConfirmation:groups.length>1};
}
