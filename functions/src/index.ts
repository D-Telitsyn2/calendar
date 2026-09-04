import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

const REPO_URL = 'https://github.com/D-Telitsyn2/calendar'
const CURSOR_API = 'https://api.cursor.com/v1/agents'
const MAX_MESSAGE_LENGTH = 4000
const HOURLY_LIMIT = 8
const AUTOMERGE_MARKER = '<!-- site-chat-automerge -->'

type CursorCreateResponse = {
  agent?: {
    id?: string
    url?: string
    name?: string
  }
}

function buildPrompt(message: string, email: string): string {
  return [
    'Пользователь календаря отпусков просит изменить сайт.',
    `Кто просит: ${email}`,
    '',
    'Задача:',
    message,
    '',
    'Сделай правки в репозитории, открой PR в main.',
    `В описании PR обязательно отдельной строкой: ${AUTOMERGE_MARKER}`,
    'Сам PR не мержи — после зелёных проверок его смержит GitHub Action.',
    'Пиши в стиле репозитория, без лишних файлов и без воды в описании.',
  ].join('\n')
}

async function readApiKey(): Promise<string | null> {
  if (process.env.CURSOR_API_KEY?.trim()) {
    return process.env.CURSOR_API_KEY.trim()
  }

  const snap = await getFirestore().doc('internal/cursorConfig').get()
  const value = snap.data()?.apiKey
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export const startCursorAgent = onCall(
  {
    region: 'us-central1',
    cors: true,
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Нужно войти в аккаунт')
    }

    const message = typeof request.data?.message === 'string' ? request.data.message.trim() : ''
    if (!message) {
      throw new HttpsError('invalid-argument', 'Напишите, что нужно сделать')
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new HttpsError('invalid-argument', `Сообщение длиннее ${MAX_MESSAGE_LENGTH} символов`)
    }

    const db = getFirestore()
    const hourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000))
    const recent = await db
      .collection('agentRequests')
      .where('accountId', '==', request.auth.uid)
      .where('createdAt', '>=', hourAgo)
      .orderBy('createdAt', 'desc')
      .get()

    if (recent.size >= HOURLY_LIMIT) {
      throw new HttpsError('resource-exhausted', 'Слишком много запросов за час, подождите')
    }

    const apiKey = await readApiKey()
    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'Не задан ключ Cursor. В Firestore создайте документ internal/cursorConfig с полем apiKey (ключ из cursor.com/dashboard → API Keys).'
      )
    }

    const email = request.auth.token.email || request.auth.uid
    const docRef = db.collection('agentRequests').doc()
    await docRef.set({
      accountId: request.auth.uid,
      email,
      message,
      status: 'starting',
      createdAt: FieldValue.serverTimestamp(),
    })

    const response = await fetch(CURSOR_API, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: { text: buildPrompt(message, email) },
        name: `Сайт: ${message.slice(0, 60)}`,
        repos: [{ url: REPO_URL, startingRef: 'main' }],
        autoCreatePR: true,
        skipReviewerRequest: true,
      }),
    })

    const rawText = await response.text()
    let payload: CursorCreateResponse = {}
    try {
      payload = rawText ? (JSON.parse(rawText) as CursorCreateResponse) : {}
    } catch {
      payload = {}
    }

    if (!response.ok) {
      const details = rawText.slice(0, 500)
      await docRef.update({
        status: 'error',
        error: details,
      })
      throw new HttpsError('internal', `Cursor API: ${response.status}. ${details}`)
    }

    const agentId = payload.agent?.id || ''
    const agentUrl = payload.agent?.url || (agentId ? `https://cursor.com/agents/${agentId}` : '')

    await docRef.update({
      status: 'started',
      agentId,
      agentUrl,
      agentName: payload.agent?.name || '',
    })

    return { id: docRef.id, agentId, agentUrl }
  }
)
