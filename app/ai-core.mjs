/** Service Builder v2.6 — copiloto local com planos completos tipados.
 * Planos são normalizados, aplicados em cópia e dependem de confirmação humana.
 */
import {createRoom,roomById} from './environments.mjs';
import {putFurniture,FURNITURE,GRID,linkFurniture} from './floorplan.mjs';
import {setRoomScale,setEdge} from './floorplan-navigation.mjs';
import {insertComponent} from './build.mjs';
import {addEdge,validateDocument} from './core.mjs';
import {connectServiceCorridors,siteRouteReport} from './site-routing.mjs';
import {simulateService} from './simulation.mjs';
const limited=(v,n=100)=>String(v??'').trim().slice(0,n);
const numeric=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const aiIsObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const aiRequireArray=(v,max,name)=>{if(!Array.isArray(v)||v.length>max)throw Error(`${name}: lista ausente ou excede ${max} itens.`);return v};
const aiRequireText=(v,n,label)=>{const t=limited(v,n);if(!t)throw Error(`${label} não informado.`);return t};
const aiCoord=(v,max,label)=>{if(typeof v!=='number'||!Number.isInteger(v)||v<0||v>max)throw Error(`${label} fora da grade.`);return v};
const aiUniq=s=>s.toLocaleLowerCase('pt-BR');
export const AI_ALLOWED_ACTIONS=['create_room','add_furniture','add_activity','build_service'];
export const AI_FURNITURE=Object.keys(FURNITURE);
export function summarizeProject(doc,{includeSimulation=true,latestSimulation=null}={}){
 const summary={
  name:limited(doc.name,100),environments:(doc.environments||[]).slice(0,12).map(r=>({name:limited(r.name,72),team:limited(r.team,80),id:r.id,
   activities:doc.nodes.filter(n=>n.environmentId===r.id).slice(0,8).map(n=>({title:limited(n.title,100),type:n.type,team:limited(n.team,80),minutes:n.duration||0})),
   furniture:(doc.floorplan?.objects||[]).filter(o=>o.roomId===r.id).slice(0,12).map(o=>({kind:o.kind,x:o.x,y:o.y}))})),
  stages:(doc.stages||[]).map(s=>limited(s.name,80)),
  totalActivities:doc.nodes.filter(n=>['activity','decision'].includes(n.type)).length,
  unassigned:doc.nodes.filter(n=>!n.environmentId).length,
  remainingRooms:Math.max(0,(doc.environments||[]).length-12),
  links:doc.edges.slice(0,36).map(e=>({from:limited(doc.nodes.find(n=>n.id===e.from)?.title,90),to:limited(doc.nodes.find(n=>n.id===e.to)?.title,90),type:e.type})),
  roomGrid:{columns:GRID.columns,rows:GRID.rows}
 };
 if(latestSimulation?.modelUpdatedAt===doc.updatedAt){
  const s=latestSimulation;
  summary.latestSimulation={description:'Resultado calculado mais recentemente na aba Simular Serviço, válido para este projeto',settings:s.settings,
   averageWait:Number(s.metrics.averageWait.toFixed(1)),averageCycle:Number(s.metrics.averageCycle.toFixed(1)),
   totalCost:Number(s.metrics.totalCost.toFixed(2)),
   teamUtilization:s.teamStats.slice(0,12).map(t=>({team:t.name,utilizationPct:Math.round(t.utilization*100),waitingMin:Math.round(t.waiting)})),warnings:s.warnings.slice(0,6)};
 }
 if(includeSimulation&&!summary.latestSimulation){
  try{
   const result=simulateService(doc,{cases:6,arrivalInterval:8,teamCapacity:1});
   summary.referenceSimulation={scenario:'Exemplo de referência: 6 clientes, chegada a cada 8 min, 1 vaga/equipe, sem caminhada',
    averageWait:Number(result.metrics.averageWait.toFixed(1)),averageCycle:Number(result.metrics.averageCycle.toFixed(1)),totalCost:Number(result.metrics.totalCost.toFixed(2)),
    teamUtilization:result.teamStats.slice(0,12).map(t=>({team:t.name,utilizationPct:Math.round(t.utilization*100),waitingMin:Math.round(t.waiting)})),warnings:result.warnings.slice(0,6)};
  }catch(err){summary.referenceSimulation={unavailable:limited(err.message,180)};}
 }
 return summary;
}
/** Compact, constrained format for one multi-room plan. Never trust unchecked model JSON. */
export function normalizeServicePlan(raw){
 if(!aiIsObject(raw))throw Error('Plano completo inválido.');
 const rooms=aiRequireArray(raw.rooms,6,'Ambientes');
 if(!rooms.length)throw Error('O plano precisa de pelo menos um ambiente.');
 const names=new Set(),activities=new Set();let totalFurniture=0,totalActivities=0,totalSegments=0;
 const cleanRooms=rooms.map((room,i)=>{
  if(!aiIsObject(room))throw Error(`Ambiente ${i+1} inválido.`);
  const name=aiRequireText(room.name,72,'Nome do ambiente'),team=limited(room.team,80);
  if(names.has(aiUniq(name)))throw Error(`Ambiente repetido: ${name}.`);names.add(aiUniq(name));
  const scale=room.scale===undefined?.75:room.scale;
  if(typeof scale!=='number'||!Number.isFinite(scale)||scale<.4||scale>2)throw Error(`Escala inválida para ${name}.`);
  const items=aiRequireArray(room.furniture??[],8,`Móveis de ${name}`).map(f=>{
   if(!aiIsObject(f)||!AI_FURNITURE.includes(f.kind))throw Error(`Móvel inválido em ${name}.`);
   return {kind:f.kind,x:aiCoord(f.x,GRID.columns-1,'Coluna do móvel'),y:aiCoord(f.y,GRID.rows-1,'Linha do móvel'),activity:limited(f.activity,100)};
  });totalFurniture+=items.length;
  const acts=aiRequireArray(room.activities??[],6,`Atividades de ${name}`).map(a=>{
   if(!aiIsObject(a))throw Error(`Atividade inválida em ${name}.`);
   const title=aiRequireText(a.title,100,'Título da atividade'),duration=a.duration;
   if(typeof duration!=='number'||!Number.isFinite(duration)||duration<0||duration>1440)throw Error(`Duração inválida: ${title}.`);
   const key=aiUniq(name)+'::'+aiUniq(title);
   if(activities.has(key))throw Error(`Atividade repetida: ${title}.`);activities.add(key);
   return {title,duration,team:limited(a.team,80)||team};
  });totalActivities+=acts.length;
  const doors=aiRequireArray(room.doors??[],4,`Portas de ${name}`).map(d=>{
   if(!aiIsObject(d)||!['top','bottom','left','right'].includes(d.wall))throw Error(`Porta inválida em ${name}.`);
   return {wall:d.wall,offset:aiCoord(d.offset,['top','bottom'].includes(d.wall)?GRID.columns-1:GRID.rows-1,'Posição da porta')};
  });
  const walls=aiRequireArray(room.walls??[],8,`Paredes de ${name}`).map(w=>{
   if(!aiIsObject(w)||!['h','v'].includes(w.axis))throw Error(`Parede inválida em ${name}.`);
   return {axis:w.axis,x:aiCoord(w.x,w.axis==='h'?GRID.columns-1:GRID.columns,'Coluna da parede'),y:aiCoord(w.y,w.axis==='h'?GRID.rows:GRID.rows-1,'Linha da parede')};
  });totalSegments+=doors.length+walls.length;
  return {name,team,scale,furniture:items,activities:acts,doors,walls};
 });
 if(totalFurniture>40||totalActivities>30||totalSegments>50)throw Error('O plano ultrapassou o limite de móveis, atividades ou divisórias.');
 const links=aiRequireArray(raw.connections??[],24,'Conexões').map(l=>{
  if(!aiIsObject(l))throw Error('Conexão inválida.');
  const fromRoom=aiRequireText(l.fromRoom,72,'Ambiente de origem'),toRoom=aiRequireText(l.toRoom,72,'Ambiente de destino');
  const fromActivity=aiRequireText(l.fromActivity,100,'Atividade de origem'),toActivity=aiRequireText(l.toActivity,100,'Atividade de destino');
  if(!activities.has(aiUniq(fromRoom)+'::'+aiUniq(fromActivity))||!activities.has(aiUniq(toRoom)+'::'+aiUniq(toActivity)))throw Error('Conexão referencia uma atividade que não está no plano.');
  return {fromRoom,fromActivity,toRoom,toActivity};
 });
 return {type:'build_service',rooms:cleanRooms,connections:links,
  // Explicit booleans. Avoid silently inventing relationships.
  autoCorridors:raw.autoCorridors===true,linkInRoom:raw.linkInRoom!==false};
}
export function normalizeProposals(value){
 if(!Array.isArray(value))return [];
 if(value.length>12)throw Error('O copiloto propôs mais de 12 alterações; peça um plano menor.');
 if(value.some(a=>a?.type==='build_service')&&value.length!==1)throw Error('Um projeto completo deve ser apresentado como uma única proposta.');
 return value.map((raw,index)=>{
  if(!aiIsObject(raw)||!AI_ALLOWED_ACTIONS.includes(raw.type))throw Error(`Ação ${index+1} não permitida.`);
  if(raw.type==='build_service')return normalizeServicePlan(raw);
  if(raw.type==='create_room'){
   const name=limited(raw.name,72),team=limited(raw.team,80);
   if(!name)throw Error('Uma sala precisa ter nome.');return {type:'create_room',name,team};
  }
  const room=limited(raw.room,72);
  if(!room)throw Error('Informe um ambiente de destino para cada alteração.');
  if(raw.type==='add_furniture'){
   const kind=limited(raw.kind,40),x=numeric(raw.x,-1),y=numeric(raw.y,-1);
   if(!AI_FURNITURE.includes(kind)||!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=GRID.columns||y<0||y>=GRID.rows)throw Error('Móvel ou posição inválidos.');
   return {type:'add_furniture',room,kind,x,y};
  }
  const title=limited(raw.title,100),duration=numeric(raw.duration,-1),team=limited(raw.team,80);
  if(!title||!Number.isFinite(duration)||duration<0||duration>1440)throw Error('Título ou duração da atividade inválidos.');
  return {type:'add_activity',room,title,duration,team};
 });
}
function findRoom(doc,name){return (doc.environments||[]).find(r=>aiUniq(r.name)===aiUniq(name));}
const aiKeyOf=(room,title)=>aiUniq(room)+'::'+aiUniq(title);
function applyServicePlan(candidate,plan,report){
 const nodes=new Map();
 for(const roomSpec of plan.rooms){
  if(findRoom(candidate,roomSpec.name))throw Error(`O ambiente “${roomSpec.name}” já existe. Use um projeto vazio ou renomeie a sala proposta.`);
  const room=createRoom(candidate,{name:roomSpec.name,team:roomSpec.team});
  setRoomScale(candidate,room.id,roomSpec.scale);
  // Walls first, then doors, then furniture. Collisions are checked by the canonical model.
  for(const w of roomSpec.walls)setEdge(candidate,room.id,w.axis,w.x,w.y,'wall');
  for(const door of roomSpec.doors){
   const horizontal=['top','bottom'].includes(door.wall);
   setEdge(candidate,room.id,horizontal?'h':'v',horizontal?door.offset:door.wall==='left'?0:GRID.columns,
    horizontal?door.wall==='top'?0:GRID.rows:door.offset,'door');
  }
  const activityNodes=[];
  for(const a of roomSpec.activities){
   const node=insertComponent(candidate,{type:'activity',stage:Math.min(candidate.stages.length-1,Math.max(0,activityNodes.length)),fields:{title:a.title,duration:a.duration,team:a.team||room.team}}).node;
   node.environmentId=room.id;nodes.set(aiKeyOf(room.name,a.title),node);activityNodes.push(node);
  }
  if(plan.linkInRoom)for(let i=1;i<activityNodes.length;i++)addEdge(candidate,{from:activityNodes[i-1].id,to:activityNodes[i].id,type:'sequence'});
  for(const f of roomSpec.furniture){
   const item=putFurniture(candidate,{roomId:room.id,kind:f.kind,x:f.x,y:f.y});
   if(f.activity){const target=nodes.get(aiKeyOf(room.name,f.activity));if(!target)throw Error(`O móvel em ${room.name} referencia a atividade desconhecida “${f.activity}”.`);linkFurniture(candidate,item.id,target.id)}
  }
  report.push(`${room.name}: ${roomSpec.activities.length} atividades, ${roomSpec.furniture.length} móveis, ${roomSpec.doors.length} portas`);
 }
 for(const link of plan.connections){
  const a=nodes.get(aiKeyOf(link.fromRoom,link.fromActivity)),b=nodes.get(aiKeyOf(link.toRoom,link.toActivity));
  if(!a||!b)throw Error('Conexão não encontrada no plano completo.');
  addEdge(candidate,{from:a.id,to:b.id,type:'sequence'});
 }
 if(plan.connections.length)report.push(`${plan.connections.length} conexões entre atividades`);
 if(plan.autoCorridors){
  const result=connectServiceCorridors(candidate);
  if(result.errors.length)throw Error(`Não foi possível criar todas as passagens físicas (${result.errors[0].message}). O plano inteiro foi cancelado.`);
  const state=siteRouteReport(candidate);
  if(state.unlinked)throw Error('Existem transições sem trajeto transitável. O plano inteiro foi cancelado.');
  report.push(`${state.corridors} células de corredor · ${state.linked} trajetos transitáveis`);
 }
}
/** Applies to a clone. Any error preserves the original document byte-for-byte. */
export function applyApprovedProposals(doc,input){
 const actions=normalizeProposals(input),candidate=structuredClone(doc),report=[];
 for(const action of actions){
  if(action.type==='build_service'){applyServicePlan(candidate,action,report);continue;}
  if(action.type==='create_room'){
   if(findRoom(candidate,action.name))throw Error(`O ambiente “${action.name}” já existe.`);
   createRoom(candidate,{name:action.name,team:action.team});report.push(`Ambiente criado: ${action.name}`);
  }else{
   const room=findRoom(candidate,action.room);
   if(!room)throw Error(`Ambiente não encontrado: ${action.room}.`);
   if(action.type==='add_furniture'){
    putFurniture(candidate,{roomId:room.id,kind:action.kind,x:action.x,y:action.y});
    report.push(`${FURNITURE[action.kind].name} em ${room.name}`);
   }else{
    const node=insertComponent(candidate,{type:'activity',stage:0,fields:{title:action.title,team:action.team||room.team,duration:action.duration}}).node;
    node.environmentId=room.id;report.push(`Atividade criada: ${action.title} em ${room.name}`);
   }
  }
 }
 validateDocument(candidate);
 return {document:candidate,report};
}
export function readableAction(action){
 if(action.type==='build_service')return `Projeto completo: ${action.rooms.map(r=>r.name).join(' → ')}. ${action.rooms.reduce((n,r)=>n+r.activities.length,0)} atividades, ${action.rooms.reduce((n,r)=>n+r.furniture.length,0)} móveis, ${action.connections.length} conexões; corredores ${action.autoCorridors?'automáticos':'não solicitados'}.`;
 if(action.type==='create_room')return `Criar ambiente “${action.name}”${action.team?' · Equipe: '+action.team:''}`;
 if(action.type==='add_furniture')return `Adicionar ${FURNITURE[action.kind]?.name||action.kind} em “${action.room}” (col. ${action.x}, linha ${action.y})`;
 return `Adicionar atividade “${action.title}” em “${action.room}” (${action.duration} min)`;
}
