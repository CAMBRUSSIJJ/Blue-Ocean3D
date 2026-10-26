# V1.9 — Entrega técnica

## Escopo

- Redimensionamento individual dos móveis com `width` e `height` opcionais no `floorplan.objects` (células da grade 12×8).
- Compatibilidade com documentos antigos sem dimensões personalizadas: o catálogo e a rotação continuam determinando o tamanho padrão.
- `resizeFurniture` valida dimensões inteiras, limites, colisões com móveis e divisórias; não altera parcialmente os dados em falha.
- `moveFurnitureGroup` e `removeFurnitureGroup` operam sobre uma seleção sem duplicatas, validando colisões externas de forma atômica.
- `duplicateFurniture`, `placementFromPoint`, planta 2D, cena 3D e simulador 3D utilizam as mesmas dimensões personalizadas.
- Traços contínuos de parede, porta e passagem com `paintStructureLine`, validando os segmentos antes de salvar.
- Painel de inspeção do objeto com dimensões em células e referência à escala em metros por célula.
- Shift+clique na planta 2D e no 3D para selecionar vários objetos; nudge e exclusão em grupo.
- Sem alterações no motor temporal, eventos, dependências ou capacidade das equipes.

## Validações

- 152 testes automatizados de modelo e regressão aprovados no Node.js.
- Teste do navegador v1.9: versão visível, apenas 2 abas principais, ausência de catálogo fixo, redimensionamento, seleção múltipla, simulação, layout móvel.
- Chromium automatizado sem contexto WebGL: renderização visual 3D **não verificada**. Apenas modelo e lógica JavaScript, além do fallback 2D, foram validados localmente.

## Comportamento intencional

- Redimensionamento via campos numéricos, não alças livres.
- A seleção múltipla move um conjunto por vez; um objeto não pode ultrapassar limites, paredes ou móveis não selecionados.
- O desenho de divisórias contínuas ocorre numa mesma linha reta da grade, não em curva.
- Móveis redimensionados alteram a representação física e os espaços de circulação, mas **não** as durações ou custos operacionais.
