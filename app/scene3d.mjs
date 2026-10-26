/** v0.7 — Layout do mundo 3D: lógica pura (sem DOM/WebGL). Ambientes viram salas; peças ficam dentro delas.
 * Posição opcional da peça: node.at = {x,z} RELATIVA ao canto da sala (sobrevive a mudanças de layout). */
export const V3_CELL=2.4,V3_PAD=0.9,V3_ROW_MAX=30,V3_GAP=1.4;
export const snapGrid=(v,s=.5)=>Math.round(v/s)*s;
const v3finite=a=>a&&Number.isFinite(a.x)&&Number.isFinite(a.z);
export function layoutWorld(doc){
  const envs=doc.environments||[],byRoom=new Map(envs.map(r=>[r.id,[]])),loose=[];
  for(const n of [...doc.nodes].sort((a,b)=>a.stage-b.stage||a.y-b.y||a.x-b.x))(byRoom.get(n.environmentId)||loose).push(n);
  const groups=envs.map(r=>({id:r.id,name:r.name,color:r.color,icon:r.icon||'▦',list:byRoom.get(r.id)}));
  if(loose.length)groups.push({id:null,name:'Sem ambiente',color:'#7f8f9a',icon:'▫',list:loose});
  const rooms=[],items=[];let x=0,z=0,rowD=0;
  for(const g of groups){
    const n=g.list.length,cols=Math.max(2,Math.ceil(Math.sqrt(n))),rows=Math.max(2,Math.ceil(n/cols));
    let w=cols*V3_CELL+V3_PAD*2,d=rows*V3_CELL+V3_PAD*2;
    for(const it of g.list)if(v3finite(it.at)){w=Math.max(w,it.at.x+V3_PAD+.8);d=Math.max(d,it.at.z+V3_PAD+.8)}
    if(x>0&&x+w>V3_ROW_MAX){x=0;z+=rowD+V3_GAP;rowD=0}
    rooms.push({id:g.id,name:g.name,color:g.color,icon:g.icon,x,z,w,d,count:n});
    g.list.forEach((it,i)=>{
      const rel=v3finite(it.at)?it.at:{x:V3_PAD+V3_CELL*(i%cols+.5),z:V3_PAD+V3_CELL*(Math.floor(i/cols)+.5)};
      items.push({id:it.id,roomId:g.id,x:x+Math.min(Math.max(rel.x,.8),w-.8),z:z+Math.min(Math.max(rel.z,.8),d-.8)});
    });
    x+=w+V3_GAP;rowD=Math.max(rowD,d);
  }
  const maxX=Math.max(12,...rooms.map(r=>r.x+r.w)),maxZ=Math.max(12,...rooms.map(r=>r.z+r.d));
  return {rooms,items,bounds:{minX:0,minZ:0,maxX,maxZ}};
}
export function roomAtPoint(layout,x,z){return layout.rooms.find(r=>x>=r.x&&x<=r.x+r.w&&z>=r.z&&z<=r.z+r.d)||null}
export function relativeTo(room,x,z){return {x:snapGrid(x-room.x),z:snapGrid(z-room.z)}}
