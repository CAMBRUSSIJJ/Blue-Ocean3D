# Implementação v1.2

**Objetivo:** paredes/portas por segmentos, dimensões aproximadas em metros e caminhos transitáveis, sem afetar falsamente os resultados temporais.

## Modelo

`floorplan.objects[]` preservado. Campos opcionais novos:

- `floorplan.segments[]`: `{roomId, axis:'h'|'v', x, y, type:'wall'|'door'|'open'}` — armazenam apenas diferenças em relação à geometria padrão.
- `floorplan.scales`: mapa `{ [roomId]: metrosPorCelula }`, de 0.4 a 2.0.

As quatro bordas são paredes, exceto uma porta inicial no fundo de cada sala. Uma parede interna só aparece quando o usuário a desenha. Passagens marcadas como `door` ou `open` são transitáveis; `wall` bloqueia a transição. Os móveis não podem cruzar uma parede nem ser cortados por uma estrutura nova.

## Caminhamento

`findRoute` busca caminho ortogonal mínimo via BFS em 12×8 células, bloqueando as células ocupadas pelos móveis e as arestas fechadas. `bestEntranceRoute` escolhe a rota mais curta a partir das aberturas externas. Interpolação é usada durante o primeiro minuto ilustrativo do evento, sem modificar `start`, `end`, `readyAt` ou métricas produzidas pelo motor.

Quando não há caminho, o editor apresenta alerta e o avatar não atravessa visualmente a parede. Fluxos físicos de salas separadas são transições esquemáticas; não existe ainda um desenho de planta único com corredores entre salas.

## Validação

- Node: 104 testes automatizados.
- Chromium/Playwright: ferramentas de parede/porta, alteração de escala, prévia de rotas, navegação, simulação e responsividade mobile.
- Aplicação local sem novas dependências de runtime.
