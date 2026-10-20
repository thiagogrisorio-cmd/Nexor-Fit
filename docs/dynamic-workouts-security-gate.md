# NEXOR FIT 2.0 — Gate de segurança para treinos dinâmicos

Status: **BLOQUEADO PARA ATIVAÇÃO** (somente código opt-in na branch).

## Estado verificado em 2026-10-19
- `firestore.rules` não possui `match /users/{uid}/workoutPlans/{planId}`, `dynamicSessions/{sessionId}` nem `dynamicSessionControl/{controlId}`.
- A regra final `match /{document=**} { allow read, write: if false; }` nega esses caminhos.
- Portanto, os novos repositórios não estão utilizáveis por clientes Firebase com as regras atuais. Não contornar via privilégios administrativos.
- Os testes atuais usam transações simuladas; não substituem testes do emulador de regras, nem provam atomicidade real entre dispositivos.

## Critérios obrigatórios antes da integração
1. Especificar esquema exato, limites e campos permitidos para `workoutPlans`, `dynamicSessions` e `dynamicSessionControl`.
2. Garantir owner-only e impedir alterações de `uid`, `id`, `origin`, snapshots históricos e identificadores de sessão.
3. Criar regras de validação e testes com Firebase Emulator para: proprietário autorizado, outro usuário negado, usuário anônimo negado, ID duplicado, revisão obsoleta, sessão ativa concorrente, documento malformado e tentativa de exclusão física.
4. Confirmar a semântica de transação real, inclusive retry após falha de rede, e impedir que sessão antiga seja reescrita por edição de plano.
5. Definir encerramento transacional de sessões dinâmicas, com liberação segura do ponteiro ativo; não ativar criação sem caminho de encerramento e recuperação.
6. Validar leitura V1/V2 e treino legado A/B/C/D sem migração destrutiva.
7. Obter exportação recuperável e teste de restauração em ambiente isolado, mediante autorização explícita; cache offline e `sessionBackups` parciais não comprovam backup.
8. Executar CI, testes de emulador, smoke em navegador e aprovação explícita antes de qualquer publicação.

## Preservação
Nenhuma regra existente, dado real, histórico, rotina legada ou configuração Firebase foi alterada por este documento.
