# Prompt System Pro

Sistema de prompts técnicos + Groq. 1 serviço Render (Free).

## Deploy no Render

| Campo | Valor |
|-------|-------|
| **Type** | Web Service |
| **Name** | prompt-system-pro |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free |

**Environment Variables:**
- `GROQ_API_KEY` = sua_chave_do_groq

## Estrutura

- `/` → Frontend React
- `/api/*` → Backend API
- `/health` → Health check

## Desenvolvimento Local

```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
cd frontend
npm install
npm start
