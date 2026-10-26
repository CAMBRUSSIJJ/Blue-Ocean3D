# Service Builder v2.4 — Layout Híbrido

## Objetivo

Implementar a organização espacial indicada na referência visual: cabeçalho compacto com Construir/Simular, lista de ambientes reais à esquerda, estúdio central, propriedades à direita e jornada do cliente na base.

## Implementado

- Layout escuro sem o catálogo de ambientes antigos na navegação.
- Lista de ambientes do projeto na coluna esquerda, com novo ambiente no rodapé.
- Biblioteca de móveis acessível na mesma coluna pela aba Móveis.
- Editor 3D individual e modo 2D aproveitando os mesmos componentes canônicos.
- Visão geral física acessível como modo interno, sem substituir a edição individual.
- Propriedades do objeto/ambiente no painel direito, sem sobrepor a cena em desktop.
- Atividades reais agrupadas por ambiente na faixa inferior; clique abre edição.
- Controles Construir/Simular no cabeçalho, além da navegação tradicional.
- Painéis sob demanda em tablet/celular, protegendo o espaço da cena.
- Paleta visual escura. No 3D, o fundo e o piso adotam tons escuros; móveis continuam reconhecíveis.
- Nome do projeto editável no cabeçalho em telas largas.

## Compatibilidade

Dados JSON, importação, exportação, motor e eventos anteriores preservados. Os módulos do editor e simulador não foram duplicados: a interface apenas reposiciona as instâncias existentes.

## Validação

`npm test` — 194/194 em 26 de outubro de 2026.
`python3 tests/v24_browser.py` — navegacao, seleção de ambientes, jornada, modos, biblioteca, painel de propriedades e resoluções 1440×900, 1280×720, 820×1000 e 390×844.

## Limitação

O Chromium automatizado não apresentou WebGL funcional neste ambiente. A imagem de prévia mostra o fallback 2D. O código 3D é o mesmo motor da versão anterior e precisa ser verificado no navegador do usuário.
