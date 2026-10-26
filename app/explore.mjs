/** Service Builder v0.3 — read-only projections of the canonical service model. */
import {CARD_TYPES,EDGE_TYPES,LANES,inspect,validateDocument} from './core.mjs';

export const EXPLORE_VIEWS = [
  {id:'stages',label:'Por etapas',icon:'▤',desc:'Acompanhe a entrega do começo ao fim.'},
  {id:'teams',label:'Por equipes',icon:'♧',desc:'Descubra quem executa cada parte.'},
  {id:'dependencies',label:'Dependências',icon:'◇',desc:'Veja o que precisa acontecer primeiro.'},
  {id:'resources',label:'Recursos',icon:'▦',desc:'Relacione sistemas, ferramentas e atividades.'},
];
export const RELATION_FILTERS = [
  {id:'auto',label:'Relevantes à visão'}, {id:'all',label:'Todas'},
  ...Object.entries(EDGE_TYPES).map(([id,def])=>({id,label:def.title}))
];
export const fold = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
const uniq = xs => [...new Set(xs)];
function groupId(view,node,doc,levels,involved){
  if(view==='stages')return `stage:${node.stage}`;
  if(view==='teams')return `team:${node.team?.trim()||'Sem equipe'}`;
  if(view==='dependencies')return involved.has(node.id)?`level:${Math.min(levels.get(node.id)||0,12)}`:'level:other';
  if(view==='resources')return ['system','resource'].includes(node.type)?'resources':node.type==='activity'?'activities':'supporting';
  return 'other';
}
function dependencyLevels(nodes,edges){
  const ids=new Set(nodes.map(x=>x.id)),involved=new Set();const graph=new Map(nodes.map(x=>[x.id,[]])),incoming=new Map(nodes.map(x=>[x.id,0]));
  for(const e of edges){if(e.type!=='dependency'||!ids.has(e.from)||!ids.has(e.to))continue;involved.add(e.from);involved.add(e.to);graph.get(e.from).push(e.to);incoming.set(e.to,incoming.get(e.to)+1)}
  let queue=nodes.filter(n=>incoming.get(n.id)===0).map(n=>n.id),levels=new Map(nodes.map(n=>[n.id,0])),read=0;
  while(read<queue.length){let id=queue[read++];for(let next of graph.get(id)){levels.set(next,Math.max(levels.get(next)||0,(levels.get(id)||0)+1));incoming.set(next,incoming.get(next)-1);if(incoming.get(next)===0)queue.push(next)}}
  return {levels,involved};
}
function makeGroups(view,nodes,doc,levels,involved){
  if(view==='stages')return doc.stages.map((s,i)=>({id:`stage:${i}`,label:s.name,kicker:`ETAPA ${String(i+1).padStart(2,'0')}`}));
  if(view==='teams')return uniq(nodes.map(n=>n.team?.trim()||'Sem equipe')).sort((a,b)=>a==='Sem equipe'?1:b==='Sem equipe'?-1:a.localeCompare(b,'pt-BR')).map(v=>({id:`team:${v}`,label:v,kicker:'EQUIPE'}));
  if(view==='dependencies')return [...uniq(nodes.filter(n=>involved.has(n.id)).map(n=>Math.min(levels.get(n.id)||0,12)))].sort((a,b)=>a-b).map(level=>({id:`level:${level}`,label:level===0?'Ponto de partida':`Após ${level} dependência${level===1?'':'s'}`,kicker:'ORDEM LÓGICA'})).concat(nodes.some(n=>!involved.has(n.id))?[{id:'level:other',label:'Sem dependência',kicker:'INDEPENDENTES'}]:[]);
  return [
    {id:'resources',label:'Sistemas e recursos',kicker:'INFRAESTRUTURA'},
    {id:'activities',label:'Atividades',kicker:'EXECUÇÃO'},
    {id:'supporting',label:'Demais peças',kicker:'CONTEXTO'}
  ];
}
const defaultRelation = {stages:'all',teams:'handoff',dependencies:'dependency',resources:'resource'};
export function exploreProjection(doc, options={}){
  validateDocument(doc);
  const view=EXPLORE_VIEWS.some(v=>v.id===options.view)?options.view:'stages';
  const relation=RELATION_FILTERS.some(v=>v.id===options.relation)?options.relation:'auto';
  const actualRelation=relation==='auto'?defaultRelation[view]:relation;
  const search=fold(options.search),stage=options.stage??'all',team=options.team??'all';
  const selected=options.selected||null, onlyRelated=!!options.onlyRelated;
  const byId=new Map(doc.nodes.map(n=>[n.id,n]));
  const related=new Set([selected]);
  for(const edge of doc.edges){if(edge.from===selected)related.add(edge.to);if(edge.to===selected)related.add(edge.from)}
  const nodes=doc.nodes.filter(n=>(stage==='all'||String(n.stage)===String(stage))&&(team==='all'||(n.team?.trim()||'Sem equipe')===team)
    &&(!search||fold([n.title,n.description,n.owner,n.team,n.channel,n.rules,n.resourceNotes,CARD_TYPES[n.type]?.title,doc.stages[n.stage]?.name].join(' ')).includes(search))
    &&(!onlyRelated||!selected||related.has(n.id)));
  const visible=new Set(nodes.map(n=>n.id));
  const edges=doc.edges.filter(e=>visible.has(e.from)&&visible.has(e.to)&&(actualRelation==='all'||e.type===actualRelation));
  const {levels,involved}=dependencyLevels(doc.nodes,doc.edges);
  const groups=makeGroups(view,nodes,doc,levels,involved).map(g=>({...g,nodes:[]}));
  const byGroup=new Map(groups.map(g=>[g.id,g]));
  for(const n of nodes){const id=groupId(view,n,doc,levels,involved);byGroup.get(id)?.nodes.push(n)}
  // Empty stages remain visible so their operational gaps are understandable.
  const shownGroups=view==='stages'?groups:groups.filter(g=>g.nodes.length);
  const warnings=inspect(doc).warnings;
  const focus=selected&&byId.has(selected)?byId.get(selected):null;
  const connected=focus?doc.edges.filter(e=>e.from===selected||e.to===selected):[];
  const downstream=new Set();if(selected){const q=[selected];let i=0;while(i<q.length){const id=q[i++];for(const e of doc.edges.filter(e=>e.from===id)){if(!downstream.has(e.to)&&e.to!==selected){downstream.add(e.to);q.push(e.to)}}}}
  const teamNames=uniq(doc.nodes.map(n=>n.team?.trim()||'Sem equipe')).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  return {view,relation,actualRelation,groups:shownGroups,nodes,edges,focus,connected,downstream:[...downstream],total:{nodes:doc.nodes.length,edges:doc.edges.length},stats:{activities:doc.nodes.filter(n=>n.type==='activity').length,teams:teamNames.filter(x=>x!=='Sem equipe').length,resources:doc.nodes.filter(n=>['resource','system'].includes(n.type)).length,handoffs:doc.edges.filter(e=>e.type==='handoff').length,warnings:warnings.length},warnings,teams:teamNames,selectedVisible:selected?visible.has(selected):false};
}
export function graphLayout(projection){
  const groupWidth=290,gap=22,left=26,top=82,cardW=256,cardH=91,step=111;
  const height=Math.max(440,top+Math.max(1,...projection.groups.map(g=>g.nodes.length))*step+38);
  const width=Math.max(730, left*2+projection.groups.length*(groupWidth+gap)-gap);
  const positions=new Map();const groups=projection.groups.map((g,i)=>{
    const x=left+i*(groupWidth+gap),cards=g.nodes.map((n,j)=>{let p={id:n.id,x:x+17,y:top+j*step,w:cardW,h:cardH,node:n};positions.set(n.id,p);return p});
    return {...g,x,width:groupWidth,cards};
  });
  const links=projection.edges.map(e=>({edge:e,from:positions.get(e.from),to:positions.get(e.to)})).filter(e=>e.from&&e.to);
  return {width,height,groups,links,positions};
}
export function exploreReportCsv(doc,projection){
 const quote=v=>{const value=String(v??'').replace(/[\r\n]+/g,' ');const safe=/^\s*[=+@-]/.test(value)?'\''+value:value;return '"'+safe.replace(/"/g,'""')+'"'};
 const rows=[['ID','Componente','Tipo','Etapa','Camada','Equipe','Responsável','Tempo estimado (min)','Custo informado (R$)','Conexões na visão']];
 for(const n of projection.nodes){const related=projection.edges.filter(e=>e.from===n.id||e.to===n.id).length;rows.push([n.id,n.title,CARD_TYPES[n.type].title,doc.stages[n.stage]?.name,LANES.find(l=>l.id===n.lane)?.title,n.team,n.owner,n.duration,n.cost,related]);}
 return '\uFEFF'+rows.map(row=>row.map(quote).join(';')).join('\r\n')+'\r\n';
}
