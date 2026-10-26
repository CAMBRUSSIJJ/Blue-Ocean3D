/** v2.1 — tráfego espacial ilustrativo derivado dos horários CANÔNICOS do simulador. */
import {GRID,anchorFor,peopleAt,validFurniture,furnitureDimensions} from './floorplan.mjs';
import {roomEdges} from './floorplan-navigation.mjs';
import {siteRoomSpot,roomAtSite,corridors,physicalRoute,sampleSiteRoute,siteRouteReport} from './site-routing.mjs';
import {corridorHotspots} from './spatial.mjs';
import {siteInteractionPlan,interactionSummary} from './simulation-poses.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
/** Retorna um único viajante por ocorrência quando há uma transição entre atividades em salas diferentes.
 * O trajeto existe apenas quando o modelo físico permite a passagem. Janela visual <=2 min,
 * independente do tempo calculado pelo motor; não se presume velocidade em m/s.
 */
export function physicalTravellers(doc,result,minute){if(!result)return [];
 const eventsByCase=new Map();for(const event of result.events||[]){if(!event.task||!event.environmentId)continue;const group=eventsByCase.get(event.caseIndex)||[];group.push(event);eventsByCase.set(event.caseIndex,group)}
 if(result.settings?.spatialEnabled){
   return (result.transfers||[]).filter(t=>minute>=t.start&&minute<t.end&&t.end>t.start).map(t=>{
     const progress=(minute-t.start)/(t.end-t.start),where=sampleSiteRoute(t.route,progress);
     return {id:`client-${t.caseIndex}`,kind:'client',caseIndex:t.caseIndex,nodeId:t.toNodeId,roomId:where.roomId,
       status:'Caminhando (tempo incluído)',x:where.x,y:where.y,route:t.route,progress,from:t.fromRoomId,to:t.toRoomId};
   });
 }
 const actors=[];for(const [caseIndex,events] of eventsByCase){events.sort((a,b)=>a.start-b.start||a.end-b.end);
  for(let i=1;i<events.length;i++){const previous=events[i-1],next=events[i];if(previous.environmentId===next.environmentId||previous.end>next.start+.01)continue;
   const gap=next.start-previous.end;
   const start=gap>0?Math.max(previous.end,next.start-Math.min(2,gap)):next.start;
   const finish=gap>0?next.start:next.start+Math.min(1,next.duration||1);
   if(finish<=start||minute<start||minute>=finish)continue;
   const route=physicalRoute(doc,previous.environmentId,next.environmentId,anchorFor(doc,previous.nodeId,previous.environmentId),anchorFor(doc,next.nodeId,next.environmentId));
   if(!route)continue;
   const progress=(minute-start)/(finish-start),where=sampleSiteRoute(route,progress);
   actors.push({id:`client-${caseIndex}`,kind:'client',caseIndex,nodeId:next.nodeId,roomId:where.roomId,status:'Em deslocamento (visual)',x:where.x,y:where.y,route,progress,from:previous.environmentId,to:next.environmentId});break;
  }
 }return actors;
}
function walls(doc,roomId,ox,oy,step){const lines=[];for(const e of roomEdges(doc,roomId)){const a=e.axis==='h'?{x:ox+e.x,y:oy+e.y}:{x:ox+e.x,y:oy+e.y};const b=e.axis==='h'?{x:a.x+1,y:a.y}:{x:a.x,y:a.y+1};lines.push(`<line x1="${a.x*step}" y1="${a.y*step}" x2="${b.x*step}" y2="${b.y*step}" stroke="${e.type==='door'?'#15ab92':'#54796d'}" stroke-width="${e.type==='door'?4:5}" ${e.type==='door'?'stroke-dasharray="4 4"':''}/>`)}return lines.join('')}
/** SVG escalável que permite acompanhar clientes também nos corredores entre salas. */
export function renderSiteTraffic(doc,result,minute){const STEP=23,rooms=doc.environments||[],hall=corridors(doc),report=siteRouteReport(doc),moving=physicalTravellers(doc,result,minute),travellersById=new Map(moving.map(p=>[p.id,p]));
 const maxX=Math.max(36,...rooms.map(r=>siteRoomSpot(doc,r.id).x+GRID.columns+4),...hall.map(c=>c.x+4));const maxY=Math.max(23,...rooms.map(r=>siteRoomSpot(doc,r.id).y+GRID.rows+4),...hall.map(c=>c.y+4)),w=maxX*STEP,h=maxY*STEP;
 const congestion=result?.settings?.spatialEnabled?corridorHotspots(result):{hotspots:[],peak:0};
 const all=siteInteractionPlan(doc,peopleAt(doc,result,minute).filter(p=>!travellersById.has(p.id)).map(p=>{const where=siteRoomSpot(doc,p.roomId);return {...p,x:where.x+p.x,y:where.y+p.y}}).concat(moving));
 const localRoom=(r)=>{const p=siteRoomSpot(doc,r.id);return `<g><rect x="${p.x*STEP}" y="${p.y*STEP}" width="${GRID.columns*STEP}" height="${GRID.rows*STEP}" rx="3" fill="#f4faf5" stroke="#b3cdbd" stroke-width="3"/>${Array.from({length:GRID.columns-1},(_,i)=>`<line x1="${(p.x+i+1)*STEP}" y1="${p.y*STEP}" x2="${(p.x+i+1)*STEP}" y2="${(p.y+GRID.rows)*STEP}" stroke="#e0ece4"/>`).join('')}${Array.from({length:GRID.rows-1},(_,i)=>`<line x1="${p.x*STEP}" y1="${(p.y+i+1)*STEP}" x2="${(p.x+GRID.columns)*STEP}" y2="${(p.y+i+1)*STEP}" stroke="#e0ece4"/>`).join('')}${validFurniture(doc).filter(o=>o.roomId===r.id).map(o=>{const [a,b]=furnitureDimensions(o);return `<rect x="${(p.x+o.x)*STEP+3}" y="${(p.y+o.y)*STEP+3}" width="${a*STEP-6}" height="${b*STEP-6}" rx="4" fill="#bad4c8" stroke="#639787"/>`}).join('')}${walls(doc,r.id,p.x,p.y,STEP)}<text x="${(p.x+.2)*STEP}" y="${(p.y-.28)*STEP}" font-size="13" font-weight="750" fill="#234d43">${esc(r.name)}</text></g>`}
 const scene=`<svg class="sim21-traffic-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Planta geral com ambientes, corredores e pessoas em deslocamento"><rect width="${w}" height="${h}" fill="#f0f7f2"/>${hall.map(c=>`<rect x="${c.x*STEP+1}" y="${c.y*STEP+1}" width="${STEP-2}" height="${STEP-2}" rx="3" fill="#d7ae72" opacity=".83"/>`).join('')}${congestion.hotspots.map(p=>`<rect x="${p.x*STEP+3}" y="${p.y*STEP+3}" width="${STEP-6}" height="${STEP-6}" rx="3" fill="${p.maxSimultaneous>=3?'#c7574b':p.maxSimultaneous===2?'#e28e55':'#e8bd73'}" opacity="${p.maxSimultaneous>=2?.6:.22}"><title>Pico observado na célula: ${p.maxSimultaneous} pessoa(s) simultâneas</title></rect>`).join('')}${report.links.filter(l=>l.path).map(l=>`<polyline points="${l.path.map(p=>`${p.x*STEP},${p.y*STEP}`).join(' ')}" stroke="#1caa85" stroke-width="3" fill="none" stroke-dasharray="7 6" opacity=".65"/>`).join('')}${rooms.map(localRoom).join('')}${all.map((actor,index)=>{const x=actor.x*STEP,y=actor.y*STEP,walking=actor.pose==='walking',staff=actor.kind==='staff',seated=actor.pose==='seated';return `<g data-sim21-person="${esc(actor.id)}" data-sim21-case="${esc(actor.caseIndex)}" data-sim21-node="${esc(actor.nodeId)}" role="button" tabindex="0" aria-label="${staff?'Profissional':'Cliente '+actor.caseIndex}: ${esc(actor.status)}"><circle cx="${x}" cy="${y}" r="${walking?9:8}" stroke="${seated?'#704ca5':walking?'#805127':'#fff'}" stroke-width="2.2" fill="${staff?'#0b907d':walking?'#e5a35d':'#537faa'}"/><text x="${x}" y="${y+3.5}" text-anchor="middle" fill="white" font-size="8" font-weight="700">${seated?'S':staff?'P':actor.caseIndex}</text><title>${staff?'Profissional':'Cliente '+actor.caseIndex} — ${esc(actor.status)} · ${esc(actor.pose||'standing')}</title></g>`}).join('')}</svg>`;
 return {html:scene,actors:all,travellers:moving,report,congestion,rooms:rooms.length,interactions:interactionSummary(all)};
}
