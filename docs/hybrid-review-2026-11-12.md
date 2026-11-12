# Revisão técnica do híbrido — 12/11/2026

## Caso informado pelo usuário

Básico, ganho de massa, corpo todo, 3 dias/semana, 30 minutos de musculação, híbrido com 2 dias de academia e aeróbico leve.

## Problemas identificados no gerador anterior

1. O mesmo template de corpo todo era aplicado a todos os dias híbridos, sem função complementar por ambiente.
2. A rotação por índice podia selecionar exercícios sem carga na academia, apesar da disponibilidade de aparelhos.
3. O movimento escapular em W podia ocupar a posição de uma remada, sem estímulo equivalente de puxar.
4. Não havia conferência semanal de séries/exposições por grupo, nem uma lógica de sobreposição entre dias.
5. Repetições, descanso e estimativas não distinguiam suficientemente exercícios principais, acessórios e execução dos dois lados.

## Fontes consultadas e aplicação

- **ACSM, Position Stand 2026**, texto integral público: https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/ — regularidade, esforço adequado, individualização e progressão; não é necessário exigir falha muscular. O aplicativo explica a escolha de carga/variação com aproximadamente 2–3 repetições em reserva, sem calcular cargas máximas a partir de marcações de séries.
- **ACSM’s Resources for the Personal Trainer, capítulo 16, Resistance Training Programs**, amostra oficial da editora, consultada (não o livro completo): https://downloads.lww.com/wolterskluwer_vitalstream_com/sample-content/9780781797726_ACSM-RPT/samples/Chapter16.pdf — sequência dos exercícios, movimentos multiarticulares antes dos acessórios, alternância de empurrar/puxar e coerência com o objetivo.
- **NSCA, Essentials of Strength Training and Conditioning, 5ª edição**, sumário oficial: https://us.humankinetics.com/products/essentials-of-strength-training-and-conditioning-5th-edition-with-hkpropel-access — estrutura de projeto: necessidades, seleção, frequência, ordem, carga/repetições, volume e descanso. A tentativa de acessar Foundations of Fitness Programming redirecionou para autenticação; não foi tratada como conteúdo integral lido.
- **HPRC/Uniformed Services University**, orientação sobre sequência de exercícios: https://www.hprc-online.org/physical-fitness/training-performance/choosing-right-exercises-optimize-your-resistance-training
- **ACE**, programação com peso corporal: https://www.acefitness.org/continuing-education/certified/september-2026/9193/body-weight-training-by-design-programming-for-every-fitness-goal/ — variar a dificuldade exige mais que acrescentar repetições; considerar esforço e progressões.
- **Fitbod**, consistência de exercícios, perfil e sinais de desempenho: https://help.fitbod.me/hc/en-us/sections/360001078993-How-Fitbod-Works e https://fitbod.me/variability/ — referência funcional para manter exercícios produtivos e evitar embaralhamento sem motivo. O Nexor-Fit não reproduz o algoritmo proprietário nem estima percentuais de recuperação fisiológica.
- **Freeletics**, Hybrid Strength: https://help.freeletics.com/hc/en-us/articles/360001995859-Freeletics-Weights-Journeys — o produto descreve experiência prévia em levantamento. O caso básico do usuário recebeu uma base controlada, sem copiar blocos explosivos de um programa para experientes.

## Nova lógica

O planejador de versão 2 usa o conjunto da semana para definir papéis de cada sessão. Prioriza aparelhos/cargas na academia e movimentos corporais compatíveis em casa. A escolha é estável, por critérios; salvar novamente o mesmo perfil não sorteia outra ficha.

Para o caso informado, a sequência é:

| Sessão | Papel | Exemplo sugerido |
|---|---|---|
| A — Academia | Base A | Leg press, chest press, remada baixa, mesa flexora, dead bug |
| B — Casa | Complementar | Afundo estático, flexão com joelhos apoiados, ponte de glúteos, dead bug, panturrilhas |
| C — Academia | Base B | Puxada alta, leg press, chest press, mesa flexora, elevação lateral |

As séries iniciais são duas por exercício; compostos recebem 10 repetições e 90 s de descanso neste caso; acessórios usam 12 repetições e 60 s, core 8 por lado. O tempo estimado inclui 5 min iniciais, transições e os dois lados dos exercícios unilaterais. As três sessões ficaram em aproximadamente 29 min no teste.

Alguns fundamentos se repetem para permitir aprendizagem e acompanhamento de progressão. A diferença entre A e C inclui a direção da puxada e os complementos; não há obrigação de substituir tudo para produzir novidade.

O resumo planejado deste exemplo mostra costas com resistência em dois dias, pernas e peito distribuídos na semana, além de core e complementos. Séries por grupos se sobrepõem e não incluem o trabalho indireto. A tabela não é uma medição fisiológica de dose ou recuperação.

Para rotinas com mais dias, o calendário sugerido também evita colocar um complemento principal de pernas/empurrar em casa imediatamente ao lado de uma sessão de academia sobreposta. Quando necessário, a casa recebe um complemento de core/panturrilhas. O calendário é um exemplo; a recuperação real depende da pessoa e não é inferida automaticamente.

Se há apenas um dia de academia e nenhum equipamento para puxar em casa, o app informa a limitação. Não usa o W no solo para contar uma segunda sessão equivalente de costas. A ficha não promete maximizar hipertrofia de todos os grupos dentro de qualquer limite de tempo.

## Compatibilidade e dados

- `plannerVersion: 2` identifica a nova montagem; fichas anteriores conservam sua ordem de ambientes e sessões já iniciadas.
- A sugestão precisa ser conferida e aceita pelo usuário. Nenhuma ficha do usuário foi sobrescrita automaticamente durante o teste.
- Alternativas de ficha também consideram o tempo estimado da troca, incluindo os dois lados.
- Aeróbico e sua evolução continuam separados da musculação.
- Regras permanecem privadas por usuário e limitadas; a versão de planejamento foi adicionada aos campos permitidos. A validação biomecânica do catálogo continua no cliente, conforme a auditoria de protótipo já documentada.

## Evidência de verificação

- 322 testes unitários aprovados.
- Novos testes cobrem o caso informado, 1.875 combinações de ambiente/nível/objetivo/dias/tempo com foco equilibrado, equipamento real de cada dia, orçamento de tempo, ordem de compostos/acessórios, estabilidade, séries nos dois lados, limitação com um dia de academia e sobreposição de sessões.
- Sete cenários de integração de regras/transações no emulador isolado aprovados.
- Navegador QA: perfil exato informado, geração, aceite, salvamento, recarregamento, início/conclusão de sessão de teste e explicação semanal verificados. Telas de 320 e 390 px sem rolagem horizontal.
- Esses testes validam contratos e critérios de montagem, não resultados clínicos ou superioridade sobre outros apps. Produção e dados reais preservados.
