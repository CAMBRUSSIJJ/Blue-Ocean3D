/** Rede transitável v2.1. Geometria em células esquemáticas; distâncias não são tempo de caminhada. */
import {GRID,ensureFloorplan,validFurniture,anchorFor} from './floorplan.mjs';
import {edgeType,nearestWalkable,blockedCells,portals,findRoute} from './floorplan-navigation.mjs';
export const SITE_LIMIT=200;
const key=(x,y)=>`${x}:${y}`;
const parse=s=>{const [x,y]=s.split(':').map(Number);return {x,y}};
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
export function siteRoomSpot(doc,id){let i=(doc.environments||[]).findIndex(r=>r.id===id);const saved=ensureFloorplan(doc).roomPositions?.[id];return saved&&Number.isInteger(saved.x)&&Number.isInteger(saved.y)&&saved.x>=0&&saved.y>=0&&saved.x<200&&saved.y<200?{x:saved.x,y:saved.y}:{x:(Math.max(i,0)%3)*14,y:Math.floor(Math.max(i,0)/3)*10}}
export function roomAtSite(doc,x,y){for(const room of doc.environments||[]){const p=siteRoomSpot(doc,room.id);if(x>=p.x&&x<p.x+GRID.columns&&y>=p.y&&y<p.y+GRID.rows)return {roomId:room.id,x:x-p.x,y:y-p.y};}return null}
export function corridors(doc){const f=ensureFloorplan(doc);if(!Array.isArray(f.corridors))f.corridors=[];return f.corridors}
export function setCorridor(doc,x,y,on=true){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=SITE_LIMIT||y>=SITE_LIMIT)throw Error('Corredor fora dos limites da planta geral.');if(roomAtSite(doc,x,y))throw Error('O corredor não pode atravessar uma sala. Use portas para acessar o ambiente.');const list=corridors(doc),idx=list.findIndex(c=>c.x===x&&c.y===y);if(on&&idx<0)list.push({x,y});if(!on&&idx>=0)list.splice(idx,1);return list.length}
function localExit(doc,roomId,a,b){const spot=siteRoomSpot(doc,roomId);const lx=a.x-spot.x,ly=a.y-spot.y;
 if(b.x===a.x+1)return edgeType(doc,roomId,'v',lx+1,ly)!=='wall';
 if(b.x===a.x-1)return edgeType(doc,roomId,'v',lx,ly)!=='wall';
 if(b.y===a.y+1)return edgeType(doc,roomId,'h',lx,ly+1)!=='wall';
 return edgeType(doc,roomId,'h',lx,ly)!=='wall';}
export function siteStepAllowed(doc,a,b,network=null){if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)!==1)return false;
 const ar=roomAtSite(doc,a.x,a.y),br=roomAtSite(doc,b.x,b.y),walk=network||new Set(corridors(doc).map(c=>key(c.x,c.y)));
 if(!ar&&!walk.has(key(a.x,a.y))||!br&&!walk.has(key(b.x,b.y)))return false;
 for(const r of [ar,br])if(r&&blockedCells(doc,r.roomId).has(key(r.x,r.y)))return false;
 if(ar&&!localExit(doc,ar.roomId,a,b))return false;
 if(br&&!localExit(doc,br.roomId,b,a))return false;
 return true;
}
function nearestGlobal(doc,roomId,position){const local=nearestWalkable(doc,roomId,position);if(!local)return null;const spot=siteRoomSpot(doc,roomId);return {x:spot.x+local.x,y:spot.y+local.y}}
/** BFS on continuous walkable cells; corridor cells and doors must be explicitly configured. */
export function physicalRoute(doc,fromId,toId,from=null,to=null){if(!fromId||!toId||!doc.environments?.some(r=>r.id===fromId)||!doc.environments?.some(r=>r.id===toId))return null;
 const src=nearestGlobal(doc,fromId,from||{x:GRID.columns/2,y:GRID.rows/2});const dest=nearestGlobal(doc,toId,to||{x:GRID.columns/2,y:GRID.rows/2});if(!src||!dest)return null;
 const net=new Set(corridors(doc).map(c=>key(c.x,c.y))),start=key(src.x,src.y),goal=key(dest.x,dest.y),previous=new Map([[start,null]]),queue=[src];
 for(let i=0;i<queue.length&&i<50000;i++){const cur=queue[i];if(key(cur.x,cur.y)===goal)break;
  for(const [dx,dy] of dirs){const n={x:cur.x+dx,y:cur.y+dy},k=key(n.x,n.y);if(n.x<0||n.y<0||n.x>=SITE_LIMIT||n.y>=SITE_LIMIT||previous.has(k)||!siteStepAllowed(doc,cur,n,net))continue;previous.set(k,key(cur.x,cur.y));queue.push(n)} }
 if(!previous.has(goal))return null;const path=[];for(let k=goal;k!==null;k=previous.get(k)){const p=parse(k);path.push({x:p.x+.5,y:p.y+.5,roomId:roomAtSite(doc,p.x,p.y)?.roomId||null})}return path.reverse();
}
function accessibleExits(doc,roomId){const spot=siteRoomSpot(doc,roomId),out=[];
 for(const p of portals(doc,roomId)){const edge=p.edge;if(edge.type==='wall')continue;
  const loc={x:p.x,y:p.y};if(!findRoute(doc,roomId,loc,{x:GRID.columns/2,y:GRID.rows/2}))continue;
  const outside={x:spot.x+p.x,y:spot.y+p.y};if(edge.axis==='h')outside.y=edge.y===0?spot.y-1:spot.y+GRID.rows;
  else outside.x=edge.x===0?spot.x-1:spot.x+GRID.columns;
  if(outside.x<0||outside.y<0||outside.x>=SITE_LIMIT||outside.y>=SITE_LIMIT||roomAtSite(doc,outside.x,outside.y))continue;
  out.push(outside);
 }return out;
}
/** Gera um corredor curto fora das salas, ligando portas externas transitáveis.
 * Faz busca independente dos corredores já construídos (não os destrói).
 */
export function connectWithCorridor(doc,fromId,toId){if(fromId===toId)throw Error('Escolha dois ambientes diferentes.');
 const sources=accessibleExits(doc,fromId),destinations=accessibleExits(doc,toId);if(!sources.length||!destinations.length)throw Error('As duas salas precisam de portas externas acessíveis, sem móveis bloqueando a passagem.');
 const goals=new Set(destinations.map(p=>key(p.x,p.y))),q=sources.map(p=>({...p})),prev=new Map(q.map(p=>[key(p.x,p.y),null])),visited=new Set(prev.keys());let found=null;
 for(let i=0;i<q.length&&i<50000;i++){const p=q[i],k=key(p.x,p.y);if(goals.has(k)){found=k;break;}
  for(const [dx,dy] of dirs){const x=p.x+dx,y=p.y+dy,nk=key(x,y);if(x<0||y<0||x>=SITE_LIMIT||y>=SITE_LIMIT||visited.has(nk)||roomAtSite(doc,x,y))continue;visited.add(nk);prev.set(nk,k);q.push({x,y})}}
 if(!found)throw Error('Não há espaço externo para conectar essas portas. Reposicione as salas.');
 const path=[];for(let k=found;k!==null;k=prev.get(k))path.push(parse(k));path.reverse();for(const p of path)setCorridor(doc,p.x,p.y,true);
 // A circulação será considerada válida apenas se a travessia desde o interior funcionar.
 const route=physicalRoute(doc,fromId,toId);if(!route)throw Error('O corredor foi desenhado, mas as passagens internas não formam uma rota transitável. Revise paredes e mobiliário.');
 return {added:path.length,path,route};
}
/** Constrói corredores para todas as transições operacionais que ainda não têm caminho.
 * Cada par mantém o resultado se for transitável; retorna avisos sobre as demais salas.
 */
export function connectServiceCorridors(doc){const links=siteRouteReport(doc).links;let created=0;const errors=[];
 for(const l of links){if(l.connected)continue;
  try{const result=connectWithCorridor(doc,l.from,l.to);created+=result.added;}
  catch(err){errors.push({from:l.from,to:l.to,message:err.message});}
 }
 return {created,errors,report:siteRouteReport(doc)};
}
export function siteRouteReport(doc){const nodes=new Map((doc.nodes||[]).map(n=>[n.id,n])),links=[];const seen=new Set();for(const e of doc.edges||[]){if(!['sequence','dependency','handoff'].includes(e.type))continue;const a=nodes.get(e.from),b=nodes.get(e.to);if(!a?.environmentId||!b?.environmentId||a.environmentId===b.environmentId)continue;
  const k=`${a.environmentId}|${b.environmentId}`;if(seen.has(k))continue;seen.add(k);
  const path=physicalRoute(doc,a.environmentId,b.environmentId,anchorFor(doc,a.id,a.environmentId),anchorFor(doc,b.id,b.environmentId));links.push({from:a.environmentId,to:b.environmentId,connected:!!path,path,steps:path?path.length-1:null});}
 return {links,linked:links.filter(l=>l.connected).length,unlinked:links.filter(l=>!l.connected).length,corridors:corridors(doc).length};}
export function sampleSiteRoute(route,fraction){if(!route?.length)return null;const t=Math.max(0,Math.min(1,Number(fraction)||0))*(route.length-1),i=Math.min(route.length-2,Math.floor(t)),f=t-i;if(route.length===1)return route[0];const a=route[i],b=route[i+1];return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,roomId:f<.5?a.roomId:b.roomId};}
