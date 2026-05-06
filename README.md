# Betterman

A lightweight, local Postman alternative. Build, save, and run API requests with a fast localhost web app backed by SQLite.

## Quick Start

```bash
# Terminal 1: Backend API
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend UI
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — the frontend proxies API calls to port 8000.

## Features

- **Collections** — organize requests into named collections
- **Environments** — variable sets (`{{base_url}}`, `{{token}}`), switch per collection or use global defaults
- **Request Builder** — method, URL, headers, query params, body (JSON/XML/raw/form-data/urlencoded/GraphQL)
- **Auth Helpers** — bearer, basic, API key, digest, OAuth 2.0
- **Variable Resolution** — `{{var}}` resolved recursively: session → environment → collection → global
- **Pre/Post Scripts** — Python scripts with `response.json()`, `extract_var()`, `env()`, `log()`
- **Response Viewers** — JSON tree (collapsible, copy-path), Markdown, HTML, XML, CSV, images, raw
- **Import** — paste curl commands or Postman v2.1 collections
- **Export** — any request as curl
- **Local SQLite** — everything saved in `backend/betterman.db`

## Script API

Available in pre-request and post-response Python scripts:

```python
# Post-response script example
data = response.json()
extract_var("auth_token", data["token"])
log("Got token:", data["token"][:10])

# Pre-request script example
base = env("base_url", "http://localhost")
log("Using base URL:", base)
```

| Function | Description |
|----------|-------------|
| `response.json()` | Parse response body as JSON |
| `response.status_code` | HTTP status code |
| `response.headers` | Response headers dict |
| `response.text` | Raw response body |
| `request.url` | Resolved request URL |
| `request.method` | HTTP method |
| `extract_var(key, value)` | Store variable for downstream requests |
| `env(key, default)` | Read environment variable |
| `log(...)` | Print debug output in response panel |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET/POST` | `/api/environments` | List / create environments |
| `GET/PUT/DELETE` | `/api/environments/{id}` | Single env CRUD |
| `GET/POST` | `/api/collections` | List / create collections |
| `GET/PUT/DELETE` | `/api/collections/{id}` | Single collection CRUD |
| `GET/POST` | `/api/requests?collection_id=` | List / create requests |
| `GET/PUT/DELETE` | `/api/requests/{id}` | Single request CRUD |
| `POST` | `/api/execute` | Execute request via backend proxy |
| `POST` | `/api/import/curl` | Parse and import curl command |
| `POST` | `/api/import/postman` | Import Postman v2.1 JSON |
| `GET` | `/api/export/curl/{id}` | Export request as curl |
| `POST` | `/api/resolve-variables` | Preview variable resolution |
| `GET/DELETE` | `/api/session-variables` | Manage session variables |

Interactive API docs: **http://localhost:8000/docs**

## Project Structure

```
betterman/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── database.py          # SQLite connection + schema
│   ├── models.py            # Pydantic models
│   ├── routes/
│   │   ├── collections.py
│   │   ├── environments.py
│   │   ├── requests.py
│   │   ├── execute.py
│   │   ├── import_export.py
│   │   └── session_variables.py
│   ├── services/
│   │   ├── auth.py
│   │   ├── curl_parser.py
│   │   ├── postman_importer.py
│   │   ├── script_runner.py
│   │   └── variable_resolver.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
│   │       ├── Sidebar.jsx
│   │       ├── RequestPanel.jsx
│   │       ├── ResponsePanel.jsx
│   │       ├── EnvironmentBar.jsx
│   │       ├── EnvironmentEditor.jsx
│   │       ├── ImportDialog.jsx
│   │       └── viewers/
│   │           ├── JsonViewer.jsx
│   │           ├── MarkdownViewer.jsx
│   │           ├── HtmlViewer.jsx
│   │           ├── XmlViewer.jsx
│   │           ├── CsvViewer.jsx
│   │           ├── ImageViewer.jsx
│   │           └── RawViewer.jsx
│   ├── package.json
│   └── vite.config.js
└── start.sh
```
