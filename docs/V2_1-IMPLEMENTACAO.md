# Service Builder v2.1 — implementação técnica

## Rede de caminhos

A planta geral utiliza uma grade global com coordenadas inteiras. Cada sala ocupa 12 × 8 células, com posição própria em `floorplan.roomPositions`. A estrutura `floorplan.corridors` armazena células transitáveis **fora** das salas. A movimentação de salas não pode sobrepor o corredor. As portas fazem parte de `floorplan.segments` e são conferidas em cada travessia da fronteira da sala.

`app/site-routing.mjs` implementa busca em largura (BFS) em células ortogonais, com arestas bloqueadas por paredes e células ocupadas por móveis. Corredores automáticos são construídos por BFS no espaço externo, ligando portas acessíveis, sem atravessar outras salas. As ligações operacionais são verificadas individualmente com os postos vinculados às atividades. Uma ligação operacional só é considerada fisicamente transitável se existir um percurso completo entre os postos nos dois ambientes.

## Interface

`app/site-overview.mjs`: modos mover/desenhar/apagar, seleção de ambientes, geração automática de corredor, diagnóstico e indicação do trajeto. `app/site-traffic.mjs`: representação SVG escalável de todo o espaço e personagens, projetados sobre a mesma rede de caminhos. `app/simulation-ui.mjs`: terceiro **modo interno** de reprodução (*Circulação entre ambientes*) preservando as duas abas principais. `app/simulation3d.mjs`: atualiza os personagens em salas individuais durante as transições, sem duplicar clientes que estão nos corredores.

## Contrato temporal

Os eventos do simulador permanecem canônicos e determinam chegadas, inícios, durações, filas e custos. `physicalTravellers` calcula uma interpolação visual ao longo de uma rota válida em janelas curtas (até 2 minutos antes do início de uma próxima atividade, ou até 1 minuto após o início quando não há intervalo livre). Essa interpolação **não é um custo temporal**, não pressupõe velocidade física ou reduz o atendimento. Se não houver rota válida, nenhuma travessia fictícia é criada.

## Compatibilidade e validação

O `reconcileFloorplan` mantém apenas células inteiras únicas fora das salas e dentro dos limites. As 160 verificações anteriores continuaram aprovadas, além de 11 novas (total **171**). O teste em Chromium verificou o desenho de corredores com mouse, geração automática de todas as rotas do exemplo, simulação com viajante atravessando o mapa, navegação, rolagem e visualização móvel. O WebGL 3D não pôde ser conferido visualmente no ambiente de testes.
