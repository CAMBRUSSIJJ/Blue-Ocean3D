/** v0.6 — Ferramentas de autoria: lógica pura (sem DOM), testável em Node. */
export const TOOLS=[
  {id:'select',title:'Selecionar e mover',key:'V',icon:'↖',hint:'Clique para escolher, arraste para mover'},
  {id:'pan',title:'Mover o cenário',key:'H',icon:'✥',hint:'Arraste o fundo para passear pelo mapa'},
  {id:'connect',title:'Conectar peças',key:'C',icon:'↗',hint:'Arraste de uma peça até outra'},
  {id:'delete',title:'Apagar',key:'X',icon:'⌫',hint:'Clique numa peça ou linha (Ctrl+Z desfaz)'}
];
export const SHORTCUTS=[
  ['V · H · C · X','Selecionar · Mover cenário · Conectar · Apagar'],
  ['Ctrl+K','Abrir a paleta de comandos'],
  ['Duplo clique no vazio','Criar peça ali (menu rápido)'],
  ['Duplo clique na peça','Renomear no próprio cartão'],
  ['Arrastar a bolinha ●','Conectar; soltar no vazio cria peça nova já ligada'],
  ['Setas','Mover a peça selecionada na grade (16 px)'],
  ['Ctrl+D','Duplicar a peça selecionada'],
  ['Delete','Excluir seleção'],
  ['Ctrl+Z · Ctrl+Y','Desfazer · Refazer'],
  ['F','Ajustar o cenário à tela'],
  ['Esc','Cancelar a ação atual e voltar a Selecionar']
];
const HANDOFF_TYPES=['activity','decision'];
/** Sugere o tipo de conexão mais provável ao ligar duas peças (o usuário pode trocar depois). */
export function inferRelation(doc,fromId,toId){
  const a=doc.nodes.find(n=>n.id===fromId),b=doc.nodes.find(n=>n.id===toId);
  if(!a||!b||a.id===b.id)return null;
  const options=[];
  if(['resource','system'].includes(b.type))options.push({type:'resource',label:''});
  if(a.team&&b.team&&a.team!==b.team&&HANDOFF_TYPES.includes(a.type)&&HANDOFF_TYPES.includes(b.type))options.push({type:'handoff',label:`Entrega de “${a.title}”`});
  options.push({type:'sequence',label:''});
  return options.find(o=>!doc.edges.some(e=>e.from===a.id&&e.to===b.id&&e.type===o.type))||null;
}
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
/** Busca tolerante a acentos; todos os termos precisam aparecer; títulos que começam com o 1º termo vêm antes. */
export function filterCommands(list,query,max=12){
  const terms=norm(query).split(/\s+/).filter(Boolean);
  if(!terms.length)return list.slice(0,max);
  return list.map(c=>{const label=norm(c.label),hay=label+' '+norm(c.keywords);return terms.every(t=>hay.includes(t))?{c,s:label.startsWith(terms[0])?2:label.includes(terms[0])?1:0}:null})
    .filter(Boolean).sort((x,y)=>y.s-x.s).map(x=>x.c).slice(0,max);
}
