# Retirada segura das gravações V1

## Motivo
O CI #425 confirmou que validar as 12 linhas V1 em um único documento ultrapassa o limite de 1.000 expressões das regras Firestore. Validar apenas parte das linhas não é aceitável para produção.

## Estratégia
1. Manter a produção e a branch main sem alterações enquanto o novo fluxo é testado.
2. Fazer novas sessões usarem exclusivamente metadata V2 e 12 documentos de exercícios, em transação atômica.
3. Ler sessões V1 antigas somente para migração controlada; não apagar dados originais.
4. Preservar backup imutável e exigir validação de integridade antes de permitir migração e recuperação.
5. Após converter a interface de marcação, conclusão e histórico para V2, negar novas gravações V1 nas regras.
6. Testar no emulador: V2 cria/atualiza/conclui; V1 antiga continua legível; V1 nova é negada; nenhum usuário lê dados alheios; nenhuma sessão perde histórico.
7. Habilitar rollout somente depois de CI integral aprovado e plano de rollback validado.

## Bloqueadores
A interface V2 ainda está em modo leitura. A migração V1→V2, a fila offline e os recibos ainda exigem validações de integridade e de confirmação remota. O CI continua com teste de rejeição V1 falhando sob as regras temporárias, portanto NÃO publicar.

## Piloto de criação V2 (somente desenvolvimento)
O parâmetro de URL `?nexorV2StartPilot=1`, apenas para usuário autenticado, encaminha o botão de iniciar treino à transação `createV2Workout`. Sem o parâmetro, o comportamento V1 permanece. A sessão V2 criada continua **somente leitura** na interface; edição e conclusão não foram liberadas. O parâmetro não é uma autorização de produção, e não deve ser usado em ambiente real até CI e revisão de regras. Nenhuma sincronização V2 automática foi habilitada.

## Piloto de edição de séries V2
Com `?nexorV2StartPilot=1`, sessões V2 autenticadas permitem marcar/desmarcar séries **somente online**. Cada edição lê revisão e token `completedAt` e usa `updateV2Set` transacional para recusar conflitos. A sessão é recarregada após a transação. Conclusão V2, offline V2 e sincronização automática continuam desabilitadas. Ainda requer CI, testes no navegador e revisão de corrida entre dispositivos antes de produção.

## Piloto de conclusão e histórico V2
Com o mesmo parâmetro do piloto e autenticação, o botão Concluir usa `finishV2Workout` somente online. A transação exige 12 exercícios íntegros e ponteiro ativo consistente, registra `endedAt`/`durationSeconds` e limpa o ponteiro. O histórico do piloto passa a reconstruir sessões V2 concluídas (até 20 recentes) e mantém sessões V1. Não foi liberado offline V2. Exige validação do CI e teste de navegador antes de publicação.

## Concorrência e custo de histórico — marco seguinte
Incluído teste no emulador simulando dois contextos autenticados com o mesmo UID e mesma revisão inicial: apenas uma transação de alteração da mesma série deve confirmar; a outra deve ser rejeitada, sem perder integridade. A execução em CI ainda precisa confirmar o teste. Para limitar leituras adicionais no piloto, a reconstrução do histórico V2 foi reduzida de 20 para **5 sessões concluídas** por carregamento (até 60 leituras de exercícios, além de metadados). É mitigação temporária, não paginação nem solução definitiva de custo. Permanecem 2 falhas V1 conhecidas no CI #451 e proibição de deploy.

## Histórico V2 baseado em metadados
O CI #457 aprovou o teste de concorrência e os testes unitários; restaram apenas duas falhas V1 conhecidas nas regras (31 aprovações, 2 falhas). A interface piloto agora monta o histórico de sessões V2 concluídas diretamente da consulta de até 50 documentos pais, sem hidratar 12 documentos de exercícios por sessão. Duração, dia e data ficam disponíveis; total de séries concluídas é mostrado como `—` quando não existir metadado confiável, evitando exibir zero falso. Próxima etapa: persistir um resumo agregado seguro e testado no fechamento V2, sem aumentar demais o orçamento de regras ou aceitar contadores adulterados. CI dos novos commits pendente. Sem deploy.
