# Continuidade do Nexor-Fit — 11/11/2026

Base: `feature/workout-sessions-v1` em `72410fd`. Produção e dados reais não foram alterados.

## Implementação

- Fichas privadas em `users/{uid}/trainingPlans/{0..3}`, com revisão transacional e validação integral das 12 posições. O editor mantém a estrutura de 12 exercícios × 2 séries; planos dinâmicos de até 100 exercícios continuam fora deste incremento.
- Alterações de ficha valem somente para novas sessões. A prescrição fica copiada em cada sessão nova e é imutável nas regras. Sessões antigas continuam legíveis, usando a ficha padrão original como referência.
- Evolução de cargas consulta até 50 sessões recentes e até 12 correspondentes ao treino/exercício selecionado. Mostra a maior carga de séries concluídas, sem inventar repetições, volume ou cargas ausentes. Exercícios renomeados não são misturados com históricos de nomes diferentes.
- A sessão escuta revisões dos 12 documentos filhos. Eventos são agrupados e assinaturas são encerradas na troca de conta/sessão. Após o replay offline, a tela recarrega dados confirmados e revisões de base.
- Contador e próximo treino incluem as sessões V2. A consulta da contagem é separada das leituras do histórico; nenhuma Function nova é necessária para essas funcionalidades.
- Editor e evolução com layout móvel, foco visível, alvos de toque, tabela acessível e redução de movimento. Status de sincronização visível também após login.
- Confirmação de conclusão dentro do aplicativo com `<dialog>`, cancelamento por teclado e revalidação da conta/sessão após a confirmação.
- Testes de regras executados em sequência e com limpeza de projetos `demo-nexor-*` exclusivamente no emulador, para repetição determinística.

## Verificação

- Testes unitários existentes e novos aprovados; testes de política de emuladores aprovados.
- 65 testes de regras aprovados no emulador, incluindo negação entre contas, validação de todas as posições, revisão obsoleta e snapshot imutável.
- 6 testes administrativos de integração aprovados nos emuladores de Auth/Firestore. Pacote de Functions carregado com sucesso; nenhuma Function foi implantada.
- Navegador: cadastro local, edição da ficha, persistência após recarregar, criação de sessão com a ficha personalizada, gravação de carga/série e preservação da prescrição após nova edição foram verificados.
- **Pendente:** conclusão na interface, gráfico com histórico real de teste, duas abas simultâneas e QA móvel. Uma confirmação nativa antiga travou a automação; foi solicitada intervenção para fechá-la. A confirmação foi substituída no código por diálogo acessível, ainda pendente de smoke completo.
- Testes com dados locais não substituem inventário/backup verificável e ensaio de rollback dos dados reais para o lançamento V2.

## Estado de publicação

Rascunho para revisão. Não realizar merge/deploy enquanto o smoke restante, CI e gates de migração/rollback documentados não estiverem concluídos. O plano Spark foi preservado.

## Regras de segurança (protótipo)

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for private training plans and immutable session prescriptions through authenticated ownership, bounded schemas, revision checks and validation on creates and updates. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.
