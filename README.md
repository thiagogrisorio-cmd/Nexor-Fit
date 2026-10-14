# Nexor Fit — Full Body 4x

Ficha interativa de treino Full Body 4 vezes por semana.

Abra o site pela URL do GitHub Pages após ativar a publicação em **Settings → Pages → Deploy from a branch → main → /(root)**.

A ficha oferece login Google e e-mail/senha, cadastro e recuperação de senha. Ao entrar, cargas, marcações e histórico são sincronizados em tempo real com a conta usando Cloud Firestore. Sem login, continua disponível o modo local.

## Registros antigos

Após entrar na conta, use **Importar registros antigos deste navegador** no mesmo navegador e endereço em que treinava antes. A importação preserva os treinos já existentes na conta e usa identificadores determinísticos para evitar duplicar o histórico. Não limpa os registros locais. Use a mesma conta nos outros aparelhos.

## Firebase

- Projeto: `nexor-fit-app`, plano Spark.
- Firestore Standard: `(default)`, `southamerica-east1`.
- Domínio autorizado do site: `thiagogrisorio-cmd.github.io`.
- Dados: `users/{uid}/workouts/{0..3}` e `users/{uid}/history/{session}`.
- Regras negam acesso sem login e entre contas; validam tipos, campos e limites nas criações e atualizações.
- Conclusão e histórico são gravados em uma transação; o ID da sessão impede duplicatas entre aparelhos.
- Alterações na conta exigem conexão. O site informa falhas; não apresenta uma gravação rejeitada como concluída.
- `firebase-config.js` contém apenas configuração pública do cliente. Nunca coloque credenciais administrativas no site.

Para alterar o backend, execute na pasta do projeto:

```powershell
npx -y firebase-tools@latest deploy --only firestore,auth --project nexor-fit-app
```

A hospedagem permanece no GitHub Pages. Revise as regras de segurança antes de disponibilizar o app a um público amplo. Demonstrações abrem buscas no YouTube.
