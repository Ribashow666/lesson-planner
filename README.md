# ✦ Planejar — Sistema de Gerenciamento de Planos de Aula

> Desafio técnico: plataforma pedagógica com IA integrada para geração automática de conteúdos.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 20 + Express 4 |
| Banco de Dados | SQLite (via sql.js) |
| IA / Smart Assist | OpenRouter API (modelos gratuitos) |
| Frontend | SPA puro (HTML + CSS + JS vanilla) |
| Servidor Web | Nginx (proxy reverso) |
| Containerização | Docker + Docker Compose |
| CI | GitHub Actions |
| Logs | Winston (JSON estruturado) |

---

## Funcionalidades

### CRUD de Planos de Aula
- ✅ Listagem com paginação (10 por página)
- ✅ Criação, edição e exclusão de planos
- ✅ Campos: Título, Objetivo, Ementa, Data Prevista, Disciplina, Conteúdos, Recursos de Apoio, Tags

### Smart Assist (IA Pedagógica)
- ✅ Botão "Gerar Recomendações" no formulário
- ✅ Envia Título + Disciplina + Ementa para o backend
- ✅ Backend consulta a OpenRouter API com prompt de Assistente Pedagógico
- ✅ Retorna: Conteúdos complementares, Recursos de apoio, 3 Tags recomendadas
- ✅ Preenche os campos automaticamente
- ✅ Loading state visual enquanto a IA processa
- ✅ Tratamento de erros (timeout, falha da API, resposta inválida)

### Organização e Consulta
- ✅ Filtros por Disciplina, Tag e Data Prevista (período)
- ✅ Busca por Título
- ✅ Ordenação por Título, Data de Cadastro ou Data Prevista
- ✅ Direção da ordenação (crescente/decrescente)

### Diferenciais Implementados
- ✅ **Docker** — `docker compose up` sobe tudo
- ✅ **CI/CD** — GitHub Actions roda ESLint + health check a cada push
- ✅ **Logs estruturados** com Winston (JSON, com timestamp, latência da IA, token usage)
- ✅ **Health Check** — endpoint `/health`
- ✅ **Prompt Engineering** — sistema de prompt detalhado para o Assistente Pedagógico

---

## Como Rodar

### Pré-requisitos
- Docker e Docker Compose instalados
- Chave de API gratuita do OpenRouter ([openrouter.ai/keys](https://openrouter.ai/keys))

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd lesson-planner
```

### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
# Edite .env e preencha OPENROUTER_API_KEY com sua chave real
```

### 3. Suba a aplicação (único comando)
```bash
docker compose up --build
```

A aplicação estará disponível em: **http://localhost:8080**

---

## Estrutura do Projeto

```
lesson-planner/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── database.js        # Conexão e schema SQLite
│   │   ├── middleware/
│   │   │   └── errorHandler.js    # Tratamento global de erros
│   │   ├── routes/
│   │   │   ├── lessonPlans.js     # CRUD completo + filtros/paginação
│   │   │   └── ai.js             # Endpoint Smart Assist
│   │   ├── services/
│   │   │   └── aiService.js      # Integração OpenRouter API + prompt engineering
│   │   ├── utils/
│   │   │   └── logger.js         # Winston logger estruturado
│   │   └── index.js              # Entry point Express
│   ├── Dockerfile
│   ├── .eslintrc.json
│   └── package.json
├── frontend/
│   ├── index.html                 # SPA completa
│   ├── nginx.conf                 # Proxy reverso para o backend
│   └── Dockerfile
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI: lint + docker build + health check
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## API REST

### Planos de Aula

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/lesson-plans` | Listar com filtros e paginação |
| `GET` | `/api/lesson-plans/:id` | Buscar plano por ID |
| `POST` | `/api/lesson-plans` | Criar novo plano |
| `PUT` | `/api/lesson-plans/:id` | Atualizar plano |
| `DELETE` | `/api/lesson-plans/:id` | Excluir plano |

#### Query params para listagem
| Param | Tipo | Descrição |
|-------|------|-----------|
| `page` | int | Página (default: 1) |
| `limit` | int | Itens por página (default: 10, max: 100) |
| `search` | string | Busca por título |
| `discipline` | string | Filtro por disciplina |
| `tag` | string | Filtro por tag |
| `date_from` | ISO date | Data prevista de |
| `date_to` | ISO date | Data prevista até |
| `sort_by` | string | `title` \| `created_at` \| `scheduled_date` |
| `sort_order` | string | `asc` \| `desc` |

### Smart Assist

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/ai/recommend` | Gerar recomendações com IA |

#### Body
```json
{
  "title": "Introdução ao OSPF",
  "discipline": "Redes de Computadores",
  "summary": "Protocolo de roteamento dinâmico link-state..."
}
```

#### Response
```json
{
  "data": {
    "contents": "1. Fundamentos de roteamento...",
    "support_resources": "Livro: Computer Networks (Tanenbaum)...",
    "tags": ["redes", "OSPF", "roteamento"]
  }
}
```

### Health Check

```bash
GET /health
# Response: { "status": "ok", "timestamp": "...", "uptime": 123.4 }
```

---

## Exemplo de Log da IA

```json
{
  "timestamp": "2025-01-15 14:32:11",
  "level": "info",
  "message": "AI Request completed",
  "title": "Introdução ao OSPF",
  "discipline": "Redes",
  "tokenUsage": 180,
  "latency": "1.4s",
  "inputTokens": 142,
  "outputTokens": 38
}
```

---

## Decisões Técnicas

### Por que SQLite?
Para um sistema de gerenciamento de planos de aula, o SQLite é suficiente e elimina dependências externas. A biblioteca `sql.js` é pura JavaScript (sem bindings nativos), o que garante compatibilidade total com Docker Alpine sem etapas de compilação.

### Por que SPA vanilla (sem framework)?
O requisito pede uma SPA, mas sem especificar React/Vue/etc. Uma SPA vanilla bem estruturada tem zero build step, carrega instantaneamente e demonstra domínio dos fundamentos do JavaScript — adequado para o contexto do desafio.

### Por que OpenRouter?
O OpenRouter fornece acesso unificado e gratuito a dezenas de modelos de IA (Llama, Mistral, etc.) através de uma única API compatível com OpenAI. O modelo `openrouter/free` seleciona automaticamente o melhor modelo gratuito disponível no momento da requisição.

### Prompt Engineering
O sistema instrui a IA a se comportar como um "Assistente Pedagógico" e a responder **exclusivamente em JSON** com estrutura definida. O backend valida e parseia a resposta com tratamento de fallback via regex caso o modelo inclua formatação extra.

### Segurança
- Chave da API em variável de ambiente (`.env` no `.gitignore`)
- Validação de inputs com `express-validator` em todas as rotas
- CORS configurável via environment

---

## CI/CD

O pipeline no GitHub Actions executa a cada push:
1. **Lint** — ESLint no código do backend
2. **Build** — Constrói as imagens Docker
3. **Health Check** — Sobe o backend e verifica `/health`

---

## Desenvolvimento Local (sem Docker)

```bash
cd backend
npm install
cp ../.env.example .env   # configure OPENROUTER_API_KEY
node src/index.js

# Abra frontend/index.html no browser
# Edite a constante API em index.html para 'http://localhost:3001/api'
```
