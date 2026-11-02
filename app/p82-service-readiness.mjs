/**
 * P8.2 — Leitura semântica e preparação da simulação do serviço LOCAL.
 * Não há integração, sincronização ou inferência de dados externos.
 * O documento canônico permanece fonte única para edição, simulação e exportação.
 */
import {buildJourneyGraph} from './journey-flow.mjs';
import {prepareSimulation} from './simulation.mjs';
const text=v=>typeof v==='string'?v.trim():'';
export const SERVICE_CONTEXT_FIELDS=Object.freeze(['audience','trigger','outcome','scope','assumptions']);
export function serviceContext(doc){
 const source=doc?.serviceContext&&typeof doc.serviceContext==='object'?doc.serviceContext:{};
 return Object.fromEntries(SERVICE_CONTEXT_FIELDS.map(k=>[k,text(source[k])]));
}
export function evaluateServiceReadiness(doc){
 const context=serviceContext(doc),graph=buildJourneyGraph(doc);
 const tasks=(doc?.nodes||[]).filter(n=>['activity','decision'].includes(n.type));
 const errors=[],reviews=[],informations=[];
 const record=(bucket,id,title,detail,nodeId=null)=>bucket.push({id,title,detail,nodeId});
 if(!tasks.length)record(errors,'no-activities','Nenhuma atividade de execução','Crie pelo menos uma atividade ou decisão para iniciar a simulação.');
 // The same canonical engine validates cycles, negative durations, costs and handoffs.
 if(tasks.length){
  try{prepareSimulation(doc)}catch(e){record(errors,'engine-invalid','Fluxo não executável',e.message||'Revise os dados do serviço.');}
 }
 if(!context.audience)record(reviews,'audience','Público não definido','Descreva quem utiliza ou recebe este serviço.');
 if(!context.trigger)record(reviews,'trigger','Início não definido','Indique o evento que inicia o atendimento.');
 if(!context.outcome)record(reviews,'outcome','Resultado esperado não definido','Indique quando o serviço pode ser considerado concluído.');
 const noTime=tasks.filter(n=>!(Number(n.duration)>0));
 if(noTime.length)record(reviews,'duration',noTime.length+' atividade(s) sem tempo positivo','A simulação considerará duração zero, não uma estimativa automática.',noTime[0].id);
 const noTeam=tasks.filter(n=>!text(n.team));
 if(noTeam.length)record(reviews,'team',noTeam.length+' atividade(s) sem equipe','Cada atividade ficará com capacidade independente, em vez de compartilhar equipe.',noTeam[0].id);
 const noRoom=tasks.filter(n=>!doc?.environments?.some(r=>r.id===n.environmentId));
 if(noRoom.length)record(informations,'room',noRoom.length+' atividade(s) sem espaço físico','Pode ser intencional em serviços digitais ou remotos; somente vincule quando necessário.',noRoom[0].id);
 if(graph.parallelPossible)record(informations,'parallel','Há caminhos independentes','Atividades sem dependências entre si poderão iniciar em paralelo. Não é uma sequência presumida.');
 if(!graph.precedenceCount&&tasks.length>1)record(reviews,'connections','Atividades sem conexões de execução','Conecte as atividades somente se houver sequência ou dependência real.',tasks[0].id);
 const durations=tasks.filter(n=>Number(n.duration)>0).map(n=>Number(n.duration));
 return {context,taskCount:tasks.length,connectionCount:graph.precedenceCount,
  assignedRooms:tasks.length-noRoom.length,documentedTimes:durations.length,
  documentedTeams:tasks.length-noTeam.length,
  canSimulate:errors.length===0,errors,reviews,informations,graph};
}
