import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const REPO_URL = 'https://github.com/D-Telitsyn2/calendar'
const CURSOR_API = 'https://api.cursor.com/v1/agents'
const AUTOMERGE_MARKER = '<!-- calendar-site-chat-automerge -->'
const PROJECT_ID = 'calendar-399d9'
const BATCH_SIZE = 5

function buildPrompt(message, email) {
  return [
    'Пользователь календаря отпусков просит изменить сайт.',
    `Кто просит: ${email}`,
    '',
    'Задача:',
    message,
    '',
    'Сделай правки в репозитории, открой PR в main.',
    `В описании PR обязательно отдельной строкой: ${AUTOMERGE_MARKER}`,
    'Черновик у PR сними (draft: false), сам не мержи — после зелёных проверок его смержит GitHub Action.',
    'Пиши в стиле репозитория, без лишних файлов и без воды в описании.',
  ].join('\n')
}

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    throw new Error('Нет секрета FIREBASE_SERVICE_ACCOUNT')
  }
  return JSON.parse(raw)
}

async function readApiKey(db) {
  if (process.env.CURSOR_API_KEY?.trim()) {
    return process.env.CURSOR_API_KEY.trim()
  }
  const snap = await db.doc('internal/cursorConfig').get()
  const value = snap.data()?.apiKey
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function cursorAuth(apiKey) {
  return {
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
    'Content-Type': 'application/json',
  }
}

function pickPrUrl(payload) {
  const branches = payload?.git?.branches
  if (!Array.isArray(branches)) {
    return ''
  }
  const withPr = branches.find((item) => typeof item?.prUrl === 'string' && item.prUrl)
  return withPr?.prUrl || ''
}

async function startAgent(apiKey, message, email) {
  const response = await fetch(CURSOR_API, {
    method: 'POST',
    headers: cursorAuth(apiKey),
    body: JSON.stringify({
      prompt: { text: buildPrompt(message, email) },
      name: `Сайт: ${message.slice(0, 60)}`,
      repos: [{ url: REPO_URL, startingRef: 'main' }],
      autoCreatePR: true,
      skipReviewerRequest: true,
    }),
  })

  const rawText = await response.text()
  let payload = {}
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    payload = {}
  }

  if (!response.ok) {
    throw new Error(`Cursor API: ${response.status}. ${rawText.slice(0, 500)}`)
  }

  const agentId = payload.agent?.id || ''
  const agentUrl = payload.agent?.url || (agentId ? `https://cursor.com/agents/${agentId}` : '')
  return { agentId, agentUrl, agentName: payload.agent?.name || '' }
}

async function refreshStarted(db, apiKey) {
  const started = await db.collection('agentRequests').where('status', '==', 'started').limit(20).get()

  for (const doc of started.docs) {
    const agentId = doc.data()?.agentId
    if (!agentId) {
      continue
    }

    const agentResponse = await fetch(`${CURSOR_API}/${agentId}`, { headers: cursorAuth(apiKey) })
    if (!agentResponse.ok) {
      console.error(`Не удалось прочитать агента ${agentId}: ${agentResponse.status}`)
      continue
    }

    const agent = await agentResponse.json()
    const runId = agent.latestRunId
    if (!runId) {
      continue
    }

    const runResponse = await fetch(`${CURSOR_API}/${agentId}/runs/${runId}`, { headers: cursorAuth(apiKey) })
    if (!runResponse.ok) {
      console.error(`Не удалось прочитать запуск ${runId}: ${runResponse.status}`)
      continue
    }

    const run = await runResponse.json()
    const prUrl = pickPrUrl(run)
    const updates = {}
    if (prUrl && prUrl !== doc.data()?.prUrl) {
      updates.prUrl = prUrl
    }

    if (run.status === 'FINISHED') {
      updates.status = 'done'
    }
    if (run.status === 'ERROR' || run.status === 'EXPIRED' || run.status === 'CANCELLED') {
      updates.status = 'error'
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates)
      console.log(`Обновлено ${doc.id}: ${JSON.stringify(updates)}`)
    }
  }
}

async function processPending(db, apiKey) {
  const pending = await db
    .collection('agentRequests')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .limit(BATCH_SIZE)
    .get()

  if (pending.empty) {
    console.log('Нет задач в очереди')
    return
  }

  for (const doc of pending.docs) {
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(doc.ref)
      if (!snap.exists || snap.data()?.status !== 'pending') {
        return null
      }
      tx.update(doc.ref, { status: 'starting' })
      return snap.data()
    })

    if (!claimed) {
      continue
    }

    try {
      const result = await startAgent(apiKey, claimed.message, claimed.email || '')
      await doc.ref.update({
        status: 'started',
        agentId: result.agentId,
        agentUrl: result.agentUrl,
        agentName: result.agentName,
        processedAt: FieldValue.serverTimestamp(),
      })
      console.log(`Запущено: ${doc.id}`)
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error)
      await doc.ref.update({
        status: 'error',
        error: details.slice(0, 500),
      })
      console.error(`Ошибка ${doc.id}: ${details}`)
    }
  }
}

async function main() {
  initializeApp({
    credential: cert(readServiceAccount()),
    projectId: PROJECT_ID,
  })

  const db = getFirestore()
  const apiKey = await readApiKey(db)
  if (!apiKey) {
    throw new Error('Нет ключа Cursor: секрет CURSOR_API_KEY или Firestore internal/cursorConfig.apiKey')
  }

  await processPending(db, apiKey)
  await refreshStarted(db, apiKey)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
