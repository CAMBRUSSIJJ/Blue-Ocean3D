# Service Builder v2.2 — Simulação espacial hipotética

## Incluído

- Modo opcional de caminhada em **Simular Serviço**. Desativado por padrão para preservar resultados das versões anteriores.
- Escala única para a planta geral (0,4 a 2 metros por célula) e velocidade de caminhada configurável (12–150 m/min).
- Para cada ligação entre atividades em ambientes diferentes, o motor calcula uma rota transitável sobre células, portas, paredes, mobiliário e corredores. Se não houver rota, o cenário espacial não executa e exibe orientação.
- O tempo de caminhada é acrescentado após a atividade de origem (e após o atraso da passagem, quando houver); a atividade seguinte só fica pronta depois da caminhada. O recurso humano não fica ocupado durante a caminhada. Eventos `transfers` e métricas de caminhada constam do resultado JSON.
- A mesma simulação é executada sem caminhada para comparar variação do ciclo médio, mantendo custos e durações de atividade.
- Exibição de pessoas no trajeto pelo tempo de caminhada calculado, e indicação de células com maior ocupação simultânea por amostragem a cada 0,5 minuto.
- Planta geral 3D com salas, divisórias, móveis, corredores e personagens. Usa Three.js local, renderização leve e fallback para 2D se não houver WebGL.

## Limitações e hipóteses

1. Não existem colisões **entre pessoas**, semáforos, lotação máxima de corredores, aceleração, elevadores, escadas ou requisitos de acessibilidade. O calor da circulação é uma contagem **ilustrativa**, não um ajuste na capacidade.
2. O modelo de deslocamento usa a mesma escala global para todos os ambientes, mesmo que uma sala individual apresente outra escala no editor. Ajuste explicitamente a escala da planta geral antes de interpretar distâncias.
3. Atividades paralelas podem criar vários deslocamentos para o mesmo atendimento, porque o motor original permite execução paralela. Configure dependências compatíveis com a operação antes de considerar os resultados espaciais.
4. A cena 3D geral foi incluída e é opcional. No navegador automatizado deste ambiente, WebGL não foi disponibilizado; o mapa alternativo 2D foi validado.
5. A opção é **um cenário determinístico sob hipóteses cadastradas**, não uma previsão de filas ou tempos reais.

## Testes

- `node --test tests/*.test.mjs`
- `python3 tests/v22_browser.py` (testa o aplicativo com os módulos incorporados em memória e, separadamente, verifica que o servidor Python responde; isso contorna a restrição de `localhost` do navegador de teste).
- Para executar sem Node e sem internet: `./scripts/start.sh`, depois abrir `http://localhost:4173/app/`.
