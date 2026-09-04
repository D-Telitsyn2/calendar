# Задание для Copilot: автозапуск очереди чата календаря

Репозиторий: https://github.com/D-Telitsyn2/calendar  
Нужно, чтобы после сообщения в чате на сайте GitHub Action `Process agent chat` запускался сам. Встроенный schedule GitHub ненадёжный — его не использовать как основной механизм.

Пустой запуск Action **не** создаёт агента Cursor и **не** деплоит Firebase. Он только читает Firestore: есть ли `pending`. Если нет — сразу выходит.

## Сделать

### 1. Fine-grained PAT

1. https://github.com/settings/personal-access-tokens
2. Fine-grained token, срок по желанию.
3. Resource owner: `D-Telitsyn2`.
4. Only select repositories: `calendar`.
5. Permissions → Actions: **Read and write**. Остальное не давать.
6. Скопировать токен.

### 2. Токен в Firestore (сайт сам будит Action после отправки)

1. Firebase Console → проект `calendar-399d9` → Firestore.
2. Коллекция `config`, документ `githubDispatch`.
3. Поле `token` (string) = PAT из шага 1.
4. Клиенты из allowlist чата могут его прочитать. Поэтому только Actions write, не `contents`.

После деплоя правил Firestore сообщение из чата сразу дергает  
`POST /repos/D-Telitsyn2/calendar/actions/workflows/process-agent-chat.yml/dispatches`  
с телом `{"ref":"main"}`.

Если браузер упрётся в CORS — шаг 3 всё равно закроет дыру.

### 3. Внешний cron каждую минуту (обязательный запасной путь)

Сервис вроде https://cron-job.org (бесплатно).

- Метод: POST
- URL: `https://api.github.com/repos/D-Telitsyn2/calendar/actions/workflows/process-agent-chat.yml/dispatches`
- Заголовки:
  - `Authorization: Bearer <PAT>`
  - `Accept: application/vnd.github+json`
  - `X-GitHub-Api-Version: 2022-11-28`
  - `Content-Type: application/json`
- Тело: `{"ref":"main"}`
- Расписание: каждую минуту

Проверка curl:

```bash
curl -X POST \
  -H "Authorization: Bearer PAT" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/D-Telitsyn2/calendar/actions/workflows/process-agent-chat.yml/dispatches \
  -d '{"ref":"main"}'
```

Ожидание: HTTP 204. Потом в https://github.com/D-Telitsyn2/calendar/actions/workflows/process-agent-chat.yml появляется run `workflow_dispatch`.

### 4. Не делать

- Не включать Blaze / Cloud Functions.
- Не класть PAT в код, `.env` фронта, README.
- Не давать токену права на contents/admin.
- Не учащать GitHub `schedule:` в yaml — он всё равно пропускает запуски.

### 5. Критерий готовности

1. Написать в чат сайта под `frontend@calendar.ru`.
2. Без ручного Run workflow статус в Firestore уходит с `pending` на `starting`/`started` за ~минуту.
3. Пустой cron не создаёт новых агентов на cursor.com/agents.
