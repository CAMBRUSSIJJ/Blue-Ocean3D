# Service Builder v1.7 — Ambiente em tela inteira

## Mudança solicitada

- A aba **Ambientes de Serviço** vira um estúdio de construção com ocupação de toda a área disponível ao lado da navegação principal.
- Os ambientes permanecem em **abas internas** e apenas um é editado por vez.
- O catálogo permanente de ambientes foi retirado da interface; ele permanece apenas como lógica interna de modelos para preservar compatibilidade com projetos e kits anteriores.
- `+ Novo ambiente` abre um diálogo com nome e opção de iniciar vazio ou com modelo. É possível salvar modelos no painel de configurações do ambiente.
- **Móveis e equipamentos** é um painel flutuante recolhível à esquerda, que não reduz a dimensão do canvas.
- Propriedades do objeto e configurações do ambiente são painéis flutuantes acionados sob demanda.
- Atividades e conexões ficam recolhidas sob o estúdio; continuamos oferecendo 3D, planta 2D e fluxo.
- Os dois modos principais (Ambientes de Serviço e Simular Serviço), o documento, as atividades, o simulador 3D/2D, importação e exportação foram preservados.

## Testes

Executar `npm test` e `python3 tests/v17_browser.py`. O navegador de teste deste ambiente não disponibiliza WebGL; ele verifica o **fallback 2D**, interação dos painéis, dimensões, criação de ambiente, troca entre salas, navegação e responsividade. A visualização 3D deve ser verificada no Linux do usuário.

## Linux

```bash
cd ~/Downloads
mkdir -p ~/Service-Builder-v1.7
unzip -o Service-CAD-Builder-v1_7-Ambientes-Tela-Inteira.zip -d ~/Service-Builder-v1.7
cd ~/Service-Builder-v1.7/service-cad-lab
chmod +x scripts/start.sh
./scripts/start.sh
```

Abrir `http://localhost:4173/app/`. Caso já haja servidor antigo na porta, parar o anterior antes de iniciar ou usar `SERVICE_BUILDER_PORT=4174 ./scripts/start.sh` e abrir a porta correspondente.

Os projetos são mantidos no armazenamento do navegador por origem (endereço e porta). Ao mudar de porta, exporte e importe o JSON para recuperar seu serviço.
