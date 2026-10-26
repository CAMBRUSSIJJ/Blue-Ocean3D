# Service Builder — Plano de estabilização UX

**Base auditada:** `Service-CAD-Builder-v2_3-UX.zip`  
**Entrega corretiva:** `2.3.1` — 25/10/2026  
**Escopo:** manter somente **Ambientes de Serviço** e **Simular Serviço**, com construção individual e simulação integrada.

## Critérios de priorização

- **P0 (bloqueador):** impede preservar dados, simular ou recuperar erro sem solução clara.
- **P1 (alto):** interfere com operação frequente, reduz visibilidade ou causa sobreposição.
- **P2 (médio):** consistência visual, acessibilidade, linguagem e produtividade.
- **P3 (evolutivo):** arquitetura e limpeza de legado, sem alteração de cálculo.

| ID | Prioridade | Problema | Intervenção | Status na 2.3.1 | Verificação |
|---|---|---|---|---|---|
| UX-01 | P0 | Salvamento oculto abaixo de 1370 px | Indicador sempre visível e backup acessível | Aplicado | Browser 4 larguras; cenário sem armazenamento |
| UX-02 | P0 | Caminhada falha sem corredores e não indica recuperação | Mostrar diagnóstico e ações para editar circulação ou seguir sem caminhada | Aplicado | Teste de navegador e cálculo herdado |
| UX-03 | P1 | Escala 0,75 m/célula no ambiente vs 1 m na simulação | Inicializar a hipótese com a escala do ambiente; avisar quando forem distintas | Aplicado | Teste de valor inicial e mudança de modo |
| UX-04 | P1 | Biblioteca, objeto e configurações se sobrepõem | Painéis flutuantes mutuamente exclusivos; fechar ao trocar sala/modo | Aplicado | Fluxo de interação em navegador |
| UX-05 | P1 | Estúdio 3D pequeno ou coberto por toolbars | Reposicionar barra de construção, dimensões e controles; compactar interface | Aplicado parcialmente | Quatro tamanhos; WebGL visual não verificado |
| UX-06 | P1 | Cabeçalhos e rodapés sobrepostos na planta geral | Conter etiquetas dentro dos limites da sala | Aplicado | Revisão visual de CSS; teste de navegação |
| UX-07 | P1 | Barra fixa de reprodução oculta conteúdo | Barra em fluxo normal | Aplicado | CSS e browser |
| UX-08 | P1 | Patch v24.css não carregado nos testes | Importar v24 e v25 no carregador in-memory | Aplicado | Verificação de CSS em runtime |
| UX-09 | P2 | Controles de toque reduzidos | Mínimos de 40 px nos principais controles de construção e câmera | Parcial | CSS; auditoria completa pendente |
| UX-10 | P2 | Textos truncados e termos inconsistentes | Revisar conteúdo e nomenclatura de atividade/objeto/posto | Pendente | Necessário roteiro de copy UX |
| UX-11 | P2 | `confirm()` nativo e criação de atividade indireta | Padronizar diálogos internos e formulários contextuais | Pendente | Fluxos de exclusão não alterados |
| UX-12 | P2 | Abas sem semântica ARIA completa | `tablist/tab/aria-selected`, teclado e foco gerenciado | Pendente | Requer teste por leitor de tela |
| UX-13 | P2 | Cenas de exemplo calculadas sem explicar estado da simulação | Estado de cenário inicial e sinalização de resultados anteriores | Pendente | Exige revisão do onboarding |
| UX-14 | P3 | 23+ CSS cumulativos e muitas regras `!important` | Consolidar tokens/estilos e remover conflitos com screenshots de regressão | Pendente | Não seguro fazer sem cobertura visual ampla |
| UX-15 | P3 | Editor/Explorar/CadCraft antigos ainda no DOM | Remoção progressiva após análise de dependências | Pendente | Não realizar remoção cega |
| UX-16 | P2 | Menu antigo e rótulo da planta v2.1 | Atualizar o rótulo visível para 2.3.1 | Aplicado | Inspeção do código e navegador |

## O que foi comprovado

1. **185 testes de modelo/regressão passaram** via `npm test`.
2. O teste `python3 tests/v25_browser.py` percorreu 1440x900, 1280x720, 820x960 e 390x844; verificou visibilidade do salvamento, área editável, painéis exclusivos, escala padrão e recuperação de rota.
3. O carregador de testes in-memory agora inclui `v24.css` e `v25.css`, mantendo a sequência do HTML.
4. O motor operacional é herdado da v2.3, sem mudar o cálculo temporal padrão.

## Limitações e riscos residuais

- O Chromium de validação executou o app em memória: o acesso a `localStorage` foi negado, o que permitiu verificar o banner de erro, mas não comprova persistência normal no Firefox do usuário.
- O WebGL não foi validado visualmente. As capturas representam o fallback 2D; movimento e manipulação 3D ainda exigem validação manual na máquina do usuário.
- Não houve teste de toque real nem execução de leitores de tela.
- A pilha de folhas CSS e as views antigas continuam presentes. O novo `v25.css` é uma camada corretiva temporária, não a consolidação definitiva do design system.
- O fluxo de confirmação nativa e a nova atividade via painel continuam legados. Demandam um ciclo separado para evitar regressões no CRUD.

## Próximos incrementos recomendados

**2.3.2 — Estabilização de interações (P1/P2):** formulário de atividade contextual, diálogos consistentes, labels de controles, layout de linha do tempo e tratamento de estado "resultados desatualizados".

**2.4 — Design system e acessibilidade (P2/P3):** consolidar CSS, tokens, tipografia mínima, controles >=44 px em touch, abas semânticas e testes keyboard/screen reader.

**2.5 — Consolidação estrutural (P3):** remover views não acessíveis, recuperar responsabilidades dos módulos e garantir testes ponta a ponta usando o pacote de produção.

## Checklist de aceite manual

1. Abrir no Firefox Linux a 1366x768 e 1280x720: verificar que a planta ocupa área útil e que o indicador de salvamento aparece.
2. Reduzir a janela para 390 px: conferir botões, barra inferior, painéis e ausência de rolagem horizontal da página.
3. Forçar bloqueio de armazenamento no navegador: verificar botão de backup e exportação JSON efetiva.
4. Ativar caminhada sem corredores: conferir alerta; usar **Abrir Visão geral física**; conectar fluxo; recalcular.
5. Abrir biblioteca, objeto e configurar ambiente em sequência: no máximo um painel aberto.
6. Entrar e sair das salas com móveis associados: posições, vínculos e portas preservados.
7. Verificar o 3D em Firefox com WebGL ativo; inspecionar sobreposição das barras e arrastar móveis.
8. Exportar JSON, fechar app e importar novamente. Comparar ambientes, corredores e resultado operacional padrão.
