# Service Builder v1.1 — registro técnico

## Correções e melhorias incluídas

1. Identificação explícita v1.1 no cabeçalho, trilho lateral e no HTTP (`X-Service-Builder-Version: 1.1.0`).
2. Servidor sem cache e erro claro quando a porta já está ocupada — evita mostrar por engano a build anterior.
3. Navegação principal preservada com apenas duas abas: Ambientes de Serviço e Simular Serviço.
4. Layout das plantas 2D expandido, catálogo mais compacto, edição de detalhes do ambiente recolhível.
5. Criação de atividades diretamente na interface 2D e acesso à edição a partir de móveis vinculados.
6. Revisão contextual dos vínculos, atividades sem equipe, sem duração e sem ambiente; sem exclusões automáticas.
7. Conferência prévia na simulação exige confirmação apenas para **atividades ou grupos operacionais independentes**. Conexões entre grupos podem ser paralelas por projeto; os avisos não inferem ordem física inexistente.
8. Controles de reprodução e planta viva apresentados antes de linha do tempo; explicações do motor recolhíveis.
9. Painel distingue tarefas em execução/espera de pessoas; diagnóstico de maior espera por equipe é baseado nos eventos calculados.
10. Mantidos importação/exportação JSON, grafo canônico, posições ilustrativas e motor determinístico.

## Testes efetuados

- `node --test tests/*.test.mjs`: **96 testes aprovados**.
- `python3 tests/v10_browser.py`: editor 2D, avatares, cenários e visualização mobile aprovados.
- `python3 tests/v11_browser.py`: navegação limitada, selo de versão, layout, painel de detalhes, revisão de paralelismo e diagnóstico aprovados.

## Limitações metodológicas

A construção usa uma grade esquemática, sem escala métrica; os personagens ilustram posições de atividades e atendimentos. Não há planejamento de rotas/evitação de obstáculos ou cálculo de distância e tempo de caminhada. A análise de concentração da espera não prova causalidade.

## Migração

O `localStorage` mantém a chave `service-cad-lab/v1`, sem apagamento dos projetos desta linhagem. Para transferência entre computadores, use o menu Exportar JSON. A execução continua 100% local em Python 3 e navegador moderno.
