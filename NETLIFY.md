# Guia de Implantação no Netlify - IVL App

Para hospedar a **IVL App** no Netlify com sucesso, siga estes passos:

### 1. Preparação do Código
- Certifique-se de que o arquivo `netlify.toml` está na raiz do projeto (eu já o criei para você).
- O arquivo `manifest.json` e `sw.js` em `/public` garantem que o app continue instalável (PWA).

### 2. Configurações no Netlify
Ao conectar seu repositório ou fazer o upload da pasta:
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`

### 3. Variáveis de Ambiente (CRÍTICO)
No painel do Netlify (**Site configuration > Environment variables**), adicione as seguintes chaves:

| Chave | Valor |
|-------|-------|
| `GEMINI_API_KEY` | (Sua chave da API do Google) |

**IMPORTANTE:** Se você encontrar uma **tela branca** após o deploy, verifique:
1. **O arquivo `firebase-applet-config.json`:** Certifique-se de que ele foi incluído no upload ou no seu repositório Git. Ele contém as credenciais de banco de dados.
2. **Erros no Console:** Abra o console do seu navegador (`F12`) na página do Netlify. Eu adicionei um sistema de captura de erros que deve mostrar uma mensagem vermelha na tela explicando o que falhou.
3. **Versão do Node:** Garanti que o Netlify use `NODE_VERSION = 20` via `netlify.toml`.

### 4. Suporte a SPA e PWA
O arquivo `netlify.toml` já inclui:
- Regra de redirecionamento `/* /index.html 200` (evita erros 404 ao atualizar).
- Configuração de build automático.
- Registro do Service Worker (`sw.js`) e Manifesto (`manifest.json`).

---
**Suporte IVL System**
v3.0 • Tecnologia de Ponta
