# Service Builder v2.3.2 — Consolidação de UX

## Escopo implementado

1. O HTML referencia somente `app/styles-bundle.css`, gerado por `scripts/build-css.py` a partir dos 25 arquivos em `css-manifest.json`. A ordenação preserva a aparência herdada.
2. O novo `app/confirm-dialog.mjs` centraliza sete confirmações críticas em um `<dialog>` com foco e controle pelo teclado, mantendo as ações canceláveis.
3. Abas internas do estúdio receberam roles, estado selecionado e navegação de teclado (setas, Home, End). Os botões principais receberam estados de foco e alvos de toque ampliados.
4. HTML, metadados e servidor HTTP identificam v2.3.2.
5. `tests/inline_app.py` utiliza o **CSS de produção**, evitando divergência entre arquivos carregados e testes. Foram acrescentados `tests/v26.test.mjs` e `tests/v26_browser.py`.

## Evidências

- 189/189 testes Node passaram.
- Teste no Chromium em memória passou com 1440×900, 1280×720, 820×960 e 390×844; abertura de confirmação, cancelamento, Esc, aceitação e navegação de abas.
- Servidor local responde HTTP 200 e indica `X-Service-Builder-Version: 2.3.2`.
- O Chromium automatizado não consegue acessar `localhost` por política do ambiente e o WebGL 3D permanece sem confirmação visual.

## Não realizado nesta versão

- Refatoração manual de todas as regras redundantes/`!important` e remoção integral das views legadas.
- Auditoria WCAG completa com leitor de tela e testes táteis em hardware real.
- Alteração do cálculo operacional ou da geometria 3D.
