/**
 * P7.2 — Orientação contextual sem impor um assistente de etapas.
 * A fonte única de verdade continua sendo o documento e o estado do editor.
 */
export function describeFlow(doc, display, selectedId) {
  const rooms = Array.isArray(doc?.environments) ? doc.environments : [];
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : [];
  const edges = Array.isArray(doc?.edges) ? doc.edges : [];
  const room = rooms.find(item => item.id === selectedId) || rooms[0] || null;
  const noRoom = {
    title: 'Comece criando um ambiente',
    description: 'Crie um espaço vazio ou escolha um modelo. O editor abrirá esse ambiente automaticamente.',
    primary: ['create-room', 'Criar ambiente'],
    secondary: null
  };
  if (display !== 'overview' && !room) return noRoom;
  if (display === 'overview') return rooms.length ? {
    title: 'Organize os espaços do serviço',
    description: 'Mova as salas na planta e desenhe corredores quando precisar. Abra uma sala para editar seu interior.',
    primary: ['create-room', 'Novo ambiente'],
    secondary: ['open-room', 'Abrir ambiente 3D']
  } : noRoom;
  if (display === 'three') return {
    title: 'Configure ' + room.name,
    description: 'Trabalhe em um ambiente de cada vez. Escolha móveis na biblioteca e arraste-os pela cena.',
    primary: ['furniture', 'Adicionar móveis'],
    secondary: ['new-activity', 'Nova atividade']
  };
  if (display === 'visual') return {
    title: 'Edite a planta de ' + room.name,
    description: 'Use paredes, portas e passagens para definir a circulação física deste ambiente.',
    primary: ['building-tools', 'Ferramentas de construção'],
    secondary: ['open-room', 'Voltar ao 3D']
  };
  if (display === 'cards') {
    if (!nodes.length) return {
      title: 'Descreva o funcionamento do serviço',
      description: 'Registre a primeira atividade. Depois conecte as ações para definir a sequência do atendimento.',
      primary: ['new-activity', 'Criar atividade'],
      secondary: null
    };
    const connected = edges.filter(edge => ['sequence', 'dependency', 'handoff'].includes(edge.type)).length;
    if (nodes.length < 2) return {
      title: 'Adicione o próximo passo do atendimento',
      description: 'Uma segunda atividade permite criar a primeira conexão do fluxo.',
      primary: ['new-activity', 'Nova atividade'],
      secondary: null
    };
    if (!connected) return {
      title: 'Conecte as atividades do serviço',
      description: 'Abra uma atividade e selecione seu próximo passo. A sequência também orientará a simulação.',
      primary: ['connect-activity', 'Conectar atividades'],
      secondary: ['new-activity', 'Nova atividade']
    };
    return {
      title: 'Fluxo definido — revise ou simule',
      description: connected + ' conexão(ões) de execução cadastrada(s). Confira alertas antes de executar o cenário.',
      primary: ['simulate', 'Simular serviço'],
      secondary: ['new-activity', 'Nova atividade']
    };
  }
  return noRoom;
}

export function mountFlowBar({root, getDocument, getDisplay, getSelected, onAction}) {
  const bar = document.createElement('section');
  bar.className = 'p72-context';
  bar.setAttribute('aria-label', 'Ação principal desta área');
  bar.innerHTML = '<div class="p72-context-copy"><strong class="p72-context-title"></strong><p class="p72-context-description"></p></div><div class="p72-context-actions"><button type="button" class="p72-primary" data-p72-action=""></button><button type="button" class="p72-secondary" data-p72-action="" hidden></button></div>';
  root.querySelector('.rooms-shell').before(bar);
  bar.addEventListener('click', event => {
    const button = event.target.closest('[data-p72-action]');
    if (button && button.dataset.p72Action) onAction(button.dataset.p72Action);
  });
  function render() {
    const state = describeFlow(getDocument(), getDisplay(), getSelected());
    bar.querySelector('.p72-context-title').textContent = state.title;
    bar.querySelector('.p72-context-description').textContent = state.description;
    const primary = bar.querySelector('.p72-primary');
    primary.dataset.p72Action = state.primary[0];
    primary.textContent = state.primary[1];
    const secondary = bar.querySelector('.p72-secondary');
    secondary.hidden = !state.secondary;
    if (state.secondary) {
      secondary.dataset.p72Action = state.secondary[0];
      secondary.textContent = state.secondary[1];
    } else {
      secondary.dataset.p72Action = '';
      secondary.textContent = '';
    }
  }
  render();
  return {render};
}
