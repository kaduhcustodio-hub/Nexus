# NEXUS + Firebase — configuração rápida

## 1. Criar o projeto
1. Abra o Firebase Console.
2. Crie um projeto.
3. Registre um aplicativo Web.
4. Copie o objeto `firebaseConfig` para `firebase-config.js`.

## 2. Authentication
Ative **Authentication > Sign-in method > Email/Password**.

O NEXUS usa o Firebase Authentication para login, persistência de sessão e verificação de e-mail. O Firebase envia um **link de verificação**; o fluxo de código numérico de 6 dígitos exige um backend/Cloud Function de envio de e-mail separado.

## 3. Firestore
Crie um banco Cloud Firestore e publique `firestore.rules`.

## 4. Storage
Ative Cloud Storage e publique `storage.rules`. O Storage é usado para fotos de perfil, imagens/vídeos de posts e imagens das mensagens.

## 5. Criar o administrador
1. Crie manualmente a conta do administrador em Authentication.
2. Crie o documento correspondente em `users/{UID}` com, no mínimo:

```json
{
  "uid": "UID_DO_ADMIN",
  "usuario": "admin",
  "nome": "Carlos Admin",
  "email": "seu-email-admin@exemplo.com",
  "cargo": "Administrador",
  "role": "admin",
  "foto": "user_comun.png",
  "bio": "Administrador do sistema NEXUS."
}
```

O painel admin não usa mais senha fixa no JavaScript. O acesso é controlado pela autenticação do Firebase e pelo campo `role: "admin"`.

## 6. Deploy
Coloque estes arquivos juntos: `index.html`, `script.js`, `style.css`, `firebase-config.js` e `user_comun.png`.

## Observações
- O NEXUS não usa mais `localStorage` para usuários, posts, mensagens, comentários, seguidores, fotos ou sessão manual; os dados sociais são armazenados no Firestore e os arquivos no Cloud Storage.
- A sessão é gerenciada pelo Firebase Authentication.
- O tema visual não é persistido localmente nesta versão.
- Os botões **CURTIR** e **DESCURTIR** usam a coleção `postVotes`, com um voto por usuário por post.
- A exclusão de usuários do Authentication exige ambiente administrativo/server-side; o painel do navegador não deve receber credenciais de Service Account.
