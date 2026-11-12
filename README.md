# DivulgaMap

Aplicativo mobile para descobrir empresas, produtos e ofertas de Taquara/RS. Trabalho de Conclusão de Curso — Maria Luiza Altenhofen Loth.

O repositório tem duas partes:

- **`divulgamap-backend/`** — API REST (Node.js, Express, PostgreSQL)
- **`divulgamap-app/`** — aplicativo Android (React Native, Expo)

## Para testar

| Recurso | Link |
|---|---|
| API em produção | https://divulgamap.onrender.com |
| Documentação da API (Swagger) | https://divulgamap.onrender.com/docs |
| APK para instalar (Android) | https://lotth00-divulgamap-site.vercel.app/ |

O app já aponta para a API em produção: não precisa de Wi-Fi em comum nem de configurar IP.
A API fica hospedada em plano gratuito e pode levar cerca de 1 minuto para responder na primeira chamada.

## Funcionalidades

- Mapa com empresas por categoria e busca tolerante a erros e acentos
- Perfil da empresa: horários, produtos, ofertas e avaliações
- Cadastro, login e recuperação de senha por e-mail
- Favoritos, listas e histórico
- Painel do empresário (empresa, produtos, ofertas e anúncios) e perfil de administrador

## Tecnologias

- **Backend:** Express 5, PostgreSQL (`pg`), JWT, `bcrypt`, `nodemailer`, `multer`, Swagger UI
- **App:** Expo, React Native, React Navigation, Axios, `react-native-maps`, `expo-location`, `expo-image-picker`

## Licença

Ver [LICENSE](./LICENSE).
