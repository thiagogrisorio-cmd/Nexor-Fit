# Nexor Fit — caminho crítico para lançamento

Status: **bloqueado**. Documento de execução, não autorização de deploy.

## P0 — cortar a dependência de gravação V1
- [ ] Tornar a criação, edição, conclusão e histórico V2 o fluxo padrão autenticado, removendo dependência do parâmetro `nexorV2StartPilot` **somente após** validar paridade no navegador e no emulador.
- [ ] Tratar explicitamente sessões V1 existentes: leitura, backup imutável, migração transacional verificável e recuperação; nenhuma exclusão de originais.
- [ ] Implementar/validar fila offline V2, recibos de confirmação remota, idempotência e conflito entre dispositivos; não prometer modo offline antes disso.
- [ ] Negar **novas** gravações V1 nas regras, preservando leitura histórica necessária; atualizar os testes que exigem rejeição de V1 sem reduzir cobertura dos 12 exercícios.
- [ ] CI `firestore-rules` integralmente aprovado. Nunca neutralizar, ignorar ou remover os dois testes V1 falhos.

## P1 — validar operação real
- [ ] E2E no navegador: autenticação, iniciar treino V2, marcar/desmarcar séries, concluir, visualizar histórico e resumo confiável.
- [ ] Testar concorrência, retomada após desconexão, falhas parciais e rollback usando emuladores e ambiente isolado.
- [ ] Revisar custos e paginação, telemetria sem dados pessoais, políticas de acesso e gatilho Functions V2.
- [ ] Confirmar migração/backup em amostra representativa **sem executar migração destrutiva** e obter aceite explícito de publicação.

## P2 — rollout controlado
- [ ] Pipeline completo verde; checklist de segurança e privacidade; plano de rollback ensaiado.
- [ ] Liberar gradualmente com métricas, critérios de interrupção e responsáveis.
- [ ] Só então considerar merge/deploy.

## Ordem da próxima implementação
1. Mapear pontos de escrita V1 e caminhos do piloto V2 na UI; criar matriz de paridade funcional e lacunas reais.
2. Implementar a menor fatia funcional que elimina dependência V1, com testes de fluxo V2.
3. Resolver migração/offline, depois realizar corte de regras V1 e verificar CI.
4. Validar ponta a ponta e publicar gradualmente.

## Critério de conclusão
Não usar quantidade de testes ou commits como proxy de lançamento. A versão só está pronta quando **não grava V1**, **preserva histórico e backup**, **opera o ciclo V2 completo**, **passa em todos os jobs** e **tem rollback validado**.

Referência: `docs/v1-retirement-plan.md`.