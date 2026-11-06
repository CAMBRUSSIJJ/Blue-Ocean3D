# Auditoria UX — conferência dos 18 itens

Conferência do checkout atual contra os dois documentos enviados pelo usuário.
Os estados abaixo descrevem o código e os testes desta revisão; as referências
a PRs nos anexos não foram usadas como prova de que uma correção estava presente.
As alterações do tema Blue Ocean Light feitas anteriormente foram preservadas.

| Item | Situação nesta revisão | Resultado |
| --- | --- | --- |
| 1. CSS conflitante | Corrigido | Manifesto declara a ordem das camadas CSS; componentes não usam `!important`. Tokens e componentes compartilhados têm a última camada. |
| 2. Inspetor 2D | Reforçado | O markup e os grupos acessíveis já estavam corrigidos. Sem seleção, há instrução contextual; controles de objeto só aparecem após selecionar um móvel. |
| 3. Arraste de salas | Corrigido | Toda a miniatura responde. Captura fica no contêiner estável; prévia valida colisões, corredores e limites sem modificar o projeto. Escape, cancelamento e perda de captura preservam a posição. |
| 4. Jornada real | Reforçado | A ordem por `sequence`, `dependency` e `handoff` e a ausência de truncamento já existiam. Componentes bloqueados por ciclos agora têm nível indefinido, sem inventar precedência. |
| 5. Alça de resize 3D | Já resolvido; validado | Continua contextual, para seleção/hover ou arraste ativo; atalhos, seleção e foco de câmera continuam funcionando. |
| 6. Biblioteca reabrindo | Corrigido | Trocar entre 2D, 3D e simulação preserva a escolha da biblioteca; foram removidos fechamentos automáticos por largura e entrada na área. O recolhimento dos docks continua persistido. |
| 7. Cabeçalhos sobrepostos | Corrigido | Cabeçalhos dos docks distribuem abas e controles em linhas separadas; nomes longos ficam contidos. A miniatura física não contém botão de edição: a ação está no inspetor do ambiente. |
| 8. Criação no editor errado | Corrigido | No fluxo atual, criar salas na planta ou nas atividades mantém o planejamento. O 3D abre por ação explícita. Criação iniciada no editor continua abrindo a sala em 3D. Veja PLANEJAMENTO_SERVICO_E_3D.md. |
| 9. Hierarquia de ações | Corrigido | Criar ambiente é a ação principal da toolbar. Adicionar atividade, mobiliar e cancelar seleção ficam em “Mais”, com os mesmos nós, IDs e handlers. |
| 10. Ferramentas 2D no 3D | Corrigido | As ferramentas estruturais 2D só aparecem na planta 2D; os objetos da biblioteca continuam disponíveis nos dois editores. |
| 11. Inspetor expandido | Corrigido | Dimensões, posição e ajuste fino começam recolhidos; escolhas de expansão continuam preservadas durante a sessão do editor. |
| 12. Jornada alta | Corrigido | Prévia compacta de 132 px no desktop e 160 px no celular, expansível. Todos os componentes continuam no DOM e podem ser percorridos horizontalmente. |
| 13. Altura fora de contexto | Corrigido | O controle 3D só aparece com a ferramenta Parede ativa. Na planta 2D, a altura fica no contexto de construção de paredes. |
| 14. Conexão A→B | Corrigido | Modo “Conectar salas” permite escolher origem e destino pela miniatura ou pelo teclado, com marcação e confirmação explícita. Formulário avançado começa recolhido. |
| 15. Inspetor de sala | Corrigido | Selecionar sala na visão geral limpa seleção de móveis e mostra nome, área estimada, atividades, conexões e móveis do ambiente, com acesso ao editor 3D. |
| 16. Tema escuro/verde | Já resolvido; mantido | Blue Ocean Light e a cena 3D clara permanecem ativos. Esta revisão não constitui certificação completa de acessibilidade ou contraste. |
| 17. Muitas requisições CSS | Já resolvido; mantido | Continua uma única folha carregada. `npm run build:css` gera o bundle a partir do manifesto e valida as fontes. |
| 18. `confirm()` nativo | Já resolvido; validado | Diálogos próprios permanecem ativos; foco inicial no botão de cancelamento e Escape foram exercitados sem excluir dados. |

## Organização dos estilos

`app/css-manifest.json` é a ordem canônica. O gerador envolve cada fonte em uma
camada nomeada, preservando sua sequência e tornando explícita a precedência
entre versões históricas e componentes atuais. As regras atuais de UX ficam em
`app/ux-audit.css`; os tokens e componentes compartilhados ficam na camada final
de `app/blue-ocean-light.css`.

Não há `!important` nas fontes CSS. O bundle contém apenas uma exceção semântica,
gerada ao final: `[hidden] { display: none !important; }`. Ela protege diálogos,
campos e painéis ocultos contra declarações de `display`, incluindo estilos
inline. O gerador rejeita a reintrodução de `!important` em componentes.

O manifesto inclui as fontes de modos legados ainda presentes no produto; esta
mudança não afirma eliminar todo CSS sem uso nem reduzir o tamanho do payload.
As camadas CSS exigem um navegador moderno com suporte a `@layer`.

## Validação

- `npm run build:css`: geração do bundle.
- `npm test`: 30 arquivos de testes Node aprovados, incluindo prévia geométrica
  sem mutação, bloqueio de colisão/corredor e ciclos na jornada.
- `python3 tests/ux_audit_browser.py`: módulos reais via HTTP, WebGL, criação,
  estados dos painéis, propriedades, menus, confirmação de exclusão cancelada,
  cards, arraste, colisão, Escape, conexão física e telas de 1366, 820 e 390 px.
- Regressões existentes: `workspace_browser.py`, `p2_room3d_browser.py`,
  `p3_journey_browser.py`, `p4_professional_browser.py` e `v28_browser.py`.
- `node scripts/build-vercel.mjs` e `p4_deployment_browser.py`: arquivos estáticos
  e rotas `/` e `/app/` com o editor e seus recursos.

Os testes de navegador usaram o Chromium instalado em `/usr/bin/chromium` e
renderização WebGL por software. Nos testes antigos que dependem do executável
gerenciado pelo Playwright, o launcher foi configurado para esse Chromium sem
alterar suas verificações. Não foi necessário instalar ou acionar um modelo
Ollama: o teste de propostas usa respostas simuladas.
