/** Build Mode: placement, reusable kits and suggested relations. Pure service-model operations. */
import {CARD_TYPES, LANES, NODE_W, NODE_H, STAGE_W, LANE_H, STAGE_X, HEADER_H, stageLeft, laneTop, addNode, addEdge, clone} from './core.mjs';
export const CATEGORIES = [
  {id:'all',title:'Todos'},
  {id:'experience',title:'Experiência',types:['touchpoint','evidence']},
  {id:'operation',title:'Operação',types:['activity','decision']},
  {id:'resources',title:'Recursos',types:['system','resource']},
  {id:'metrics',title:'Medição',types:['metric']}
];
export const CATALOG_DESCRIPTIONS={
  activity:'Uma tarefa executada por alguém',touchpoint:'Um encontro com o cliente',
  evidence:'Mensagem, documento ou entrega',decision:'Uma condição ou escolha',
  system:'Software usado no serviço',resource:'Pessoa, equipamento ou estrutura',
  metric:'Um número para acompanhar'
};
export const KITS={
  reception:{name:'Recepção',icon:'♙',desc:'Da chegada ao encaminhamento',items:[
    {type:'touchpoint',title:'Chegada do cliente',team:'Cliente',channel:'Presencial'},
    {type:'activity',title:'Receber e acolher',owner:'Recepcionista',team:'Atendimento',duration:5},
    {type:'activity',title:'Encaminhar solicitação',owner:'Atendente',team:'Atendimento',duration:4}
  ]},
  booking:{name:'Agendamento',icon:'▦',desc:'Solicitação, confirmação e registro',items:[
    {type:'touchpoint',title:'Solicitar horário',channel:'Digital'},
    {type:'activity',title:'Confirmar disponibilidade',owner:'Atendente',team:'Agendamento',duration:3},
    {type:'system',title:'Agenda digital',team:'Tecnologia'}
  ]},
  aftercare:{name:'Pós-atendimento',icon:'♡',desc:'Acompanhar e ouvir o cliente',items:[
    {type:'activity',title:'Enviar acompanhamento',owner:'Relacionamento',team:'CX',duration:5},
    {type:'touchpoint',title:'Receber retorno',channel:'WhatsApp'},
    {type:'metric',title:'Satisfação do cliente',metric:'CSAT'}
  ]}
};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const grid=x=>Math.round(x/16)*16;
export function stageAt(doc,x){return clamp(Math.floor((x-STAGE_X)/STAGE_W),0,doc.stages.length-1)}
export function laneAt(y){return LANES[clamp(Math.floor((y-HEADER_H)/LANE_H),0,LANES.length-1)].id}
export function overlaps(a,b,gap=12){return a.x < b.x+NODE_W+gap && a.x+NODE_W+gap>b.x && a.y<b.y+NODE_H+gap&&a.y+NODE_H+gap>b.y}
export function resolvePlacement(doc,{type='activity',x,y,stage,lane,excludeId=null}={}){
  if(!CARD_TYPES[type])throw Error('Tipo de componente desconhecido');
  const si=Number.isInteger(stage)?clamp(stage,0,doc.stages.length-1):Number.isFinite(x)?stageAt(doc,x):0;
  // Smart semantic drop: activity may live in front- or backstage. Other types
  // snap to their methodological lane even when dropped over an unrelated lane.
  const hovered=Number.isFinite(y)?laneAt(y):null;
  const allowed=type==='activity'?['front','back']:[CARD_TYPES[type].lane];
  const row=LANES.some(l=>l.id===lane)?lane:(allowed.includes(hovered)?hovered:CARD_TYPES[type].lane);
  const minX=stageLeft(si)+24,maxX=stageLeft(si)+STAGE_W-NODE_W-20;
  const minY=laneTop(row)+24,maxY=laneTop(row)+LANE_H-NODE_H-20;
  const wanted={x:grid(clamp(Number.isFinite(x)?x-NODE_W/2:minX,minX,maxX)),y:grid(clamp(Number.isFinite(y)?y-NODE_H/2:minY,minY,maxY))};
  const other=doc.nodes.filter(n=>n.id!==excludeId),slotXs=[wanted.x,grid(minX),grid(maxX)],slotYs=[wanted.y,grid(minY),grid(maxY)];
  const candidates=[];for(const cx of [...new Set(slotXs)])for(const cy of [...new Set(slotYs)])candidates.push({x:cx,y:cy});
  candidates.sort((a,b)=>Math.hypot(a.x-wanted.x,a.y-wanted.y)-Math.hypot(b.x-wanted.x,b.y-wanted.y));
  const best=candidates.find(c=>!other.some(n=>overlaps(c,n)));
  const p=best??wanted;
  return {...p,stage:si,lane:row,crowded:!best,valid:!!best};
}
export function insertComponent(doc,{type='activity',x,y,stage,lane,fields={}}={}){
  const place=resolvePlacement(doc,{type,x,y,stage,lane});
  const n=addNode(doc,{type,stage:place.stage,x:place.x,y:place.y,title:fields.title,team:fields.team,owner:fields.owner});
  n.lane=place.lane;
  for(const [key,val] of Object.entries(fields))if(key in n && !['id','x','y','stage','lane','type'].includes(key))n[key]=val;
  return {node:n,crowded:place.crowded};
}
/** Kits create canonical objects, not disposable drawing symbols. Caller records undo before adding. */
export function addKit(doc,key,{startStage=0}={}){
  const kit=KITS[key];if(!kit)throw Error('Kit de serviços não encontrado.');
  if(doc.stages.length<3)throw Error('O kit precisa de pelo menos três etapas.');
  const made=[];
  for(let i=0;i<kit.items.length;i++){
    const v=kit.items[i],stage=(startStage+i)%doc.stages.length;
    made.push(insertComponent(doc,{type:v.type,stage,fields:v}).node);
  }
  const links=[];
  for(let i=1;i<made.length;i++)links.push(addEdge(doc,{from:made[i-1].id,to:made[i].id,type:'sequence'}));
  return {nodes:made,edges:links};
}
export function suggestedSequence(doc,from,to){
  const a=doc.nodes.find(n=>n.id===from),b=doc.nodes.find(n=>n.id===to);
  return !!(a&&b&&a.id!==b.id&&!doc.edges.some(e=>e.type==='sequence'&&e.from===from&&e.to===to));
}
export function safeApplyKit(doc,key,opts={}){
  // A kit is atomic even if a model limit or invalid connection is encountered.
  const next=clone(doc);const created=addKit(next,key,opts);
  if(next.nodes.length>600||next.edges.length>1500)throw Error('Limite de elementos atingido.');
  doc.nodes=next.nodes;doc.edges=next.edges;doc.updatedAt=next.updatedAt;
  return created;
}
