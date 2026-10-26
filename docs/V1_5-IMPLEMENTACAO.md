# v1.5 — Construção 3D intuitiva

- Modelo de mobiliário: novos tipos em `app/floorplan.mjs`, sem alterar o formato persistido de `floorplan.objects`.
- Preview visual: função pura `placementFromPoint` em `app/placement.mjs`, validando sobreposição com `occupied` e divisórias com `objectCrossesStructure`. Sem efeitos colaterais durante hover.
- Editor 3D: prévia translúcida verde/vermelha, movimentação de objetos com verificação anterior ao commit, suporte a drop nativo da biblioteca, remoção no teclado, novos modelos geométricos. A simulação temporal não foi modificada.
- Editor 2D: drop da biblioteca, prévia de footprint, busca e filtragem sem consultas remotas.
- Testes: `tests/v15.test.mjs` (modelo e integridade operacional) e `tests/v15_browser.py` (UI, catálogo, drag/drop 2D, exportação, simulação, mobile). WebGL indisponível no teste de navegador local.
