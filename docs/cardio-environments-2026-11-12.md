# Ambientes, aeróbico e novo formulário — 12/11/2026

## Implementação

- Pergunta **Qual o seu ambiente de treino**: Academia, Em casa, Híbrido.
- Academia habilita o catálogo de equipamentos da academia. Em casa usa exclusivamente exercícios com peso corporal. No híbrido, a pessoa escolhe os dias de academia e o app calcula os dias em casa, mantendo o total semanal. Os ambientes são distribuídos ao longo da sequência; cada dia filtra exercícios e substituições pelo ambiente daquele dia.
- Perfis antigos continuam legíveis. As novas preferências só são persistidas depois de gerar a sugestão e aceitá-la.
- Todas as perguntas de seleção única usam cartões com radios acessíveis, foco visível e destaque laranja. Tempo aeróbico é um campo numérico editável.
- Aeróbico separado em tela própria e coleção privada `users/{uid}/cardioLogs`. Na evolução, tabela de minutos/intensidade/atividade separada da carga de musculação. Não altera séries, pesos ou contagem de sessões de musculação.
- Academia alterna Esteira, Bicicleta, Elíptico e Escada nos dias e ciclos. Em casa alterna marcha no lugar, passos laterais e boxe de sombra, sem aparelhos. Usuário pode não incluir cardio.
- Sugestões iniciais do produto: leve 15 min, moderado 20 min, avançado 20 min. Não são limites médicos nem tempos universalmente ideais. A intensidade avançada implica maior esforço com recuperação, não obrigação de maior duração. Usuário pode alterar a preferência entre 5 e 60 minutos e informar os minutos realmente realizados (1–120) ao registrar.
- Escada recebe sugestões menores: 5, 8 ou 12 minutos, conforme intensidade, sempre limitadas pela preferência global. Há orientação de começar 5–10 min, progredir gradualmente, usar apoios sem se pendurar, parar antes de descer e interromper diante de sintomas incomuns. Não se afirma existir limite universal de minutos.
- Esteira: ajuste gradual pela respiração, sem afirmar equivalência universal de 15 minutos inclinados com X minutos de corrida. A cada 3 minutos pode reavaliar o esforço; não há aumento automático obrigatório de inclinação.

## Pesquisa e limites

- CDC, teste da fala para esforço moderado e vigoroso: https://www.cdc.gov/physicalactivity/basics/measuring/index.html
- CDC, orientação geral semanal de atividade aeróbica: https://www.cdc.gov/physical-activity-basics/adding-adults/what-counts.html
- Peloton, exemplos reais de sessões iniciais em durações variadas de 10–30 min: https://www.onepeloton.com/classes/beginner-cardio?page=1
- NordicTrack, inclinação, forma e progressão: https://www.nordictrack.com/blog/home-treadmill-training-burn-calories-incline-trainer
- JD Gyms, introdução à escada de 5–10 min: https://www.jdgyms.co.uk/news/how-to-use-the-stairmaster/

As fontes não estabelecem a tabela 15/20/20 como prescrição universal. Essa tabela é uma escolha conservadora de produto, editável, que deve ser individualizada. Minutos leves não equivalem automaticamente a minutos moderados/vigorosos; o histórico mantém a intensidade identificada, e os totais recentes são minutos brutos, não uma pontuação clínica ou estimativa de calorias.

## Verificação

- 315 testes unitários aprovados, incluindo distribuição híbrida exata, ambiente sem equipamentos, rotação dos aparelhos, sugestão da escada, cardio opcional e totais sem mistura com musculação.
- Sete cenários integrados do novo modelo aprovados em emulador isolado, incluindo perfil completo, permissão entre contas negada, tempo fora do limite negado e registros aeróbicos imutáveis.
- Navegador em conta QA e porta separadas: cartões, híbrido 2+2, aceite e persistência, cardio de academia e casa, rotação dos quatro aparelhos, registro de 12 min de esteira e evolução separada verificados.
- Formulário em 320 e 390 px sem rolagem horizontal. Não foram respondidas perguntas nem criados treinos na conta de primeiro acesso entregue ao usuário.
- Produção não foi alterada. Regras continuam como protótipo com os gates de revisão/backup/rollback já documentados.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for owner-scoped environment preferences and separate, bounded, immutable aerobic logs. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.
