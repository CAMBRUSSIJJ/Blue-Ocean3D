# Service Builder v2.0 — Notas de implementação

## Escopo

- `app/site-overview.mjs`: modo de visão geral esquemática, dados persistentes de posição por sala (`floorplan.roomPositions`), validação de sobreposição e detecção de duas portas coincidentes.
- `app/v20.css`: layout do modo geral e alça de redimensionamento 2D.
- `app/floorplan-ui.mjs`: redimensionamento direto pela alça no canto da seleção. Prévia informa colisão e posição inválida. Modelo canônico preservado.
- `app/room3d.mjs`: alça de dimensão 3D e prévia colorida na malha. Mudanças só são gravadas após validar `resizeFurniture`. O mesmo documento alimenta os modos 2D e 3D.
- `app/environments-ui.mjs`: visão geral como modo interno adicional, nunca uma nova aba principal. Editor de cada sala continua em tela ampla.
- `app/floorplan.mjs`: remove posições de salas excluídas durante reconciliação.
- `tests/v20.test.mjs`: validação de salas e portas; regressão de resultados do motor operacional.
- `tests/v20_browser.py`: navegação, cena global, retorno à sala, editor 2D, interação de alça, simulação e layout móvel.

## Modelo de conectividade

Para que a conexão de uma sala A com uma sala B tenha passagem física marcada como alinhada, a disposição da planta global precisa torná-las adjacentes (fronteiras inteiras ou parcialmente em contato) e ambas devem ter portas com a mesma coordenada na parede compartilhada. O algoritmo **não** verifica rotas dentro das salas nem circulação de corredor comum, e não habilita automaticamente trajetos dos personagens entre salas. É uma auditoria preliminar, não um simulador de evacuação ou acessibilidade.

## Validação

160 testes automatizados Node.js passaram. O navegador automatizado sem WebGL confirmou funcionamento da visão geral, editor 2D, seleção/alça, troca para simulação e responsividade. A renderização 3D e sua alça não puderam ser verificadas visualmente no navegador automatizado.
