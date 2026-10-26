/** v2.3 — Projeção visual determinística de pessoas sobre os objetos de serviço.
 * Nunca muda eventos, duração, custos, capacidade ou o documento.
 * 'Sentar', 'trabalhar' e 'interagir' são representações ilustrativas; não
 * modelamos capacidade física de assentos, espera por equipamento ou ergonomia.
 */
import {GRID,validFurniture,furnitureDimensions} from './floorplan.mjs';
import {siteRoomSpot,roomAtSite} from './site-routing.mjs';
const clamp=(value,max)=>Math.max(.24,Math.min(max-.24,value));
const seatKinds=new Set(['waiting','bench','chair','stool']);
const workKinds=new Set(['desk','counter','station','kiosk','table','exam']);
const seatCapacity={waiting:3,bench:3,chair:1,stool:1};
const seatPriority={waiting:0,bench:1,chair:2,stool:3};
const isWalking=a=>/caminh|deslocamento/i.test(a.status||'');
const isWaiting=a=>a.kind==='client'&&['Na fila','Aguardando próxima etapa'].includes(a.status);
const isServing=a=>a.kind==='client'&&a.status==='Em atendimento';
const center=o=>{const [w,h]=furnitureDimensions(o);return {x:o.x+w/2,y:o.y+h/2,w,h};};
export function roomInteractionPlan(doc,actors,roomId){
 const furniture=validFurniture(doc).filter(o=>o.roomId===roomId);
 const seats=furniture.filter(o=>seatKinds.has(o.kind)).sort((a,b)=>(seatPriority[a.kind]-seatPriority[b.kind])||a.y-b.y||a.x-b.x||String(a.id).localeCompare(String(b.id)));
 const stations=furniture.filter(o=>workKinds.has(o.kind));
 const slots=[];
 for(const item of seats){const {x,y,w}=center(item),count=seatCapacity[item.kind]||1;
   for(let i=0;i<count;i++)slots.push({objectId:item.id,kind:item.kind,x:clamp(x+(i-(count-1)/2)*Math.min(.62,w/count),GRID.columns),y:clamp(y,GRID.rows),seat:i+1});
 }
 const queue=[...actors].filter(a=>a.roomId===roomId&&isWaiting(a)&&!isWalking(a)).sort((a,b)=>(a.caseIndex??0)-(b.caseIndex??0)||String(a.id).localeCompare(String(b.id)));
 const slotById=new Map(queue.slice(0,slots.length).map((a,i)=>[a.id,slots[i]]));
 const stationCounts=new Map();
 return actors.map(actor=>{
   if(actor.roomId!==roomId)return {...actor,pose:isWalking(actor)?'walking':'standing'};
   if(isWalking(actor))return {...actor,pose:'walking'};
   const assigned=slotById.get(actor.id);
   if(assigned)return {...actor,pose:'seated',seatId:assigned.objectId,objectKind:assigned.kind,seatNumber:assigned.seat,x:assigned.x,y:assigned.y};
   if(isWaiting(actor))return {...actor,pose:'queued'};
   if(actor.kind==='staff'||isServing(actor)){
     const linked=stations.find(o=>o.nodeId&&o.nodeId===actor.nodeId);
     // Nunca vincular arbitrariamente um profissional a um móvel diferente do da atividade.
     if(linked){const c=center(linked),n=stationCounts.get(linked.id)||0;stationCounts.set(linked.id,n+1);
       const direction=actor.kind==='staff'?-1:1;
       const p={x:clamp(c.x+(n%2)*.38-(n>1?.2:0),GRID.columns),y:clamp(c.y+direction*(c.h/2+.35),GRID.rows)};
       return {...actor,...p,pose:linked.kind==='exam'&&actor.kind==='client'?'reclining':actor.kind==='staff'?'working':'being-served',interactionObjectId:linked.id,objectKind:linked.kind};
     }
     return {...actor,pose:actor.kind==='staff'?'standing':'being-served'};
   }
   return {...actor,pose:'standing'};
 });
}
/** Recebe pessoas em coordenadas globais; atribui poses em cada sala sem deslocar corredores. */
export function siteInteractionPlan(doc,actors){
 const grouped=new Map();
 for(const actor of actors){const id=actor.roomId||roomAtSite(doc,actor.x,actor.y)?.roomId;
   if(!id)continue;const origin=siteRoomSpot(doc,id);if(!origin)continue;
   const list=grouped.get(id)||[];list.push({...actor,x:actor.x-origin.x,y:actor.y-origin.y,roomId:id});grouped.set(id,list);
 }
 const projected=new Map();for(const [id,list] of grouped){const origin=siteRoomSpot(doc,id);for(const actor of roomInteractionPlan(doc,list,id))projected.set(actor.id,{...actor,x:actor.x+origin.x,y:actor.y+origin.y});}
 return actors.map(actor=>projected.get(actor.id)||{...actor,pose:isWalking(actor)?'walking':'standing'});
}
export function interactionSummary(actors){
 const clientCases=new Set(actors.filter(a=>a.kind==='client').map(a=>a.caseIndex));
 return {clients:clientCases.size,seated:actors.filter(a=>a.pose==='seated').length,queued:actors.filter(a=>a.pose==='queued').length,
   serving:actors.filter(a=>a.pose==='being-served'||a.pose==='reclining').length,working:actors.filter(a=>a.pose==='working').length,
   walking:actors.filter(a=>a.pose==='walking').length};
}
