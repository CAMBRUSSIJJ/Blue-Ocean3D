# Registro de entrega v1.0

## Implementado

1. Navegação limitada a **Ambientes de Serviço** e **Simular Serviço**.
2. Novo editor de planta 2D, grade 12×8 por ambiente, biblioteca com nove categorias de objeto e mobiliário automático.
3. Arrastar e soltar objetos na grade, rotação 90°, detecção de colisão, edição por teclado e seleção no inspetor.
4. Associação opcional de móveis aos nós canônicos de atividades; não duplicamos componentes nem alteramos sua sequência.
5. Planta viva de clientes e profissionais com coordenadas ilustrativas derivadas dos eventos da simulação. Posição dinâmica sincronizada ao relógio, pausa e navegação por minuto.
6. Troca entre visualização espacial e cartões/relacionamentos na aba Ambientes.
7. Importação/exportação com propriedade `floorplan` no JSON; projetos antigos sem essa propriedade seguem válidos.
8. Demonstração mobiliada na primeira inicialização; sem dependência de CADCraft, WebGL ou backend.

## Verificações

- Testes do modelo e novos testes do mapa: **91/91 aprovados**.
- Testes no navegador Chromium: edição do modelo, conexões, exportação, montagem da planta, criação e remoção de móveis, avatares, hipóteses de pico, comparador e viewport 390 px: **aprovados**.

## Próximas evoluções possíveis

- Geometria de paredes, portas posicionáveis, medidas em metros e editor de dimensões.
- Navegação sobre malha transitável com obstáculos, trajetos e distância real, **apenas depois de implementar escala, portas e custos espaciais**.
- Agentes com perfis configuráveis, chegadas probabilísticas e múltiplos caminhos condicionais.
- Desenho isométrico e visualização 3D opcional, sem sacrificar o editor simples.

**Limite metodológico:** a v1.0 não usa posição ou distância física para recalcular o motor. Seus resultados não devem ser apresentados como uma medição empírica.
