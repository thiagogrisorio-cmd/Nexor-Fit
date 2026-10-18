# Paridade da interface de treinos: V1 → V2

Levantamento do código em `session-ui.js` na branch de trabalho. **Não é autorização de produção.**

| Ação | Fluxo V1 atual | Fluxo V2 atual | Lacuna para corte |
| --- | --- | --- | --- |
| Iniciar treino | `save(next)` por padrão | `createV2Workout` somente com `?nexorV2StartPilot=1` | Remover dependência do piloto após garantir continuidade e recuperação |
| Marcar/desmarcar série | `offlineEdit` ou `save/markSet` | `updateV2Set` online com revisão e token | Integrar fila V2 e conflitos na interface padrão |
| Concluir | `offlineEdit('finish')` ou `save/finishSession` | `finishV2Workout` somente online e no piloto | Conclusão V2 offline, recibo e retomada |
| Carregar sessão ativa | Leitura do documento V1 | `loadWorkoutForUI` com 12 filhos, exibido como `v2ReadOnly` | Estado de UI V2 editável com proteção contra dados incompletos |
| Histórico | V1 e V2 em `completedSessions` | Resumo V2 lido do backend, sem inventar contador | Validar E2E e integridade de resumo |
| Regras | Escrita V1 ainda permitida com validação parcial | Estrutura V2 separada por exercícios | Negar novas gravações V1 sem perder leitura histórica |

## Primeiro incremento funcional seguro
1. Centralizar a escolha entre V1 e V2 em um módulo de política testável, sem alterar o comportamento de produção.
2. Adicionar testes da política para impedir que um parâmetro de URL habilite gravação V2 sem autenticação.
3. Depois integrar uma chave de rollout controlada, validar no navegador e migrar o fluxo padrão para V2.
4. **Nunca** mudar o padrão para V2 sem a fila offline e a recuperação de sessão verificadas; nunca enfraquecer os testes Firestore V1.

## Critério de aceite da virada
Criação, edição, conclusão, histórico, sincronização e recuperação V2 operam sem `nexorV2StartPilot`; V1 é somente leitura/migração; todas as regras e testes passam; rollback foi ensaiado.
