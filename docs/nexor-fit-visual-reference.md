# NEXOR FIT 2.0 — Referência visual aprovada

Referência fornecida pelo proprietário em 19/10/2026: colagem de 12 telas do NEXOR FIT em tema escuro. Este documento registra a direção de design; **não** autoriza deploy, migração, substituição do aplicativo ou alteração de regras Firestore.

## Linguagem visual
- Mobile-first; superfícies pretas (#050607 aproximado) e cartões grafite (#11151B aproximado).
- Laranja vibrante (#FF851B aproximado) para CTA, progresso e estado selecionado; branco para títulos; cinza para metadados.
- Tipografia forte, hierarquia nítida, cartões com cantos arredondados e bordas discretas.
- Fotografia de musculação como apoio; nunca impedir leitura, navegação ou acessibilidade.
- Botões de ação grandes, áreas de toque acessíveis, contraste suficiente e estados de carregamento/erro/offline.

## Telas da referência
1. Login: marca, login Google, e-mail, criar conta.
2. Home: saudação, próximo treino, indicadores e última sessão.
3. Seleção de treinos: cards e início de sessão.
4. Treino em andamento: cronômetro, progresso, exercícios e séries.
5. Exercício: vídeo/demonstração, carga, repetições e conclusão de série.
6. Série concluída: confirmação e próximo descanso.
7. Descanso entre séries: contagem regressiva, ajuste e pular.
8. Exercício concluído: resumo e próximo exercício.
9. Próximo exercício: progresso e início.
10. Histórico: filtros, indicadores e sessões.
11. Evolução: gráficos de carga, volume e frequência.
12. Perfil e configurações: conta, descanso, incrementos, notificações e sincronização.

## Requisitos funcionais superiores à imagem
- Os cards Treino A/B/C/D são **somente conteúdo ilustrativo**, jamais padrão obrigatório.
- O usuário pode criar, editar e arquivar planos próprios; receber recomendações após questionário; variar exercícios, séries, repetições, cargas e descansos.
- Sessões finalizadas preservam snapshots históricos imutáveis após alterações de planos.
- Preservar autenticação, Firestore, offline queue, sincronização, histórico e dados legados V1/V2.
- Não presumir 12 exercícios, 2 séries, 4 treinos ou descanso fixo; contadores e progresso derivam dos dados reais.
- Estados vazios, erro, ausência de foto/vídeo, acessibilidade, telas pequenas e conectividade offline devem ser contemplados.
- Não implementar visual em produção antes de aprovar segurança, backups verificáveis e integração dinâmica.

## Estratégia
Aplicar o design progressivamente em componentes/telas isolados, atrás de feature flag, sem substituir o fluxo legado. Primeiro inventariar HTML/CSS/JS atuais e dependências; depois prototipar componentes e validar testes visuais, responsividade e navegação local. Exigir aprovação explícita para ativação.
