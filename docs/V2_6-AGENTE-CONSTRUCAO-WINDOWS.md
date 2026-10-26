# Service Builder v2.6 — Agente de construção e Windows

## Novidades

- Novo tipo de proposta atômica `build_service`: até 6 ambientes novos, 8 móveis/6 atividades por sala, paredes/portas, vínculos móvel-atividade, 24 conexões e corredores opcionais.
- Restrições de tipos, limites de grade, nomes duplicados, referências, colisões, barreiras e rotas são verificadas no modelo e a operação só aplica o documento inteiro após aprovação.
- A prévia lista o projeto e permite expandir os detalhes por ambiente. Alterações feitas após a criação da proposta invalidam sua aplicação.
- Para uma operação grande, o usuário divide a construção em etapas aprovadas; a IA não modifica salas existentes com um plano `build_service`.
- Iniciador `INICIAR-WINDOWS.bat` para Windows 10/11 com Python 3.9+; servidor local abre o navegador automaticamente. Porta padrão 4173.

## Exemplo de solicitação

"Crie uma clínica simples com recepção, sala de espera e consultório, com móveis, atividades e corredores. Não repita salas que já existem."

## Limites e segurança

Ollama é opcional e roda no computador, via servidor Python que só acessa o loopback `127.0.0.1:11434`.
Todos os planos são dados não confiáveis; a API não executa código gerado pelo modelo. A validação é feita no cliente sobre cópia e toda a transação é reversível.
Se a rota física falhar, o plano completo é rejeitado e o usuário pode pedir uma planta revisada. A IA não garante a viabilidade arquitetônica nem substitui projeto técnico de edificação.

## Testes

- `node --test tests/*.test.mjs` (compatibilidade e novo agente)
- `python3 -m py_compile scripts/server.py`
- Conferir endpoints `GET /api/ai/models` e `POST /api/ai/chat` com simulador Ollama ou um modelo local instalado.
- A execução do `.bat` precisa ser validada por usuário em Windows (este pacote é montado em Linux).
