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

## Resumo agregado de séries — preparação segura
Criado `session-v2-summary.js` para validar os 12 documentos de exercícios, IDs, índices únicos e 24 séries antes de contar `completedSets`. Cinco testes unitários novos cobrem integridade e erros. A gravação de `completedSets` no pai **não foi habilitada**: as regras atuais não verificam esse valor contra os 12 filhos, e permitir a escrita direta criaria um contador adulterável. Próxima etapa é definir gravação privilegiada ou regra de integridade verificável, com testes de segurança e custo de leitura. O histórico segue exibindo `—` quando não há contagem confiável. CI novo pendente; não publicar.

## Persistência de resumo V2 — fronteira de segurança
CI #470: testes unitários aprovados; Firestore 31/33, apenas duas falhas V1 conhecidas. Adicionada coleção `users/{uid}/sessionSummaries/{sessionId}`: cliente autenticado proprietário pode **ler**, mas **nenhum cliente pode criar, alterar ou excluir**. Teste de emulador cobre falsificação, alteração, exclusão, acesso de terceiros e leitura de documento gerado em contexto privilegiado. `session-v2-summary-reader.js` valida leitura e intervalo 0–24. **Ainda não existe backend privilegiado para gerar/persistir o resumo**; portanto não declarar contadores em produção nem introduzir escrita cliente. A futura rotina backend deve ler 12 filhos, verificar integridade, vincular ao estado concluído e gravar resumo idempotente com autenticação e autorização servidoras. Testar concorrência e reprocessamento antes de integrar UI. Sem deploy.

## Planejamento idempotente do resumo V2
CI #480: unitários aprovados; Firestore 32 aprovações, 2 falhas V1 conhecidas. `session-v2-summary-plan.js` cria um plano determinístico a partir de metadados concluídos e 12 exercícios válidos, retorna `unchanged` para reprocessamento idêntico e rejeita divergências em resumos existentes. Quatro testes adicionados ao CI. **O executor privilegiado de gravação não foi criado**: tentativa de inclusão do módulo de escrita foi bloqueada pela ferramenta; não afirmar persistência automática. A coleção continua protegida contra gravações cliente. Para finalizar: implementar execução servidor confiável com transação de leitura e criação, autorização e testes em emulador, sem usar credenciais no browser. Sem deploy.

## Executor de resumo V2 (somente backend)
Criado `session-v2-summary-executor.js`, recebendo exclusivamente um cliente Firestore Admin de processo confiável. Executa transação que lê pai, resumo existente e 12 filhos; planeja resumo determinístico, cria apenas quando ausente e retorna `unchanged` quando já idêntico. Divergências ou sessões não concluídas são rejeitadas. Três testes com store simulado incluídos no CI. **Não há gatilho Cloud Run/Functions nem credenciais de serviço provisionadas; não é processamento automático em produção.** Antes de conectar gatilho, adicionar testes reais no emulador Admin, autenticação de invocação, proteção contra corrida e observabilidade. CI novo pendente. Não publicar.

## Adaptador de gatilho Firestore V2
Criados `session-v2-summary-event.js` (filtra somente transições para sessão V2 concluída, valida uid e sessionId, ignora eventos repetidos) e `session-v2-summary-trigger.js` (adapta evento Firestore e cliente Admin ao executor transacional; registra ação). Testes unitários do filtro adicionados ao CI. **Não foi registrado nem implantado um gatilho Firebase Functions/Cloud Run**: falta provisionar runtime de servidor e credenciais Admin, além de teste integrado de emulador. Não expor executor no cliente. CI novo pendente. Sem deploy.

## Runtime Firebase Functions V2 (somente branch)
CI #506: unit-tests OK; Firestore 32/34, duas falhas V1. Adicionados `functions/package.json` (Node 22, firebase-admin e firebase-functions), `functions/index.js` (gatilho onDocumentUpdated para `users/{uid}/sessions/{sessionId}`, região southamerica-east1, retry desabilitado) e configuração functions/emulador em `firebase.json`, preservando regras e configurações anteriores. Teste unitário do adaptador incluído no CI. **Ainda não executamos integração de Functions/Firestore no emulador nem deploy; não há resumo automático em produção.** Validar resolução dos imports relativos compartilhados durante empacotamento da pasta `functions`, instalação de dependências, idempotência e custo antes de liberar. Não publicar com falhas V1.

## Empacotamento Functions autocontido
CI #518: unit-tests OK; Firestore 32 aprovações e 2 falhas V1. Corrigido import do entrypoint para dentro de `functions/`; copiados para a pasta os módulos de gatilho, evento, executor, plano e cálculo, evitando imports fora da raiz de deploy. Adicionado teste unitário de importação da árvore interna de dependências. **Ainda não foi testado o pacote real com `npm install` dentro de functions nem o emulador Functions integrado.** Cópias de código exigem disciplina de sincronização futura (ou etapa de build automatizada). Não publicar.
