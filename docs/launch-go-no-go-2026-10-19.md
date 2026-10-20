# Nexor Fit — decisão de lançamento 19/10/2026

**Meta:** disponibilizar um MVP seguro em 19/10/2026, se e somente se todos os gates obrigatórios forem satisfeitos. Não equivale a autorização para deploy.

## Congelamento imediato
Não desenvolver relatórios administrativos adicionais, métricas cosméticas, melhorias secundárias, nem novos recursos. Prioridade exclusiva: fluxo V2 utilizável, dados íntegros, regras seguras, CI, ensaio de rollback.

## Ordem de execução por impacto
**P0-A — hoje:** reparar regressão do teste de diagnóstico introduzida pelo startup V2 piloto (CI #889: 173/174 unitários; demais jobs de Functions aprovados; Firestore Rules reprovado). Confirmar novo CI.

**P0-B — hoje:** ligar edição V2 offline à fila existente com identidade autenticada, revisão base e confirmação remota; mostrar pendências e conflitos. Não marcar como concluído sem teste navegador/emulador.

**P0-C — hoje:** concluir a virada de fluxo V2 padrão com compatibilidade V1 histórica e migração/backup validada. Sem fila/recibos seguros, restringir funcionalidades offline explicitamente em vez de arriscar perda de dados.

**P0-D — antes de publicar:** desativar criação/atualização V1 em regras Firestore; preservar leitura autorizada de históricos e backups; exigir os dois testes V1 de rejeição aprovados sem removê-los. Verificar regressão V2.

**P0-E — antes de publicar:** testar em navegador e emuladores login, criar treino, marcar/desmarcar, concluir, histórico, concorrência, perda de rede, reconexão, troca de conta e rollback. Exigir CI integralmente verde.

## Go / No-Go
**GO** apenas se: (1) nenhuma gravação V1 permitida, (2) V2 completa o treino com dados íntegros, (3) fila offline/recuperação validada ou offline claramente desabilitado, (4) CI integral verde, (5) rollback testado, (6) aceite humano explícito para deploy.

**NO-GO** se qualquer gate falhar. Não publicar build com regras V1 de validação parcial. Alternativa segura: demonstração em emulador/ambiente isolado e data revisada, nunca anunciar lançamento público.

## Estado no início do plano
Branch `feature/workout-sessions-v1`, sem deploy/merge. CI #889 falhou em `unit-tests` por asserção antiga que proibia qualquer inicialização V2 no HTML, embora agora exista inicialização exclusivamente sob piloto; `firestore-rules` continua com bloqueio conhecido V1. Funções e empacotamento passaram. A correção do teste está em `fa9a1b4`; ainda requer confirmação do novo CI.

## Regra de produtividade
Cada mudança deve desbloquear um gate P0 ou reparar regressão concreta. Sem novos testes de auditoria periférica. Medir avanço por critérios de aceite concluídos e jobs aprovados, não commits.

## Incremento de edição offline V2 — piloto, não liberado
CI #897 confirmou unit-tests, functions-package, functions-emulator e functions-trigger-emulator aprovados; Firestore Rules permanece reprovado. A interface piloto agora prepara em memória revisões dos 12 exercícios ao carregar online e, se ficar offline na mesma sessão, permite enfileirar uma edição por exercício com revisão e token de base; mostra pendências e não recarrega imediatamente o estado otimista. Se não houver revisão conhecida ou já existir edição pendente do exercício, recusa a edição. **Limitações:** baselines só em memória, não suportam reinício offline; a reconciliação e o indicador após reconexão ainda requerem E2E; nenhuma conclusão offline V2. Commits `3a500c7`, `ea6f8db`. CI novo pendente, sem deploy ou merge.
