# Service Builder v2.6 — Copiloto Ollama e Construção Completa

Abra **WINDOWS-LEIA-PRIMEIRO.txt** para Windows 10/11 e **docs/V2_6-AGENTE-CONSTRUCAO-WINDOWS.md** para detalhes.

- **Windows**: extraia o ZIP; entre em `service-cad-lab`; abra `INICIAR-WINDOWS.bat` (Python 3.9+).
- **Linux**: `chmod +x scripts/start.sh && ./scripts/start.sh` (Python 3.9+).
- Depois acesse `http://localhost:4173/app/`.
- **Ollama opcional**: instale o Ollama no computador e execute `ollama pull qwen3:4b`. O programa funciona sem ele, mas o chat exige um modelo disponível.
- Para migrar de Linux para Windows, exporte o projeto em JSON no Linux e importe no Windows.

O copiloto propõe mudanças, não executa automaticamente. Confira todas as propostas e aprove pelo botão. A aplicação é atômica e pode ser desfeita.

---

# Histórico: Service Builder v2.5 — Copiloto Ollama

**Novidade:** Chat local e propostas aprováveis no editor híbrido (Ambientes e Simulação). Todos os recursos continuam operando sem Ollama.

Leia [docs/V2_5-COPILOTO-OLLAMA.md](docs/V2_5-COPILOTO-OLLAMA.md) para instalar o modelo, limites e testes.

## Executar localmente

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

Abra http://localhost:4173/app/ . A IA é opcional: abra o painel **Copiloto IA** após iniciar Ollama em outro terminal e baixar um modelo (ex.: `ollama pull qwen3:4b`).

---

# Service Builder v2.4 — Layout Híbrido

Esta versão reorganiza o estúdio de ambientes inspirado no layout de referência: projeto e alternância Construir/Simular no topo, lista dos ambientes criados no projeto à esquerda, cena 3D ou planta 2D ao centro, inspetor do objeto/ambiente à direita e jornada do cliente clicável na parte inferior.

O antigo catálogo de ambientes prontos não volta à barra lateral: ele permanece apenas na janela **+ Novo ambiente**. O usuário ainda edita uma sala por vez; **Visão geral física** continua opcional. O mesmo motor, dados, importação/exportação e simulação foram preservados.

## Linux

```bash
cd ~/Downloads
mkdir -p ~/Service-Builder-v2.4
unzip -o Service-CAD-Builder-v2_4-Layout-Hibrido.zip -d ~/Service-Builder-v2.4
cd ~/Service-Builder-v2.4/service-cad-lab
chmod +x scripts/start.sh
./scripts/start.sh
```

Acesse http://localhost:4173/app/. Exporte um backup JSON antes de mudar de porta.

## Recursos mantidos

- Ambientes 3D individuais, planta 2D e visão geral física.
- Posicionamento, rotação, redimensionamento, paredes, portas e corredores.
- Atividades, vínculos com móveis, jornada e conexões do processo.
- Simulações operacionais, espaciais e personagens.

## Limites

O layout híbrido é uma reorganização do aplicativo existente, não um novo motor 3D. A visão 3D requer WebGL. Em navegadores que não oferecem WebGL, o aplicativo usa o editor 2D. Os deslocamentos e tempos continuam obedecendo às hipóteses do motor de simulação.

## Testes

`npm test` e `python3 tests/v24_browser.py`.

# Service Builder v2.3.2 — Estabilização de UX e acessibilidade

Ferramenta local para **Ambientes de Serviço** e **Simular Serviço**. O simulador e o editor 2D/3D da v2.3.1 foram preservados.

## Linux: instalação completa

Baixe `Service-CAD-Builder-v2_3_2-UX-Acessibilidade.zip` em `~/Downloads`. Feche a versão anterior com **Ctrl+C** e execute tudo:

```bash
cd ~/Downloads
mkdir -p ~/Service-Builder-v2.3.2
unzip -o Service-CAD-Builder-v2_3_2-UX-Acessibilidade.zip -d ~/Service-Builder-v2.3.2
cd ~/Service-Builder-v2.3.2/service-cad-lab
chmod +x scripts/start.sh
./scripts/start.sh
```

Abra **http://localhost:4173/app/** e verifique **BUILDER 2.3.2**. Se a porta estiver ocupada, encerre a versão anterior ou execute `SERVICE_BUILDER_PORT=4174 ./scripts/start.sh` e abra **http://localhost:4174/app/**.

Requisitos para executar: **Python 3 e unzip**; o projeto inclui a biblioteca Three.js. Node.js é necessário apenas para executar testes.

**Migração:** os dados locais são associados à origem/porta do navegador. Exporte seu projeto em JSON e importe-o se mudar a porta ou o endereço. Faça backup antes de atualizar.

## Alterações v2.3.2

- **CSS consolidado em produção:** 24 arquivos antigos + `v26.css` são reunidos em um único `app/styles-bundle.css`. A lista ordenada está em `app/css-manifest.json`; os originais ficam em `app/` para manutenção. Para reconstruir: `python3 scripts/build-css.py`.
- **Confirmações visuais:** substituído `confirm()` por um diálogo com foco inicial, Esc, Cancelar e Confirmar para exclusão de ambiente, atividade, modelo, peça e substituição ou importação do projeto.
- **Abas acessíveis:** navegação com setas esquerda/direita e Home/End, estados `role=tablist`, `role=tab`, `aria-selected`, e foco visível.
- **Controles de toque:** tamanho mínimo maior em botões primários, com melhoria de legibilidade em telas pequenas. As bibliotecas/áreas avançadas mantêm algumas limitações do layout legado.
- **Testes:** 189 testes Node e teste adicional de navegador em 4 resoluções, com validação do diálogo (confirmar/cancelar/Esc), abas e simulação.
- Identificação da versão atualizada no HTML, pacote e cabeçalho HTTP.

## Testes

```bash
node --test tests/*.test.mjs
python3 tests/v26_browser.py
```

Os testes de navegador exigem Python com Playwright e Chromium. Neste ambiente automatizado, o navegador bloqueia o acesso ao servidor local; o script usa a renderização em memória como alternativa. **A aparência do 3D em WebGL não foi validada visualmente nesse ambiente.**

## Limitações e próximos passos

A consolidação reduz **as requisições de CSS de 24 para 1** e mantém a ordem da cascata, mas **não remove ainda os seletores redundantes e os `!important` históricos**. A remoção desses conflitos deve ser feita gradualmente com regressões visuais. Os componentes legados fora da navegação principal ainda constam do HTML e do código para compatibilidade. A auditoria da v2.3.1 continua em `docs/PLANO_CORRECOES_UX_v2.3.1.md`.

Nenhum deploy ou publicação no GitHub foi efetuado por este pacote local.
