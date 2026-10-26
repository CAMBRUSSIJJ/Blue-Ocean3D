# Service Builder v2.3 — Registro de implementação

## Escopo

1. **`simulation-poses.mjs`**: projeção determinística de atores sobre assentos e postos de trabalho vinculados. Não altera eventos ou propriedades canônicas. Assentos ilustrativos disponíveis: sofá (3), banco (3), cadeira (1), banqueta (1). Organização estável por índice da ocorrência. Excesso permanece em pé.
2. **`simulation3d.mjs`**: apresenta poses de sentado, deitado, trabalhando e em caminhada no ambiente individual. Caminhada animada em passos leves; braço dos profissionais ganha gesto sutil quando existe vínculo real com móvel. Movimento reduzido é respeitado.
3. **`site3d.mjs`**: persistência de personagens entre quadros; interpolação de posição e movimentos simples. Não reconstrói o personagem inteiro a cada novo minuto da reprodução.
4. **`site-traffic.mjs`**, **`floorplan-ui.mjs`**, **`simulation-ui.mjs`**: projeção equivalente no fallback 2D, painel de ocupação visual e seleção dos atores.
5. **Compatibilidade**: nenhuma mudança estrutural em documento JSON, importação ou no algoritmo de filas, duração, custos e capacidade. Versão HTTP, cabeçalho e tela identificados como 2.3.

## Limites técnicos

Não foram implementados motores de animação esquelética, física corporal, detecção de colisão entre personagens, produtividade ligada a equipamento, acessibilidade ou ocupação máxima real de área de espera. A atribuição de um assento é somente visual e não restringe a quantidade de clientes operacionais.

### Testes

Os 179 testes herdados e seis testes novos de poses/ocupação passaram (185 no total). O teste de browser com HTML in-memory verificou a navegação e fallback 2D; WebGL não pôde ser confirmado no Chromium automatizado. Executar em um navegador Linux com WebGL para validar as poses 3D e animação da cena geral.
