/**
 * P3 — shared journey projection. Read-only: no copy of tasks or simulation data.
 * Execution relationships are sequence, dependency and handoff only.
 * Resource relationships are informational and must never imply precedence.
 */
export const JOURNEY_PRECEDENCE_TYPES=Object.freeze(['sequence','dependency','handoff']);
export function buildJourneyGraph(doc){
 const nodes=Array.isArray(doc?.nodes)?doc.nodes:[];
 const links=Array.isArray(doc?.edges)?doc.edges:[];
 const byId=new Map(nodes.map(n=>[n.id,n]));
 const order=new Map(nodes.map((n,i)=>[n.id,i]));
 const compare=(a,b)=>(Number(a.stage)||0)-(Number(b.stage)||0)||(order.get(a.id)-order.get(b.id));
 const children=new Map(nodes.map(n=>[n.id,[]]));
 const incoming=new Map(nodes.map(n=>[n.id,[]]));
 const outgoing=new Map(nodes.map(n=>[n.id,[]]));
 for(const edge of links){
  if(!JOURNEY_PRECEDENCE_TYPES.includes(edge.type)||!byId.has(edge.from)||!byId.has(edge.to))continue;
  children.get(edge.from).push(edge.to);
  incoming.get(edge.to).push(edge.from);
  outgoing.get(edge.from).push(edge.to);
 }
 const degrees=new Map(nodes.map(n=>[n.id,incoming.get(n.id).length]));
 const level=new Map(nodes.map(n=>[n.id,0]));
 const queue=nodes.filter(n=>degrees.get(n.id)===0).sort(compare);
 const sorted=[];
 while(queue.length){
  const next=queue.shift();sorted.push(next);
  for(const to of children.get(next.id)){
   level.set(to,Math.max(level.get(to),level.get(next.id)+1));
   degrees.set(to,degrees.get(to)-1);
   if(degrees.get(to)===0){queue.push(byId.get(to));queue.sort(compare)}
  }
 }
 const cyclic=sorted.length!==nodes.length;
 if(cyclic){
  // Do not silently drop nodes when an imported project contains a cycle.
  for(const n of nodes.filter(n=>degrees.get(n.id)>0).sort(compare))sorted.push(n);
 }
 const rooms=new Map((doc.environments||[]).map(r=>[r.id,r]));
 const steps=sorted.map(n=>{
  const room=rooms.get(n.environmentId);
  return {id:n.id,title:n.title,type:n.type,stage:n.stage,roomId:room?.id||null,
   roomName:room?.name||'Sem ambiente',roomColor:room?.color||'#81939b',
   team:n.team||'',duration:Number(n.duration)||0,level:level.get(n.id),
   incoming:incoming.get(n.id).length,outgoing:outgoing.get(n.id).length,
   isolated:incoming.get(n.id).length===0&&outgoing.get(n.id).length===0};
 });
 const tasks=steps.filter(n=>n.type==='activity'||n.type==='decision');
 // All original components remain available to the journey, including evidence and touchpoints.
 // Nonconnected activities may execute in parallel: screen order is not a guaranteed customer path.
 return {steps,tasks,cyclic,precedenceCount:links.filter(e=>JOURNEY_PRECEDENCE_TYPES.includes(e.type)&&byId.has(e.from)&&byId.has(e.to)).length,
  unassignedCount:tasks.filter(t=>!t.roomId).length,isolatedCount:tasks.filter(t=>t.isolated).length,
  branchCount:tasks.filter(t=>t.outgoing>1).length,parallelPossible:tasks.filter(t=>t.incoming===0).length>1};
}
export function journeySimulationSummary(doc,result,time,caseIndex=1){
 const graph=buildJourneyGraph(doc);
 if(!result)return {...graph,rows:[],peakWait:[],caseIndex};
 const elapsed=Math.max(0,Number(result.metrics?.elapsed)||0);
 const at=Math.max(0,Math.min(elapsed,Number(time)||0));
 const events=result.events||[];
 const byCase=new Map(events.filter(e=>e.caseIndex===caseIndex).map(e=>[e.nodeId,e]));
 const waitByNode=new Map();
 for(const e of events){
  if(!e.task)continue;
  const stat=waitByNode.get(e.nodeId)||{total:0,count:0,max:0};
  const wait=Math.max(0,Number(e.wait)||0);
  stat.total+=wait;stat.count++;stat.max=Math.max(stat.max,wait);waitByNode.set(e.nodeId,stat);
 }
 const rows=graph.steps.map(task=>{
  const event=byCase.get(task.id),aggregate=waitByNode.get(task.id);
  const status=!event?'not-executed':event.end<=at?'complete':
   event.start<=at&&event.end>at?'running':
   event.readyAt<=at&&event.start>at?'waiting':'upcoming';
  return {...task,status,hasEvent:Boolean(event),
   eventStart:event?.start??null,eventEnd:event?.end??null,
   wait:event?.wait??null,averageWait:aggregate?aggregate.total/aggregate.count:0,
   totalWait:aggregate?.total||0};
 });
 const peakWait=rows.filter(x=>x.totalWait>0).sort((a,b)=>b.totalWait-a.totalWait||a.title.localeCompare(b.title,'pt-BR')).slice(0,3);
 return {...graph,rows,peakWait,caseIndex,at,elapsed};
}
