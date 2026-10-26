# Service Builder v2.5 — Copiloto local Ollama

## Arquitetura

- Sem terceira aba: o botão **Copiloto IA** abre painel lateral nas abas Construir e Simular.
- Interface nativa em `app/ai-ui.mjs`; contexto compacto, ações tipadas e aplicação atômica em `app/ai-core.mjs`.
- `scripts/server.py` continua servindo arquivos locais, mas acrescenta `GET /api/ai/models` e `POST /api/ai/chat`.
- O proxy consulta **apenas** `http://127.0.0.1:11434`; não há API remota configurável pelo navegador.
- O servidor escuta em loopback (`127.0.0.1`). Não expor `4173` na rede pública.
- Somente os resumos solicitados pela interface são enviados ao modelo. O conteúdo do chat permanece em memória na página e não é salvo em `localStorage`.
- A proposta só pode incluir `create_room`, `add_furniture`, `add_activity` e até 12 ações. Nomes e posições são limitados e validados.
- A interface deve mostrar todas as ações para **aprovação manual** antes de aplicar. Em caso de colisão, sala desconhecida ou tamanho inválido, o projeto original não é alterado.
- A aplicação aparece como um único item no histórico de desfazer do documento.

## Como iniciar a IA

O Service Builder inicia **sem Ollama**. Para habilitar a IA:

1. Instale o Ollama para Linux a partir de https://ollama.com/download/linux (se ainda não estiver instalado).
2. Em um terminal execute `ollama serve` (em outra sessão, ou serviço já rodando).
3. Execute `ollama pull qwen3:4b` uma vez; o download usa alguns GB.
4. Inicie o Service Builder com `./scripts/start.sh` e abra `http://localhost:4173/app/`.
5. Clique em **Copiloto IA**, selecione o modelo e envie uma pergunta.

Outros modelos já baixados aparecem automaticamente no seletor. Se o Ollama não estiver disponível, o painel mostra orientações; o programa continua funcionando sem IA.

## Uso

- **Perguntas**: "Quais equipes concentram espera?", "Quais atividades estão sem ambiente?".
- **Construção assistida**: "Crie uma sala de espera com duas cadeiras". Confirme a proposta antes de executar.
- **Contexto**: com o checkbox ativado, o sistema envia apenas um resumo do projeto, nunca o JSON inteiro. O resumo prioriza até 12 ambientes, atividades/móveis limitados, conexões e últimos resultados calculados válidos; se não houver simulação atual, oferece um cenário de referência rotulado (6 clientes, chegada a cada 8 minutos e uma vaga por equipe).
- **Privacidade**: desmarcar o checkbox não envia resumo do projeto. Não há API paga nem upload para servidor externo nessa integração; dados chegam ao Ollama local no próprio computador. Avalie a origem e licença dos modelos que instalar.

## Limites da v2.5

- A IA **não** cria automaticamente paredes, portas, corredores, jornadas conectadas ou layouts completos de uma clínica. Adicionar atividades não cria conexões por conta própria.
- O modelo pode errar ao estimar ou propor posições. Validações são determinísticas e rejeitam operações inválidas.
- As análises dependem de hipóteses cadastradas; recomendações não substituem observações reais do atendimento.
- O modelo de referência `qwen3:4b` é independente do ZIP: precisa ser baixado pelo usuário. Memória necessária depende de modelo, quantização, contexto e GPU.
- Não foi executada uma inferência com Ollama real no ambiente de testes; o contrato HTTP foi validado contra um servidor simulado.

## Testes

`npm test` — suíte JS com regressão e testes de ações do copiloto.

`python3 tests/ai_browser.py` — testa navegador Chromium com simulação da resposta HTTP e, separadamente, o proxy Python contra um servidor Ollama falso. Não requer download de modelos.

`python3 tests/v24_browser.py` — testa regressão do layout híbrido em diferentes resoluções.

## Segurança e próximas evoluções

Para a v2.6: ferramentas para múltiplos ambientes, ligações e layout 2D/3D com prévia gráfica, restrições por tipo de serviço e experiência de planejamento por etapas. Para execução autônoma mais ampla será necessário definir controle de permissões, limites de custo computacional, histórico de auditoria e reversão robusta. Não execute JSON de IA como comandos arbitrários.
