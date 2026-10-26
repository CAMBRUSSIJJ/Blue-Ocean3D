# Service Builder v1.8 — Relatório de implementação

## Escopo

- Duas abas principais mantidas: Ambientes e Simulação.
- Construtor de **uma sala por vez**, tela ampla, biblioteca e propriedades sobrepostas.
- Barra de ferramentas estruturais no 3D (parede, porta, passagem livre) gravada nas mesmas arestas da planta 2D.
- Aproximação da linha da grade por aresta (com tolerância de 0,35 célula), prévia verde/vermelha, rejeição de interseções com móveis.
- Posição numérica, comandos de ajuste de uma célula, duplicação segura e atalhos no modo 3D.
- Duplicação não replica nodeId e preserva tipo e rotação.
- Controle por teclado respeita campos de entrada e impede movimentação fora do limite da planta.
- Modelo operacional preservado sem incorporar tempos de deslocamento.

## Arquivos relevantes

- `app/studio-actions.mjs`: regras puras de manipulação e de validação do segmento.
- `app/room3d.mjs`: ferramentas de construção e teclas no visualizador WebGL.
- `app/floorplan-ui.mjs`: controles precisos e duplicação no painel compartilhado.
- `app/v18.css`: estilos do painel de manipulação e barra 3D.
- `app/index.html`: botões e versão da interface.
- `tests/v18.test.mjs` e `tests/v18_browser.py`: verificações adicionais.

## Verificações

- Suíte com 138 testes em Node.js aprovada.
- Navegador em modo 2D alternativo: versão, edição e duplicação, validação numérica, navegação para Simular Serviço e layout de 390 px aprovados.
- Inicialização por `scripts/server.py` e resposta HTTP confirmadas via cliente HTTP (`X-Service-Builder-Version: 1.8.0`).
- O Chromium automatizado não conseguiu criar o contexto WebGL, portanto renderização e interações 3D não foram validadas visualmente nesta máquina. Validar no navegador Linux do usuário.

## Limites conhecidos

- Os móveis possuem footprint fixo (1×1, 2×2, etc.) em células. O zoom altera a câmera, não o tamanho do objeto.
- As regras de colisão das paredes são relativas a segmentos inteiros da grade e não fazem análise geométrica contínua por triângulos.
- Não existe simulação temporal do deslocamento; a representação espacial permanece ilustrativa.
