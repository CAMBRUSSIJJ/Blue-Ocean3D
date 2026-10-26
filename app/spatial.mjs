/** v2.2 — hipóteses de caminhada sobre a grade física do conjunto de salas.
 * Não é uma medição real; não considera colisões dinâmicas, aceleração ou acessibilidade.
 */
import {physicalRoute} from './site-routing.mjs';
import {anchorFor} from './floorplan.mjs';
export const SPATIAL_DEFAULTS={spatialEnabled:false,metersPerCell:1,walkingSpeed:72};
export function validateSpatialSettings(s={}){
 const spatialEnabled=Boolean(s.spatialEnabled);
 const metersPerCell=s.metersPerCell==null?1:Number(s.metersPerCell);
 const walkingSpeed=s.walkingSpeed==null?72:Number(s.walkingSpeed);
 if(!Number.isFinite(metersPerCell)||metersPerCell<.4||metersPerCell>2)throw Error('Escala da planta geral deve estar entre 0,4 e 2 metros por célula.');
 if(!Number.isFinite(walkingSpeed)||walkingSpeed<12||walkingSpeed>150)throw Error('Velocidade deve estar entre 12 e 150 metros por minuto.');
 return {spatialEnabled,metersPerCell,walkingSpeed};
}
/** Plano por ligação operacional, compartilhado por todas as ocorrências. */
export function planSpatialTransfers(doc,settings){const s=validateSpatialSettings(settings),plans=new Map();if(!s.spatialEnabled)return plans;
 const nodes=new Map(doc.nodes.map(n=>[n.id,n]));
 for(const e of doc.edges.filter(e=>['sequence','dependency','handoff'].includes(e.type))){
  const from=nodes.get(e.from),to=nodes.get(e.to);
  if(!from?.environmentId||!to?.environmentId||from.environmentId===to.environmentId)continue;
  const route=physicalRoute(doc,from.environmentId,to.environmentId,anchorFor(doc,from.id,from.environmentId),anchorFor(doc,to.id,to.environmentId));
  if(!route)throw Error(`Não existe percurso físico entre “${from.title}” e “${to.title}”. Verifique portas, corredores e móveis ou desligue o modo espacial.`);
  const cells=Math.max(0,route.length-1),meters=cells*s.metersPerCell,minutes=meters/s.walkingSpeed;
  plans.set(`${e.from}|${e.to}`,{fromNodeId:from.id,toNodeId:to.id,fromRoomId:from.environmentId,toRoomId:to.environmentId,cells,meters,minutes,route});
 }return plans;
}
/** Ocupação simultânea por célula amostrada em intervalos de tempo configuráveis.
 * Não representa congestionamento físico nem restringe capacidade dos corredores.
 */
export function corridorHotspots(result,{samplingMinutes=.5}={}){
 const transfers=result?.transfers||[];if(!transfers.length)return {hotspots:[],peak:0,samplingMinutes};
 if(!Number.isFinite(samplingMinutes)||samplingMinutes<=0)throw Error('Resolução temporal inválida.');
 const maxEnd=Math.max(...transfers.map(t=>t.end));const counts=new Map();let peak=0;
 for(let minute=0;minute<=maxEnd+1e-9;minute+=samplingMinutes){
  const occupied=new Map();for(const t of transfers){if(minute<t.start||minute>=t.end||!t.route?.length)continue;
   const tFraction=(minute-t.start)/(t.end-t.start),i=Math.min(t.route.length-1,Math.floor(tFraction*(t.route.length-1)));
   const p=t.route[i];if(p.roomId)continue;
   const k=`${Math.floor(p.x)}:${Math.floor(p.y)}`;occupied.set(k,(occupied.get(k)||0)+1);
  }
  for(const [k,n] of occupied){counts.set(k,Math.max(counts.get(k)||0,n));peak=Math.max(peak,n)}
 }
 const hotspots=[...counts].map(([k,maxSimultaneous])=>{const [x,y]=k.split(':').map(Number);return {x,y,maxSimultaneous}}).sort((a,b)=>b.maxSimultaneous-a.maxSimultaneous||a.x-b.x||a.y-b.y);
 return {hotspots,peak,samplingMinutes};
}
