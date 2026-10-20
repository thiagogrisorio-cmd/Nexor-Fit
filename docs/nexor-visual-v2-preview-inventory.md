# NEXOR FIT 2.0 — Inventário das 12 prévias visuais

As telas abaixo são **protótipos HTML isolados** na branch `feature/workout-sessions-v1`. Nenhuma delas é importada pelo `index.html` legado. Não há autenticação, persistência, acesso a histórico real ou implantação nesta etapa.

| Nº | Tela aprovada | Arquivo | Estado |
| --- | --- | --- | --- |
| 01 | Login | `visual-login-v2.html` | Estático, autenticação desabilitada |
| 02 | Home | `visual-home-v2.html` | Estático, indicadores ilustrativos |
| 03 | Seleção de treinos | `visual-preview-v2.html` | Estático, planos A/B são apenas exemplos |
| 04 | Treino em andamento | `visual-session-v2.html` | Progresso calculado com exercícios/séries variáveis, dados fictícios |
| 05 | Exercício | `visual-exercise-v2.html` | Validação local de carga/repetições, sem gravação |
| 06 | Série concluída | `visual-set-complete-v2.html` | Confirmação estática |
| 07 | Descanso | `visual-rest-v2.html` | Contador local com ajuste e pulo |
| 08 | Exercício concluído | `visual-exercise-complete-v2.html` | Confirmação estática |
| 09 | Próximo exercício | `visual-next-exercise-v2.html` | Próximo exercício calculado a partir de dados fictícios |
| 10 | Histórico | `visual-history-v2.html` | Lista de snapshots fictícios |
| 11 | Evolução | `visual-evolution-v2.html` | Gráfico e métricas fictícias |
| 12 | Perfil e configurações | `visual-profile-v2.html` | Preferências ilustrativas, ações desabilitadas |

## Base compartilhada
- `nexor-visual-v2.css`: tokens escuros/laranja, cartões, botões, progresso, navegação inferior, responsividade e foco visível.
- `nexor-visual-progress.js`, `nexor-visual-exercise.js`, `nexor-visual-rest.js`, `nexor-visual-transition.js`, `nexor-visual-history.js`: utilitários puros, sem Firebase.
- `nexor-visual-demo-history.js`: sessões fictícias para a prévia de histórico/evolução.
- Testes unitários dos utilitários integrados ao `npm test`.

## Pendências antes da integração
1. Revisar visualmente as 12 telas em viewport móvel e desktop, incluindo acessibilidade e navegação.
2. Unificar fluxo de navegação e remover links entre prévias que não representam ações reais.
3. Conectar somente após validação de contratos, regras Firestore, recuperação/backup comprovados e autorização explícita para etapas de maior risco.
4. Garantir planos dinâmicos manuais/recomendados, arquivamento seguro e snapshots históricos imutáveis.
5. Não alterar `index.html` de produção, regras, dados, deploy ou PR merge sem os respectivos gates.

Este inventário descreve implementação de prévias, **não** conclusão de produto funcional.
