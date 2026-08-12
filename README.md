# DivulgaMap

Aplicativo de descoberta de negócios locais de Taquara/RS. TCC — [seu nome aqui].

Este repositório contém as duas partes do projeto:

- **`divulgamap-backend/`** — API REST (Node.js + Express + PostgreSQL)
- **`divulgamap-app/`** — aplicativo mobile (React Native + Expo)

## 🌐 Ambiente em produção (homologação)

| Recurso | Link |
|---|---|
| API (backend) | `https://SUBSTITUIR.onrender.com` |
| APK para instalação (Android) | `https://SUBSTITUIR-link-do-eas-build` |
| QR Code de instalação | ver Dossiê de Recursos e Artefatos |

> O aplicativo já vem configurado para falar com a API de produção acima —
> **não é necessário estar na mesma rede Wi-Fi nem trocar nenhum IP** para testar.

## 🔑 Credenciais de teste

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `SUBSTITUIR` | `SUBSTITUIR` |
| Usuário comum | `SUBSTITUIR` | `SUBSTITUIR` |

## 🗄️ Banco de dados

O script de criação das tabelas está em [`divulgamap-backend/schema.sql`](./divulgamap-backend/schema.sql).
Para recriar o banco do zero:

```bash
psql "<connection-string-do-postgres>" -f divulgamap-backend/schema.sql
```

## ▶️ Rodando localmente

### Backend

```bash
cd divulgamap-backend
npm install
cp .env.example .env   # preencha com suas próprias credenciais de banco
npm run dev
```

Variáveis de ambiente necessárias (`.env`):

```
PORT=3000
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=5432
DB_NAME=
JWT_SECRET=
EMAIL_USER=
EMAIL_SENHA_APP=
```

### App mobile

```bash
cd divulgamap-app
npm install
npx expo start
```

Por padrão, `src/services/api.js` aponta para a API de produção (Render). Para testar
contra um backend rodando local, troque o `baseURL` pelo IP da sua máquina na rede
local (ex: `http://192.168.0.10:3000`) — instruções completas no guia de implementação
do projeto.

## 📂 Estrutura de rotas da API

| Rota | Descrição |
|---|---|
| `POST /auth/cadastro` | Cria um novo usuário |
| `POST /auth/login` | Autentica e retorna token JWT |
| `/empresas` | CRUD de empresas cadastradas |
| `/produtos` | CRUD de produtos/ofertas |
| `/promocoes` | Promoções ativas |
| `/salvos` | Itens salvos/favoritos do usuário |
| `/avaliacoes` | Avaliações de empresas |
| `/horarios` | Horários de funcionamento |
| `/listas` | Listas/categorias |

## 🛠️ Stack técnica

- **Backend:** Node.js, Express 5, PostgreSQL (`pg`), JWT (`jsonwebtoken`), `bcrypt`
  para hash de senha, `nodemailer` para e-mails, `multer` para upload de arquivos.
- **App:** React Native (Expo SDK), React Navigation, Axios, AsyncStorage,
  `react-native-maps` + `expo-location`.

## 📄 Licença

Ver [LICENSE](./LICENSE).
