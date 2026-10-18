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

## CI de instalação e importação do Functions
Adicionado job `functions-package` no GitHub Actions para instalar dependências dentro de `functions`, verificar sintaxe do entrypoint e importar `functions/index.js` com Node 22. Adicionado teste de paridade preliminar de módulo. **Isso não substitui teste end-to-end do gatilho no emulador nem valida concorrência real do Firestore Admin.** CI #533 estava na fila na consulta anterior; CI dos novos commits pendente. Sem deploy.

## Teste integrado Firestore Admin (CI)
CI #541: unit-tests e functions-package aprovados; firestore-rules 32/34 (duas falhas V1). Adicionado `tests/functions-summary-admin-firestore.test.mjs`, que prepara sessão V2 concluída com 12 filhos no emulador usando Admin SDK, verifica `create`, `unchanged` e conflito de resumo divergente sem sobrescrita. Novo job `functions-emulator` instala dependências do backend e executa o teste via `firebase emulators:exec --only firestore`. **Este teste cobre o executor Admin, não a emissão real do gatilho Functions.** CI novo ainda pendente; não publicar.

## Histórico V2: resumo servidor somente leitura
Na tela piloto `?nexorV2StartPilot=1`, o histórico agora consulta até cinco resumos mais recentes de sessões V2 concluídas em `sessionSummaries` e usa `completedSets` validado para exibir contagem. Ausência, erro ou resumo inválido mantêm travessão, nunca zero inventado. Sem escrita cliente, sem hidratação dos 12 exercícios por histórico; máximo cinco leituras adicionais por carregamento. Testes do reader adicionados. CI novo pendente; gatilho Functions ainda não validado end-to-end, sem deploy.

## Correção de resolução do Firebase Admin no CI
CI #555: unit-tests e functions-package aprovados; functions-emulator falhou com `ERR_MODULE_NOT_FOUND` para firebase-admin no teste localizado em `tests/`; firestore-rules 32/34 com falhas V1. Corrigida resolução do Admin SDK com `createRequire(new URL('../functions/package.json', import.meta.url))`, preservando dependências apenas na pasta `functions` e sem usar caminhos internos de node_modules. Novo CI pendente. Sem deploy.

## Gatilho de conclusão V2: teste com Firestore Emulator
CI #561 confirmou unit-tests, functions-package e functions-emulator aprovados; Firestore rules 32/34 (duas falhas V1). Adicionado teste integrado do adaptador de evento em `functions/summary-trigger-firestore.test.mjs`, com Admin SDK real apontando ao Firestore Emulator: transição active→completed cria resumo, repetição retorna unchanged, evento completed→completed é ignorado e logs são registrados. Novo job `functions-trigger-emulator` no CI. **O teste invoca o handler com evento simulado: ainda não valida a emissão automática do evento pelo emulador Functions.** CI novo pendente, sem deploy.

## E2E do gatilho Functions (em validação)
CI #567: unit-tests, functions-package, functions-emulator e functions-trigger-emulator aprovados; firestore-rules 32/34 por duas falhas V1. Novo teste em `functions/summary-trigger-firestore.test.mjs` inicializa sessão V2 ativa com 12 exercícios, muda status para `completed` e aguarda até 30s pelo resumo gravado por evento **real** do Functions Emulator. Job CI agora inicia `--only firestore,functions`. O resultado deste teste real ainda não foi confirmado; sem deploy.

## Teste negativo do gatilho V2
CI #573 consultado com jobs ainda em andamento, functions-package aprovado. Teste E2E reforçado para fazer atualização de metadados enquanto sessão V2 continua ativa e verificar que nenhum resumo prematuro é criado, antes da atualização para `completed` que deve disparar resumo. Essa asserção imediata complementa, mas não substitui, verificação eventual assíncrona de ausência de efeitos; CI do novo commit pendente. V1 permanece bloqueadora; sem deploy.

## Estabilização do teste negativo assíncrono
CI #577 estava em execução (functions-package aprovado) na consulta. O teste E2E aguarda 1,5 s após atualização de sessão ainda ativa antes de confirmar ausência de resumo, permitindo processamento assíncrono do gatilho. Isso reduz falso positivo por leitura imediata, mas não prova ausência absoluta de efeitos tardios. CI novo pendente; produção não alterada.

## Resultado do gatilho E2E e proteção de idempotência
CI #581: unit-tests, functions-package, functions-emulator e functions-trigger-emulator aprovados. O gatilho real Firestore→Functions→resumo passou. Regras Firestore ainda 32/34: os dois testes V1 falham por validação incompleta dos 12 exercícios. Não remover testes nem publicar regras parciais. Reforçado teste E2E: após criação do resumo, atualizar metadados da sessão já concluída e confirmar que o documento de resumo não é regravado (mesmo updateTime). Novo CI pendente. Plano para liberar: migrar ou encerrar gravações V1, negar novas gravações V1 em regras, executar suíte V1/V2 revisada e então avaliar deploy com backup e rollback. Nenhuma dessas etapas de liberação foi executada.

## Gate de prontidão para desligar V1
CI #585: functions-trigger-emulator, functions-emulator, functions-package e unit-tests aprovados; firestore-rules ainda 32/34 por duas falhas V1. Criado `v1-retirement-readiness.js`, checklist que só retorna `ready:true` quando sete evidências explícitas forem confirmadas: inventário de sessões, backups, sessões V1 ativas resolvidas, piloto V2 no navegador, estratégia offline V2, regras V2 e rollback ensaiado. Testes cobrem ausência e cada gate falso. **O checklist não comprova as evidências por si, não altera Firestore e não autoriza deploy automático.** CI do novo commit pendente.

## Inventário V1/V2 (classificador local)
CI #593 estava em fila na consulta. Criado `v1-retirement-inventory.js` com `inventorySessionRows(rows)` para classificar sessões V1/V2 ativas/concluídas, identificar status/schema desconhecidos e divergência de ID, sem alterar dados. Testes adicionados ao CI. **Ainda não existe coleta paginada de dados reais do Firestore, não foram obtidas contagens reais de usuários nem conferidos backups.** O gate `inventoryComplete` permanece não comprovado. Próxima etapa: leitor Admin somente leitura, paginação por usuário e relatório anonimizado, em ambiente autorizado. Sem deploy.

## Adaptador de inventário administrativo paginado
Adicionado `v1-retirement-inventory-admin.js`, que recebe uma instância autorizada do Firestore Admin e um UID específico, lê apenas `users/{uid}/sessions` ordenado por ID, pagina via `startAfter` e produz contagens agregadas por meio do coletor. Não há endpoint público, credenciais embutidas ou gravação. Testes do coletor e do adaptador incluídos no `npm test`. CI ainda pendente; não houve consulta real à produção. Atenção: o limite `maxPages` pode devolver `complete:false`, que não deve habilitar o gate de inventário. Próximo passo: teste real no emulador e revisão de limites/permissões antes de qualquer uso autorizado.

## Inventário consolidado por lista de usuários
Criado `v1-retirement-inventory-users.js` para somar relatórios individuais de uma lista explícita de UIDs, retornando apenas contagens, anomalias e número de usuários examinados. Não inclui identificadores no resultado, não descobre usuários automaticamente, não consulta produção e não altera documentos. Teste unitário incluído no CI. **Uma lista incompleta de usuários não permite considerar o inventário global completo**, mesmo se `complete:true` indicar apenas paginação integral da lista fornecida. CI pendente, sem deploy.

## Descoberta limitada via Firebase Auth
CI #627 confirmou unit-tests, functions-package, functions-emulator e functions-trigger-emulator aprovados; firestore-rules ainda falha por duas verificações V1. Implementado `inventoryAuthUsers` usando `auth.listUsers` com tamanho e número máximo de lotes, agregação sem UID no resultado e indicação `complete:false` se a paginação Auth ou de sessões for interrompida. Testes cobrem duas páginas, limite e UID duplicado. **Somente usuários enumeráveis pelo Firebase Auth entram no escopo**; contas/sessões órfãs no Firestore não estão cobertas. Não foi executado contra produção. CI novo pendente, sem deploy.

## Auditoria de proprietários órfãos
CI #637: quatro jobs aprovados; Firestore Rules segue falhando pelos dois testes V1 conhecidos. Criados `v1-retirement-orphan-audit.js` (auditoria pura) e `v1-retirement-orphan-firestore.js` (collectionGroup('sessions') + Firebase Auth getUser). O adaptador percorre sessões por páginas, conta UIDs distintos, considera órfão somente `auth/user-not-found` e propaga falhas de Auth. Relatório sem identificadores; `complete:false` quando limite de páginas impede cobertura. Testes unitários adicionados ao npm test. **Cautelas**: coleção de mesmo nome em outros caminhos é registrada como caminho inválido; consumo de leituras e memória de UIDs crescem com o volume; cobertura e permissões devem ser revisadas antes de execução autorizada. Nenhuma consulta à produção ou deploy.

## Teste integrado de órfãos no Firestore Emulator
Adicionado teste `tests/v1-retirement-orphan-firestore-emulator.test.mjs` com sessões fictícias em dois usuários e mock de `auth.getUser` (um ausente), executando consulta real ao Firestore Emulator com paginação de 2 documentos. Integrado ao job `functions-emulator`. O teste não consulta Firebase Auth real; testa a lógica de verificação de proprietários com mock. CI #647 ainda na fila na última consulta, CI novo pendente. Não houve consulta à produção ou deploy.

## Relatório consolidado de auditoria
Criado `v1-retirement-audit-report.js`: recebe resultados de inventário e auditoria de proprietários órfãos, valida contagens, retorna indicadores agregados e bloqueios (paginação incompleta, V1 ativa, esquema desconhecido, proprietário órfão, caminhos inválidos). `readyForReview` é apenas elegibilidade para revisão manual, **não** aprovação de migração ou deploy; não substitui as sete condições do gate `assessV1Retirement`. Testes incluídos no npm test. CI #653 estava na fila na última consulta; novos commits ainda pendentes. Sem acesso à produção.

## Painel administrativo de auditoria (protótipo local)
Criado `admin-audit.html` em preto e laranja, separado do app de treinos, com importação manual de JSON agregado. `v1-retirement-audit-dashboard.js` valida métricas, bloqueios conhecidos e estado somente leitura; DOM renderizado via `textContent` para evitar injeção HTML. O painel não consulta Firebase, não possui autenticação própria nem autoriza deploy/migração. **Não publicar `admin-audit.html` como interface administrativa aberta em produção**; para uso real exigir controle de acesso, isolamento de hosting e trilha de auditoria. Testes incluídos no CI. CI #660: quatro jobs aprovados, Firestore Rules ainda falha em V1; novo CI pendente.

## Política preliminar de acesso administrativo
Criado `v1-retirement-audit-access.js` com regra de negação por padrão: somente ambiente `emulator`, identidade com e-mail verificado e UID presente em allowlist explícita. Testes de negação para produção, conta não verificada e UID não autorizado. **Esta é apenas uma função pura, ainda não integrada a um endpoint, autenticação Firebase real ou ao painel HTML.** Não concede proteção ao arquivo estático nem permite executar inventário de produção. CI #670 estava na fila; novos commits pendentes. Sem deploy.

## Handler HTTP administrativo (não exposto)
Criado `functions/audit-report-handler.js`, handler injetável com POST obrigatório, Bearer token, verificação de token, autorização no servidor e relatório gerado apenas após autorização. Retorna 401/403/405/503 sem expor erros internos. Testes unitários garantem que requisições não autorizadas não executam o relatório. **Ainda não há endpoint exportado no functions/index.js, nem verificação real Firebase Admin ou ligação ao inventário.** A implementação é um componente preparatório, não serviço acessível; produção permanece bloqueada. CI #678 estava na fila; novos commits pendentes.

## Firebase Admin Auth no handler de emulador
CI #686: quatro jobs aprovados, Firestore Rules continua falhando nos testes V1. Criado `functions/audit-report-emulator-service.js` para verificar ID token com `verifyIdToken(token,true)`, consultar conta atual via `getUser`, negar usuários desabilitados, sem e-mail verificado ou fora da allowlist e só então executar gerador de relatório injetado. Testes usam mocks de Admin Auth e verificam que acessos negados não geram relatórios. **Não é um endpoint exportado, não há conexão ainda ao inventário e não foi feito teste end-to-end com Auth Emulator.** CI novo pendente; sem deploy.

## Composição de auditoria agregada
`v1-retirement-audit-assembly.js` reúne o inventário paginado de contas Firebase Auth e a auditoria de sessões órfãs no Firestore e entrega ao gerador de relatório agregado. Teste com fontes vazias simuladas incluído no npm test. **Ainda não está conectado ao handler administrativo e não representa auditoria de produção.** Mesmo que `readyForReview` seja verdadeiro, o gate de sete critérios de aposentadoria da V1 continua obrigatório. Sem deploy.

## Composição de endpoint protegido (ainda sem exportação)
`functions/audit-report-protected-endpoint.js` compõe o handler HTTP e o serviço Admin Auth com gerador de relatório injetável, permitindo testes de autorização antes da leitura. Não há importação direta do módulo raiz de inventário dentro de Functions (restrição de empacotamento), nem export em `functions/index.js`; portanto **a conexão efetiva com inventário Firestore/Auth e o endpoint emulado ainda não foram concluídos**. Teste com mocks adicionado. CI #702 em andamento na consulta; sem deploy.

## Provider de auditoria no backend
Criado `functions/audit-provider.js`, compositor de fontes injetadas, e teste garantindo que nenhum scan ocorre antes da autorização do endpoint protegido. CI #710: quatro jobs aprovados e regras Firestore V1 ainda reprovadas. **Ainda não foram importadas/empacotadas as implementações reais do inventário no diretório functions**, nem criado endpoint acessível ou testes Auth+Firestore end-to-end. Sem deploy.
