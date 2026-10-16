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
