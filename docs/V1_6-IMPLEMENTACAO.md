# Service Builder v1.6 — Simular Serviço em 3D

## Escopo entregue

- A navegação do produto continua com apenas **Ambientes de Serviço** e **Simular Serviço**.
- Na simulação: exibição 3D **de um ambiente por vez**, com troca de sala, personagens em baixa complexidade, representação de clientes e profissionais, acompanhamento de filas, identificação da atividade, inspeção do atendimento, câmera orbital, zoom, vista superior, vista isométrica e corte de paredes.
- A visualização 3D utiliza a mesma planta, móveis, dimensões e paredes configurados na primeira aba. Os personagens são derivados dos eventos do motor `simulation.mjs` por meio de `peopleAt` e **não recalculam** chegada, capacidade, duração, espera ou custo.
- O motor continua determinístico. Os trajetos e os movimentos dos personagens são **visuais**, e não tempos de deslocamento físicos incorporados ao modelo operacional.
- Alternância manual para **Mapa 2D completo**; retorno automático para 2D quando WebGL falha. O editor 3D e o editor 2D da primeira aba continuam preservados.
- Linha do tempo detalhada preservada sob um painel expansível. Indicadores, configuração, cenários, comparação, exportação CSV/JSON e revisão de fluxo permanecem acessíveis.

## Verificação

- `npm test`: 126 testes aprovados (incluindo 5 cenários novos para a projeção 3D e compatibilidade operacional).
- `python3 tests/v16_browser.py`: navegação, resultado, fallback 2D, seleção, cena, linha do tempo e responsividade no Chromium do ambiente de teste.
- **Limitação de validação:** a infraestrutura de teste bloqueou WebGL, portanto o editor novo 3D **não pôde ser comprovado visualmente em execução**. O visualizador faz fallback para 2D. Validar o 3D num navegador Linux com WebGL ativo antes de considerá-lo validado em produção.

## Comandos Linux

```bash
cd ~/Downloads
mkdir -p ~/Service-Builder-v1.6
unzip -o Service-CAD-Builder-v1_6-Simulacao-3D.zip -d ~/Service-Builder-v1.6
cd ~/Service-Builder-v1.6/service-cad-lab
chmod +x scripts/start.sh
./scripts/start.sh
```

Abrir http://localhost:4173/app/. Se estiver ocupada, executar `SERVICE_BUILDER_PORT=4174 ./scripts/start.sh` e abrir http://localhost:4174/app/.
