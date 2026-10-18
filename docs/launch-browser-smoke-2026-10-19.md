# Nexor Fit — ensaio obrigatório de navegador (19/10/2026)

**Estado:** NÃO EXECUTADO. Este documento é um roteiro de aceitação, não evidência de aprovação. Nenhum deploy de produção é autorizado por este documento.

## Ambiente
- Usar build da branch `feature/workout-sessions-v1` no SHA exato registrado no ensaio.
- Servir a aplicação por HTTP(S) local; nunca abrir `index.html` por `file://`.
- Usar somente projeto Firebase de teste e emuladores Auth/Firestore; não apontar testes destrutivos ao projeto de produção.
- Preparar duas contas de teste A/B, navegador com DevTools e rede controlável; registrar data, SHA, navegador, URL, resultado e capturas/logs sem tokens.
- Iniciar emuladores Auth/Firestore com `npx firebase emulators:start --project demo-nexor-fit-rules-test --only auth,firestore` e servir o diretório por HTTP local (por exemplo, `python3 -m http.server 8000`). Abrir `http://localhost:8000/?nexorEmulators=1`. O modo é explicitamente limitado a `localhost`, `127.0.0.1` ou `[::1]`; confirmar no painel de rede que Auth usa `127.0.0.1:9099` e Firestore usa `127.0.0.1:8080` antes de criar dados. Sem o parâmetro, a aplicação usa a configuração Firebase normal. **Não executar operações destrutivas sem confirmar os endpoints locais.**

## Sequência P0-E (registrar PASS/FAIL por etapa)
1. **Autenticação e isolamento:** login A; verificar UID e estado; sair; login B; nenhuma sessão, fila ou dados de A visíveis em B.
2. **Criar V2:** login A; iniciar treino; verificar pai `schemaVersion=2`, ausência de `sets` no pai e exatamente 12 documentos `exercises/0..11`, cada um com duas séries e revisão válida.
3. **Editar e desfazer:** marcar e desmarcar série online; confirmar incremento de revisão, `done` e `completedAt` coerentes no Firestore; recarregar página e conferir estado.
4. **Concluir e histórico:** finalizar sessão; verificar status concluído, resumo/histórico após recarga e impossibilidade de editar sessão concluída.
5. **Concorrência:** abrir a mesma sessão em duas abas; editar mesma série com revisão antiga; uma escrita deve ser recusada ou reconciliada sem perda silenciosa.
6. **Offline/reconexão:** abrir treino online para carregar revisão-base; desligar rede; editar uma série; verificar pendência IndexedDB; reconectar; conferir escrita remota, confirmação e remoção da fila somente após confirmação. Repetir com rede caindo após gravação para exigir preservação/diagnóstico, sem descarte automático.
7. **Troca de conta:** com operação offline pendente de A, sair e entrar em B; garantir que nenhuma operação de A seja aplicada a B; retornar a A e verificar a pendência.
8. **Legado V1:** criar documento histórico V1 somente com contexto administrativo do emulador; verificar leitura e migração transacional para V2 com backup imutável; tentar criação/atualização V1 autenticada e exigir negação.
9. **Rollback:** ensaiar retorno ao build anterior **sem** reabilitar gravações V1 ou sobrescrever V2; se o build anterior não suporta V2 com segurança, rollback deve ser suspensão de novas gravações/indisponibilidade controlada, não downgrade de dados.

## Critérios de bloqueio
- Qualquer erro de autenticação, vazamento entre contas, perda de fila, gravação V1 permitida, corrupção de série ou rollback inseguro = **NO-GO**.
- Sem execução real de todos os itens, evidências do emulador e CI verde no SHA final = **NO-GO**.
- **GO** exige registro assinado do ensaio e autorização humana explícita antes de merge/deploy.

## Registro de execução
| Campo | Resultado |
| --- | --- |
| SHA testado | Pendente |
| Navegador / versão | Pendente |
| Ambiente / URL de teste | Pendente |
| Auth/Firestore emuladores verificados | Pendente |
| Etapas 1–9 | Não executadas |
| Evidências e logs | Pendentes |
| Responsável / aceite | Pendente |
| Decisão | **NO-GO** |
