import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = 'calendar-399d9'
const REPO = 'D-Telitsyn2/calendar'

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    throw new Error('Нет секрета FIREBASE_SERVICE_ACCOUNT')
  }
  return JSON.parse(raw)
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (!token) {
    throw new Error('Нет GITHUB_TOKEN')
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'calendar-agent-chat',
  }
}

function prNumberFromUrl(prUrl) {
  const match = String(prUrl || '').match(/\/pull\/(\d+)/)
  return match ? match[1] : ''
}

async function isPrMerged(prNumber) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/pulls/${prNumber}`, {
    headers: githubHeaders(),
  })
  if (!response.ok) {
    return false
  }
  const payload = await response.json()
  return payload.merged === true
}

async function mergedPrForAgent(agentId) {
  if (!agentId) {
    return ''
  }
  const query = encodeURIComponent(`repo:${REPO} is:pr is:merged ${agentId}`)
  const response = await fetch(`https://api.github.com/search/issues?q=${query}`, {
    headers: githubHeaders(),
  })
  if (!response.ok) {
    return ''
  }
  const payload = await response.json()
  const item = payload.items?.[0]
  return item?.html_url || ''
}

async function main() {
  initializeApp({
    credential: cert(readServiceAccount()),
    projectId: PROJECT_ID,
  })

  const db = getFirestore()
  const started = await db.collection('agentRequests').where('status', '==', 'started').get()
  const starting = await db.collection('agentRequests').where('status', '==', 'starting').get()
  const docs = [...started.docs, ...starting.docs]
  const forcedPrUrl = process.env.PR_URL || ''

  if (docs.length === 0) {
    console.log('Нет заявок в работе')
    return
  }

  for (const doc of docs) {
    const data = doc.data()
    let prUrl = data.prUrl || ''
    let merged = false

    if (forcedPrUrl && data.agentId && (process.env.HEAD_REF || '').includes(data.agentId)) {
      prUrl = forcedPrUrl
      merged = true
    } else if (forcedPrUrl && prUrl && forcedPrUrl === prUrl) {
      merged = true
    } else if (prUrl) {
      const number = prNumberFromUrl(prUrl)
      merged = number ? await isPrMerged(number) : false
    } else if (data.agentId) {
      const found = await mergedPrForAgent(data.agentId)
      if (found) {
        prUrl = found
        merged = true
      }
    }

    if (!merged) {
      continue
    }

    const updates = { status: 'done' }
    if (prUrl) {
      updates.prUrl = prUrl
    }
    await doc.ref.update(updates)
    console.log(`Готово: ${doc.id}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
