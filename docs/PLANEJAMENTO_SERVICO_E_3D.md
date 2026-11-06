# Planta do serviço, atividades e salas em 3D

## Fluxo de trabalho

1. **Planta do serviço** é a entrada da plataforma. Crie salas, organize suas
   posições e planeje percursos físicos. Criar uma sala nesta etapa mantém a
   planta aberta.
2. **Atividades e fluxo** apresenta as atividades de todas as salas em cards
   legíveis. Há busca por sala ou atividade, criação de atividades e edição das
   conexões operacionais. A tela usa a altura disponível e tem rolagem própria.
3. **Sala em 3D** abre por escolha explícita, após selecionar uma sala. A planta
   2D permanece disponível para construir portas e paredes com precisão.

Os projetos locais, IDs de salas, atividades, móveis e conexões são preservados.
Percurso físico e precedência operacional continuam sendo conceitos diferentes:
conectar salas por corredor não cria automaticamente a sequência de atividades.

## Correção da tela cortada

O contêiner de atividades ainda usava uma regra histórica:
`max-height: min(48vh, 410px)`. Em uma área central de 910 pixels, a tela ocupava
apenas 410 pixels. O painel agora usa a altura restante depois da navegação,
com `min-height: 0` e rolagem. Ele é uma seção própria, sem o antigo disclosure.

Também foram removidos os limites de 12 atividades por sala e 12 ligações na
lista de fluxo. Os títulos dos cards aparecem completos e com quebra de linha;
o destaque compacto da jornada permanece uma prévia expansível.

O menu Projeto fica acima dos painéis de edição. Criar um serviço vazio depois
de usar o 3D retorna à planta, sem reutilizar o modo de edição da sala anterior.

## Validação

- `npm test` mantém as verificações de domínio e regressão existentes.
- `python3 tests/planning_browser.py` verifica a entrada pela planta, criação de
  salas sem abertura antecipada do 3D, acesso à última de 24 atividades, busca e
  altura/rolagem em telas de 1920×1080, 1366×768 e 390×844.
- As regressões de workspace, precisão 3D, jornada, relatório, copiloto e auditoria
  HTTP também foram executadas após a reorganização.
- O ZIP Linux é gerado por `python3 scripts/package-linux.py`, com comparação de
  cada arquivo incluído contra sua fonte e checksum SHA-256 separado.

## Integração com Blue Ocean Service Op

O usuário confirmou que o destino é o próprio **Blue Ocean 3D**. O fluxo de
planejamento do serviço, atividades, salas e edição 3D foi unificado neste
projeto, sobre o mesmo documento existente. Não há duplicação do modelo ao
trocar de etapa: salas usam seus IDs de ambiente, atividades usam seus IDs de
componente e móveis continuam vinculados à sala e à atividade correspondentes.

O repositório `blue-ocean-service-studio` foi apenas consultado durante a
identificação do nome; ele não foi alterado nem é uma dependência do aplicativo.
