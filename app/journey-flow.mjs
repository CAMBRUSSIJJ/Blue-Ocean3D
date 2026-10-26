/**
 * P2 · Projeção de leitura da Jornada usando os nós e relações canônicos.
 * Não cria conexões, não estima durações e não altera a simulação.
 */
const VISIBLE_TYPES=new Set(['activity','decision','touchpoint']);
const FLOW_TYPES=new Set(['sequence','dependency','handoff']);
const compare=(a,b)=>a.stage-b.stage||a.order-b.order;
export function projectJourney(doc){
 const environments=new Map((doc.environments||[]).map(room=>[room.id,room]));
 const stages=doc.stages||[];
 const nodes=(doc.nodes||[]).map((node,order)=>({...node,order})).filter(node=>VISIBLE_TYPES.has(node.type));
 const byId=new Map(nodes.map(node=>[node.id,node]));
 const incoming=new Map(nodes.map(node=>[node.id,[]]));
 const outgoing=new Map(nodes.map(node=>[node.id,[]]));
 for(const edge of doc.edges||[]){
  if(!FLOW_TYPES.has(edge.type)||!byId.has(edge.from)||!byId.has(edge.to))continue;
  const from=byId.get(edge.from),to=byId.get(edge.to);
  const link={id:edge.id,from:edge.from,to:edge.to,type:edge.type,label:edge.label||'',sourceTitle:from.title,targetTitle:to.title,crossRoom:from.environmentId!==to.environmentId};
  outgoing.get(from.id).push(link);
  incoming.get(to.id).push(link);
 }
 const sorted=[...nodes].sort(compare);
 const degree=new Map(nodes.map(n=>[n.id,incoming.get(n.id).length]));
 const depth=new Map(nodes.map(n=>[n.id,0]));
 const ready=sorted.filter(n=>degree.get(n.id)===0);
 const ordered=[],visited=new Set();
 while(ready.length){
  const current=ready.shift();
  if(visited.has(current.id))continue;
  visited.add(current.id);ordered.push(current);
  for(const link of outgoing.get(current.id)){
   depth.set(link.to,Math.max(depth.get(link.to),depth.get(current.id)+1));
   degree.set(link.to,degree.get(link.to)-1);
   if(degree.get(link.to)===0){ready.push(byId.get(link.to));ready.sort(compare)}
  }
 }
 const cycles=sorted.filter(n=>!visited.has(n.id));
 const detail=node=>{
  const inLinks=incoming.get(node.id),outLinks=outgoing.get(node.id);
  const room=environments.get(node.environmentId);
  return {
   id:node.id,title:node.title||'Sem título',type:node.type,stageName:stages[node.stage]?.name||'Sem etapa',
   environmentId:room?.id||'',environmentName:room?.name||'Sem ambiente',
   environmentColor:/^#[0-9a-fA-F]{6}$/.test(room?.color||'')?room.color:'#6b9fba',
   duration:Math.max(0,Number(node.duration)||0),
   incoming:inLinks,outgoing:outLinks,
   branchCount:outLinks.length,linked:inLinks.length>0||outLinks.length>0,
   cycle:!visited.has(node.id),depth:depth.get(node.id)||0
  };
 };
 const projected=[...ordered,...cycles].map(detail);
 const byDepth=new Map();
 for(const step of projected.filter(step=>step.linked&&!step.cycle)){
  if(!byDepth.has(step.depth))byDepth.set(step.depth,[]);
  byDepth.get(step.depth).push(step);
 }
 const columns=[...byDepth.entries()].sort((a,b)=>a[0]-b[0]).map(([level,steps])=>({level,steps}));
 const unlinked=projected.filter(step=>!step.linked);
 const cyclic=projected.filter(step=>step.cycle);
 return {
  steps:projected,columns,unlinked,cyclic,total:projected.length,
  linked:projected.filter(step=>step.linked).length,
  branches:projected.filter(step=>step.branchCount>1).length,
  crossRoom:projected.reduce((count,step)=>count+step.outgoing.filter(link=>link.crossRoom).length,0)
 };
}
