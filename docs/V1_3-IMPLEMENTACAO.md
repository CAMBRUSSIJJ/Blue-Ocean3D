# v1.3 — Estúdio 3D de um ambiente por vez

## Escopo entregue

- Apenas duas abas principais: Ambientes de Serviço / Simular Serviço.
- Navegação **interna** por ambientes, com uma sala editável por vez.
- Modo 3D por sala baseado em Three.js local; perspectiva ortográfica isométrica, paredes/portas do modelo existente, móveis 3D simplificados e controles de câmera.
- Inserção, seleção e movimentação de móveis pelo mouse em 3D, usando `putFurniture` e `moveFurniture` canônicos com validação de colisão e paredes.
- Modo 2D individual preservado, inclusive dimensões, paredes, portas, obstáculos e vinculação com atividades.
- Painel de atividades da sala selecionada, configuração de equipe, custo, duração e relações no diálogo existente.
- Mobiliar automaticamente restrito ao ambiente atual.
- Modo de fluxo geral preservado como visão secundária.
- Fallback automático 3D→2D quando WebGL indisponível.
- Motor determinístico, exportação/importação JSON, persistência e animação 2D global mantidos.

## Limites

O 3D é um construtor espacial, não um simulador físico em 3D. A renderização dos móveis é geométrica/estilizada, sem modelos 3D detalhados ou texturas externas. Salas são independentes, cada uma em grade 12×8. Deslocamentos físicos não alteram as métricas operacionais. O teste automatizado de navegador não pôde criar WebGL no Chromium deste ambiente; a recuperação 2D foi testada.

## Verificação

- `node --test tests/*.test.mjs` — 108 testes aprovados.
- `python3 tests/v13_browser.py` — passou em navegação individual, escala, edição de atividades, exportação, simulação e viewport móvel.
