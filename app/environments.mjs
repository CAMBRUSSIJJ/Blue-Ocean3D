/** Service Builder v0.4 — operational environments and reusable room kits.
 * An environment is a functional work area, not a physical/3D room.
 * All nodes remain canonical in doc.nodes. References use stable IDs.
 */
import {CARD_TYPES,LANES,STAGE_W,STAGE_X,stageLeft,addEdge,validateDocument,clone,touch} from './core.mjs';
import {insertComponent} from './build.mjs';
const uid=()=>globalThis.crypto?.randomUUID?.()??`env-${Math.random().toString(36).slice(2)}`;
const colors=['#1F927F','#587EB7','#B67E48','#9373B4','#D0748F','#5692AA','#7B9167'];
export const ROOM_PRESETS={
 reception:{name:'Recepção',icon:'♧',color:'#1F927F',description:'Acolher, identificar a necessidade e encaminhar.',team:'Atendimento',parts:[
  {type:'touchpoint',title:'Chegada do cliente',team:'Cliente',lane:'customer',stage:0},
  {type:'activity',title:'Acolher cliente',owner:'Recepcionista',team:'Atendimento',duration:5,stage:0},
  {type:'activity',title:'Fazer triagem',owner:'Recepcionista',team:'Atendimento',duration:4,stage:1}]},
 booking:{name:'Agendamento',icon:'▦',color:'#587EB7',description:'Disponibilidade, confirmação e comunicação.',team:'Agendamento',parts:[
  {type:'touchpoint',title:'Solicitar horário',channel:'WhatsApp',stage:0},
  {type:'activity',title:'Consultar disponibilidade',team:'Agendamento',owner:'Atendente',duration:3,stage:1},
  {type:'activity',title:'Confirmar agendamento',team:'Agendamento',owner:'Atendente',duration:2,stage:2}]},
 consultation:{name:'Consultório',icon:'✚',color:'#9373B4',description:'Preparação, atendimento e registro.',team:'Profissionais',parts:[
  {type:'activity',title:'Preparar atendimento',team:'Profissionais',owner:'Assistente',duration:6,stage:1},
  {type:'activity',title:'Realizar atendimento',team:'Profissionais',owner:'Especialista',duration:25,stage:2},
  {type:'evidence',title:'Resumo da consulta',stage:3}]},
 finance:{name:'Financeiro',icon:'◈',color:'#B67E48',description:'Cobrança, pagamento e comprovantes.',team:'Financeiro',parts:[
  {type:'activity',title:'Conferir cobrança',team:'Financeiro',owner:'Analista',duration:3,stage:1},
  {type:'activity',title:'Registrar pagamento',team:'Financeiro',owner:'Analista',duration:4,stage:2},
  {type:'evidence',title:'Enviar comprovante',stage:3}]},
 aftercare:{name:'Pós-atendimento',icon:'♡',color:'#D0748F',description:'Acompanhar o cliente depois da entrega.',team:'Relacionamento',parts:[
  {type:'activity',title:'Enviar acompanhamento',team:'Relacionamento',owner:'CX',duration:4,stage:2},
  {type:'touchpoint',title:'Receber avaliação',channel:'WhatsApp',stage:3},
  {type:'metric',title:'Satisfação do cliente',metric:'CSAT',stage:3}]}
};
export function ensureRoomModel(doc){if(!Array.isArray(doc.environments))doc.environments=[];if(!Array.isArray(doc.roomTemplates))doc.roomTemplates=[];return doc;}
export function roomById(doc,id){return (doc.environments||[]).find(r=>r.id===id)||null;}
export function roomNodes(doc,id){return doc.nodes.filter(n=>(n.environmentId||null)===(id||null));}
export function createRoom(doc,input={}){
 ensureRoomModel(doc);if(doc.environments.length>=48)throw Error('Limite de 48 ambientes atingido.');
 const name=String(input.name||'Novo ambiente').trim().slice(0,72);if(!name)throw Error('Informe o nome do ambiente.');
 const room={id:uid(),name,icon:String(input.icon||'▦').slice(0,5),color:colors.includes(input.color)?input.color:(input.color&&/^#[0-9a-fA-F]{6}$/.test(input.color)?input.color:colors[doc.environments.length%colors.length]),description:String(input.description||'').slice(0,240),team:String(input.team||'').slice(0,80)};
 doc.environments.push(room);touch(doc);return room;
}
export function updateRoom(doc,id,changes){const r=roomById(doc,id);if(!r)throw Error('Ambiente não encontrado.');const allowed=['name','description','team','color','icon'];for(const k of allowed){if(!(k in changes))continue;const v=String(changes[k]??'').trim();if(k==='name'&&!v)throw Error('O ambiente precisa de um nome.');if(k==='color'&&!/^#[0-9a-fA-F]{6}$/.test(v))throw Error('Cor inválida.');r[k]=v.slice(0,k==='description'?240:k==='name'?72:80)}touch(doc);return r;}
export function deleteRoom(doc,id){if(!roomById(doc,id))throw Error('Ambiente não encontrado.');doc.environments=doc.environments.filter(r=>r.id!==id);for(const n of doc.nodes)if(n.environmentId===id)delete n.environmentId;touch(doc);}
export function assignRoom(doc,nodeId,roomId){const n=doc.nodes.find(n=>n.id===nodeId);if(!n)throw Error('Peça não encontrada.');if(roomId&& !roomById(doc,roomId))throw Error('Ambiente de destino inexistente.');if(roomId)n.environmentId=roomId;else delete n.environmentId;touch(doc);return n;}
export function projectRooms(doc){
 const rooms=[...(doc.environments||[]),{id:'unassigned',name:'Sem ambiente',icon:'◌',color:'#9CA9AE',description:'Peças ainda não organizadas.',team:''}].map(r=>({...r,nodes:roomNodes(doc,r.id==='unassigned'?null:r.id)}));
 const owner=new Map(doc.nodes.map(n=>[n.id,n.environmentId||'unassigned'])),links=new Map();
 for(const e of doc.edges){const a=owner.get(e.from),b=owner.get(e.to);if(a===b||!a||!b)continue;let key=`${a}|${b}`,x=links.get(key)||{from:a,to:b,count:0,types:new Set()};x.count++;x.types.add(e.type);links.set(key,x)}
 return {rooms,links:[...links.values()].map(x=>({...x,types:[...x.types]})),assigned:doc.nodes.filter(n=>n.environmentId&&roomById(doc,n.environmentId)).length,unassigned:doc.nodes.filter(n=>!n.environmentId).length};
}
export function createTemplate(doc,roomId){ensureRoomModel(doc);const room=roomById(doc,roomId);if(!room)throw Error('Escolha um ambiente para salvar como modelo.');if(doc.roomTemplates.length>=36)throw Error('Limite de 36 modelos salvos.');
 const nodes=roomNodes(doc,roomId);if(!nodes.length)throw Error('Adicione alguma peça antes de salvar um modelo.');
 const set=new Set(nodes.map(n=>n.id)),edges=doc.edges.filter(e=>set.has(e.from)&&set.has(e.to));
 const template={id:uid(),name:room.name,icon:room.icon,color:room.color,description:room.description,team:room.team,nodes:nodes.map(n=>({...clone(n),stageOffset:Math.max(0,n.stage-Math.min(...nodes.map(n=>n.stage)))})),edges:clone(edges),savedAt:new Date().toISOString()};
 doc.roomTemplates.push(template);touch(doc);return template;
}
/** Atomic application returns next state. Never mutates source on error. */
export function applyRoomTemplate(doc,key,{startStage=0}={}){
 ensureRoomModel(doc);const source=ROOM_PRESETS[key]??doc.roomTemplates.find(t=>t.id===key);if(!source)throw Error('Modelo de ambiente não encontrado.');
 const out=clone(doc);ensureRoomModel(out);
 const r=createRoom(out,source),nodes=[],edges=[],identity=new Map(),count=out.stages.length;
 const parts=source.parts??source.nodes;
 for(let i=0;i<parts.length;i++){
   const part=parts[i],stage=Math.min(count-1,Math.max(0,startStage+(part.stageOffset??part.stage??i)));
   const fields={...part,title:part.title,team:part.team||r.team};
   const created=insertComponent(out,{type:part.type,stage,lane:part.lane,fields}).node;
   created.environmentId=r.id;nodes.push(created);if(part.id)identity.set(part.id,created.id);
 }
 const links=source.edges??parts.slice(1).map((_,i)=>({fromIndex:i,toIndex:i+1,type:'sequence'}));
 for(const e of links){const from=e.fromIndex!=null?nodes[e.fromIndex]?.id:identity.get(e.from),to=e.toIndex!=null?nodes[e.toIndex]?.id:identity.get(e.to);if(!from||!to)throw Error('Modelo contém uma conexão inválida.');
   // Built-in kits always use sequence; saved templates reuse their real types.
   edges.push(addEdge(out,{from,to,type:e.type,label:e.label||'',acceptance:e.acceptance||'',slaMinutes:e.slaMinutes||0}));
 }
 validateDocument(out);return {document:out,room:r,nodes,edges};
}
export function validateRooms(doc){
 if(doc.environments!==undefined){if(!Array.isArray(doc.environments)||doc.environments.length>48)throw Error('Ambientes inválidos.');const ids=new Set();for(const r of doc.environments){if(!r||typeof r.id!=='string'||ids.has(r.id)||!r.name?.trim()||typeof r.name!=='string'||!/^#[0-9a-fA-F]{6}$/.test(r.color))throw Error('Ambiente inválido ou duplicado.');ids.add(r.id)}for(const n of doc.nodes)if(n.environmentId!==undefined&&(!ids.has(n.environmentId)))throw Error('Uma peça referencia ambiente inexistente.');}
 if(doc.roomTemplates!==undefined){if(!Array.isArray(doc.roomTemplates)||doc.roomTemplates.length>36)throw Error('Modelos de ambiente inválidos.');for(const t of doc.roomTemplates){if(!t||typeof t.name!=='string'||!Array.isArray(t.nodes)||t.nodes.length>40||!Array.isArray(t.edges)||t.edges.length>100)throw Error('Modelo de ambiente inválido.');}}
 return true;
}
