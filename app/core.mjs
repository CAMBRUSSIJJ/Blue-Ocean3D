/** Service CAD Lab core: browser-independent canonical model. No CADCraft source bundled. */
export const VERSION=1;
export const LANES=[
  {id:'evidence',title:'Evidências',hint:'O que o cliente vê ou recebe',accent:'#687a91'},
  {id:'customer',title:'Ações do cliente',hint:'O que o cliente faz',accent:'#4e8db1'},
  {id:'front',title:'Linha de frente',hint:'Equipe e sistemas visíveis',accent:'#238f85'},
  {id:'back',title:'Bastidores',hint:'Processos internos',accent:'#b57946'},
  {id:'support',title:'Sistemas e apoio',hint:'Recursos e infraestrutura',accent:'#806eb4'}
];
export const CARD_TYPES={
  activity:{title:'Atividade',lane:'front',icon:'▣'},
  touchpoint:{title:'Ponto de contato',lane:'customer',icon:'◉'},
  evidence:{title:'Evidência',lane:'evidence',icon:'▤'},
  decision:{title:'Decisão',lane:'back',icon:'◇'},
  system:{title:'Sistema',lane:'support',icon:'▦'},
  resource:{title:'Recurso',lane:'support',icon:'⬡'},
  metric:{title:'Indicador',lane:'support',icon:'◷'}
};
export const EDGE_TYPES={
  sequence:{title:'Sequência',color:'#6388bd'},
  dependency:{title:'Dependência',color:'#d59f55'},
  resource:{title:'Usa recurso',color:'#8d7cc1'},
  handoff:{title:'Passagem entre equipes',color:'#269a91'}
};
const uid=()=>globalThis.crypto?.randomUUID?.()??`e${Math.random().toString(36).slice(2)}`;
export const clone=x=>JSON.parse(JSON.stringify(x));
export function createDocument(name='Novo serviço'){
  return {schema:VERSION,id:uid(),name,description:'',environments:[],roomTemplates:[],stages:[{id:uid(),name:'Descoberta'},{id:uid(),name:'Solicitação'},{id:uid(),name:'Entrega'},{id:uid(),name:'Continuidade'}],nodes:[],edges:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}
export const STAGE_X=190,STAGE_W=380,HEADER_H=160,LANE_H=300,NODE_W=250,NODE_H=116;
export const canvasWidth=doc=>STAGE_X+STAGE_W*Math.max(1,doc.stages.length)+48;
export const canvasHeight=()=>HEADER_H+LANE_H*LANES.length+48;
export const laneIndex=id=>Math.max(0,LANES.findIndex(l=>l.id===id));
export const laneTop=id=>HEADER_H+LANE_H*laneIndex(id);
export const stageLeft=i=>STAGE_X+STAGE_W*i;
export function addNode(doc,{type='activity',stage=0,team='',title,owner='',x,y}={}){
  if(!CARD_TYPES[type])throw Error('Tipo de componente desconhecido.');
  if(!doc.stages[stage])throw Error('Etapa inexistente.');
  const lane=CARD_TYPES[type].lane;
  const idx=doc.nodes.filter(n=>n.lane===lane&&n.stage===stage).length;
  const n={id:uid(),type,lane,stage,x:Number.isFinite(x)?x:stageLeft(stage)+65,y:Number.isFinite(y)?y:laneTop(lane)+35+Math.min(idx,3)*23,title:title||CARD_TYPES[type].title,description:'',owner,team,channel:'',duration:0,cost:0,capacity:0,resourceNotes:'',rules:'',metric:'',status:'draft',tags:[]};
  doc.nodes.push(n); touch(doc);return n;
}
export function touch(doc){doc.updatedAt=new Date().toISOString();}
export function moveNode(doc,id,x,y,{snap=true}={}){
  const n=doc.nodes.find(n=>n.id===id);if(!n)throw Error('Componente não encontrado.');
  const grid=v=>snap?Math.round(v/16)*16:v;
  const clampedX=Math.min(Math.max(STAGE_X+8,x),canvasWidth(doc)-NODE_W-24);
  const clampedY=Math.min(Math.max(HEADER_H+8,y),canvasHeight()-NODE_H-16);
  n.x=grid(clampedX);n.y=grid(clampedY);
  n.stage=Math.min(doc.stages.length-1,Math.max(0,Math.floor((n.x+NODE_W/2-STAGE_X)/STAGE_W)));
  const i=Math.min(LANES.length-1,Math.max(0,Math.floor((n.y+NODE_H/2-HEADER_H)/LANE_H)));
  n.lane=LANES[i].id;
  touch(doc);return n;
}
function edgeReaches(doc,from,to,visited=new Set()){
  if(from===to)return true;if(visited.has(from))return false;visited.add(from);
  return doc.edges.filter(e=>e.type==='dependency'&&e.from===from).some(e=>edgeReaches(doc,e.to,to,visited));
}
export function addEdge(doc,{from,to,type='sequence',label='',acceptance='',slaMinutes=0}={}){
  if(!EDGE_TYPES[type])throw Error('Tipo de conexão desconhecido.');
  const a=doc.nodes.find(n=>n.id===from),b=doc.nodes.find(n=>n.id===to);
  if(!a||!b)throw Error('A origem e o destino precisam existir.');
  if(a.id===b.id)throw Error('Um componente não pode se conectar a si mesmo.');
  if(doc.edges.some(e=>e.from===from&&e.to===to&&e.type===type))throw Error('Esta conexão já existe.');
  if(type==='resource'&&!['resource','system'].includes(b.type))throw Error('A relação “Usa recurso” precisa apontar para um Recurso ou Sistema.');
  if(type==='dependency'&&edgeReaches(doc,to,from))throw Error('Dependência circular identificada.');
  if(type==='handoff'&&(!a.team||!b.team||a.team===b.team))throw Error('Passagem exige equipes de origem e destino diferentes.');
  if(type==='handoff'&&!label.trim())throw Error('Descreva o que será transferido entre as equipes.');
  const edge={id:uid(),from,to,type,label:label.trim(),acceptance:acceptance.trim(),slaMinutes:Number(slaMinutes)||0};
  doc.edges.push(edge);touch(doc);return edge;
}
export function deleteNode(doc,id){doc.nodes=doc.nodes.filter(n=>n.id!==id);doc.edges=doc.edges.filter(e=>e.from!==id&&e.to!==id);touch(doc);}
export function deleteEdge(doc,id){doc.edges=doc.edges.filter(e=>e.id!==id);touch(doc);}
export function validateDocument(doc){
  if(!doc||doc.schema!==VERSION||typeof doc.name!=='string')throw Error('Arquivo não pertence a esta versão do Service CAD Lab.');
  if(!Array.isArray(doc.stages)||!doc.stages.length||doc.stages.length>24)throw Error('Quantidade inválida de etapas.');
  if(!Array.isArray(doc.nodes)||doc.nodes.length>600||!Array.isArray(doc.edges)||doc.edges.length>1500)throw Error('Limite de componentes ou conexões excedido.');
  if(!doc.stages.every(s=>typeof s.id==='string'&&typeof s.name==='string')||new Set(doc.stages.map(s=>s.id)).size!==doc.stages.length)throw Error('Etapas inválidas ou duplicadas.');
  const ids=new Set();
  for(const n of doc.nodes){
    if(!n||typeof n.id!=='string'||ids.has(n.id)||!CARD_TYPES[n.type]||!LANES.some(l=>l.id===n.lane)||!Number.isFinite(n.x)||!Number.isFinite(n.y)||!Number.isInteger(n.stage)||n.stage<0||n.stage>=doc.stages.length||!['title','owner','team'].every(k=>typeof n[k]==='string'))throw Error('Componente inválido ou duplicado.');
    ids.add(n.id);
  }
  const edgeIDs=new Set(),signatures=new Set(),nodes=new Map(doc.nodes.map(n=>[n.id,n]));
  for(const e of doc.edges){
    if(!e||typeof e.id!=='string'||edgeIDs.has(e.id)||!EDGE_TYPES[e.type]||!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)throw Error('Conexão inválida.');
    edgeIDs.add(e.id);const signature=`${e.from}|${e.to}|${e.type}`;
    if(signatures.has(signature))throw Error('Conexão duplicada.');signatures.add(signature);
    const a=nodes.get(e.from),b=nodes.get(e.to);
    if(e.type==='resource'&&!['resource','system'].includes(b.type))throw Error('Vínculo de recurso com destino inválido.');
    if(e.type==='handoff'&&(!a.team||!b.team||a.team===b.team||typeof e.label!=='string'||!e.label.trim()))throw Error('Passagem entre equipes inválida.');
  }
  for(const e of doc.edges.filter(e=>e.type==='dependency')){
    const without={...doc,edges:doc.edges.filter(x=>x!==e)};
    if(edgeReaches(without,e.to,e.from))throw Error('Dependência circular no arquivo.');
  }
  if(doc.environments!==undefined){
    if(!Array.isArray(doc.environments)||doc.environments.length>48)throw Error('Ambientes inválidos.');
    const roomIds=new Set();for(const r of doc.environments){if(!r||typeof r.id!=='string'||roomIds.has(r.id)||typeof r.name!=='string'||!r.name.trim()||!/^#[0-9A-Fa-f]{6}$/.test(r.color))throw Error('Ambiente inválido.');roomIds.add(r.id)}
    if(doc.nodes.some(n=>n.environmentId!==undefined&&!roomIds.has(n.environmentId)))throw Error('Referência de ambiente inexistente.');
  }else if(doc.nodes.some(n=>n.environmentId))throw Error('Ambientes não registrados.');
  if(doc.roomTemplates!==undefined){
    if(!Array.isArray(doc.roomTemplates)||doc.roomTemplates.length>36)throw Error('Biblioteca de ambientes inválida.');
    const ids=new Set();for(const t of doc.roomTemplates){if(!t||typeof t.id!=='string'||ids.has(t.id)||typeof t.name!=='string'||!Array.isArray(t.nodes)||t.nodes.length>40||!Array.isArray(t.edges)||t.edges.length>100)throw Error('Modelo de ambiente inválido.');ids.add(t.id)}
  }
  return true;
}
export function inspect(doc){
  let warnings=[];const push=(id,text,level='warning')=>warnings.push({id,text,level});
  doc.nodes.forEach(n=>{
    if(n.type==='activity'&&!n.owner.trim())push(n.id,`“${n.title}” está sem responsável.`);
    if(n.type==='activity'&&!n.team.trim())push(n.id,`“${n.title}” está sem equipe.`);
    if(n.type==='activity'&&Number(n.duration)<=0)push(n.id,`“${n.title}” está sem duração estimada.`,'info');
  });
  doc.edges.forEach(e=>{if(e.type==='handoff'&&!e.acceptance?.trim())push(e.id,'Passagem entre equipes sem condição de aceite.','info')});
  return {warnings,totalMinutes:doc.nodes.filter(n=>n.type==='activity').reduce((a,n)=>a+(Number(n.duration)||0),0),cost:doc.nodes.filter(n=>n.type==='activity').reduce((a,n)=>a+(Number(n.cost)||0),0),activities:doc.nodes.filter(n=>n.type==='activity').length,connections:doc.edges.length};
}
const escapeXML=s=>String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const labelParts=(s,limit=29)=>{let t=String(s||'').replace(/\s+/g,' ').trim();if(t.length<=limit)return [t];const words=t.split(' '),out=[],cur=[];for(let w of words){if((cur.join(' ')+' '+w).trim().length>limit&&cur.length){out.push(cur.join(' '));cur.length=0}cur.push(w)}if(cur.length)out.push(cur.join(' '));return out.slice(0,3)};
export function svgExport(doc){validateDocument(doc);let w=canvasWidth(doc),h=canvasHeight();const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,`<rect width="100%" height="100%" fill="#f8fafc"/>`];
  doc.stages.forEach((s,i)=>{const x=stageLeft(i);parts.push(`<rect x="${x}" y="10" width="${STAGE_W}" height="${h-10}" fill="${i%2?'#f1f5f9':'#fff'}" stroke="#d6dee6"/><text x="${x+12}" y="56" fill="#2b415a" font-size="22" font-family="sans-serif">${escapeXML(s.name)}</text>`)});
  LANES.forEach((l,i)=>{let y=laneTop(l.id);parts.push(`<line x1="0" x2="${w}" y1="${y}" y2="${y}" stroke="#bfc9d4"/><text x="12" y="${y+30}" font-size="16" fill="#45556c" font-family="sans-serif">${escapeXML(l.title)}</text>`)});
  doc.edges.forEach(e=>{let a=doc.nodes.find(n=>n.id===e.from),b=doc.nodes.find(n=>n.id===e.to);parts.push(`<line x1="${a.x+NODE_W/2}" y1="${a.y+NODE_H/2}" x2="${b.x+NODE_W/2}" y2="${b.y+NODE_H/2}" stroke="${EDGE_TYPES[e.type].color}" stroke-width="3"/>`)});
  doc.nodes.forEach(n=>{parts.push(`<rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="12" fill="#fff" stroke="#344862" stroke-width="2"/>`);labelParts(n.title).forEach((t,i)=>parts.push(`<text x="${n.x+12}" y="${n.y+30+i*19}" font-size="16" font-family="sans-serif" fill="#182a43">${escapeXML(t)}</text>`));parts.push(`<text x="${n.x+12}" y="${n.y+NODE_H-12}" font-size="12" font-family="sans-serif" fill="#6c7f95">${escapeXML(n.team||CARD_TYPES[n.type].title)}</text>`)});
  return parts.join('')+'</svg>';
}
const ascii=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?').slice(0,230);
export function dxfExport(doc){validateDocument(doc);
 const chunks=['0','SECTION','2','HEADER','9','$ACADVER','1','AC1009','0','ENDSEC','0','SECTION','2','TABLES','0','ENDSEC','0','SECTION','2','ENTITIES'];let height=canvasHeight();const xy=(x,y)=>['10',String(Math.round(x)),'20',String(Math.round(height-y)),'30','0'];
 const line=(x1,y1,x2,y2,layer)=>{chunks.push('0','LINE','8',layer,...xy(x1,y1),'11',String(Math.round(x2)),'21',String(Math.round(height-y2)),'31','0')};
 const text=(x,y,s,height=13,layer='TEXT')=>chunks.push('0','TEXT','8',layer,...xy(x,y),'40',String(height),'1',ascii(s));
 const rect=(x,y,w,h,layer)=>{line(x,y,x+w,y,layer);line(x+w,y,x+w,y+h,layer);line(x+w,y+h,x,y+h,layer);line(x,y+h,x,y,layer)};
 doc.stages.forEach((s,i)=>{let x=stageLeft(i);line(x,0,x,canvasHeight(),'STAGES');text(x+15,70,s.name,19,'STAGES')});
 LANES.forEach(l=>{let y=laneTop(l.id);line(0,y,canvasWidth(doc),y,'LANES');text(10,y+30,l.title,16,'LANES')});
 doc.edges.forEach(e=>{let a=doc.nodes.find(n=>n.id===e.from),b=doc.nodes.find(n=>n.id===e.to);line(a.x+NODE_W/2,a.y+NODE_H/2,b.x+NODE_W/2,b.y+NODE_H/2,'CONNECTIONS')});
 doc.nodes.forEach(n=>{rect(n.x,n.y,NODE_W,NODE_H,'COMPONENTS');labelParts(n.title).forEach((s,i)=>text(n.x+12,n.y+24+i*19,s,15,'COMPONENTS'));text(n.x+12,n.y+NODE_H-12,n.team||CARD_TYPES[n.type].title,11,'COMPONENTS')});
 chunks.push('0','ENDSEC','0','EOF');return chunks.join('\n')+'\n';
}
export function demoDocument(){
 const doc=createDocument('Atendimento de uma clínica');doc.description='Exemplo para construir, conectar e inspecionar uma operação de serviços.';
 doc.stages.forEach((s,i)=>s.name=['Descoberta','Agendamento','Atendimento','Pós-consulta'][i]);
 const add=(type,stage,title,team,owner,xOffset=65,yOffset=35)=>{let n=addNode(doc,{type,stage,title,team,owner});n.x=stageLeft(stage)+xOffset;n.y=laneTop(n.lane)+yOffset;return n};
 add('evidence',1,'Confirmação por mensagem','','',65,30);
 add('touchpoint',1,'Solicitar horário','','',60,40);
 add('touchpoint',2,'Comparecer à consulta','','',64,40);
 const a=add('activity',1,'Confirmar agendamento','Recepção','Ana',62,42);a.duration=5;a.cost=7;
 const b=add('activity',2,'Realizar atendimento','Clínica','Profissional',57,42);b.duration=30;b.cost=68;
 const c=add('activity',3,'Enviar orientação','Pós-atendimento','Carlos',62,42);c.duration=8;c.cost=10;
 const d=add('decision',2,'Verificar prontuário','Clínica','Equipe técnica');d.duration=4;
 const r=add('system',1,'Sistema de agendamento','TI','');
 addEdge(doc,{from:a.id,to:b.id,type:'sequence'});addEdge(doc,{from:b.id,to:c.id,type:'handoff',label:'Orientações da consulta',acceptance:'Registro disponível para o pós-atendimento'});addEdge(doc,{from:d.id,to:b.id,type:'dependency'});addEdge(doc,{from:a.id,to:r.id,type:'resource'});
 const room=(name,color,icon,team)=>{const obj={id:uid(),name,color,icon,team,description:''};doc.environments.push(obj);return obj};
 const reception=room('Recepção','#1F927F','♧','Recepção'),consult=room('Consultório','#9373B4','✚','Clínica'),post=room('Relacionamento','#D0748F','♡','Pós-atendimento'),systems=room('Sistemas e apoio','#587EB7','▦','TI');
 for(const n of doc.nodes){const env=n.type==='system'?systems:n.team==='Clínica'?consult:n.team==='Pós-atendimento'?post:reception;n.environmentId=env.id;}
 return doc;
}
