import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe
} from 'firebase/firestore'
import { auth, db } from './firebase'

export type AgentRequestStatus = 'pending' | 'starting' | 'started' | 'error'

export interface AgentRequest {
  id: string
  message: string
  status: AgentRequestStatus
  agentUrl?: string
  error?: string
  createdAtMs: number
}

const MAX_MESSAGE_LENGTH = 4000
const HOURLY_LIMIT = 8

export async function startCursorAgent(message: string): Promise<{ id: string }> {
  const user = auth.currentUser
  if (!user?.email) {
    throw new Error('Нужно войти в аккаунт')
  }

  const text = message.trim()
  if (!text) {
    throw new Error('Напишите, что нужно сделать')
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Сообщение длиннее ${MAX_MESSAGE_LENGTH} символов`)
  }

  const ref = await addDoc(collection(db, 'agentRequests'), {
    accountId: user.uid,
    email: user.email,
    message: text,
    status: 'pending',
    createdAt: serverTimestamp()
  })

  return { id: ref.id }
}

export function subscribeAgentRequests(
  accountId: string,
  onChange: (items: AgentRequest[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  const requestsQuery = query(
    collection(db, 'agentRequests'),
    where('accountId', '==', accountId),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          message: String(data.message || ''),
          status: (data.status || 'pending') as AgentRequestStatus,
          agentUrl: typeof data.agentUrl === 'string' ? data.agentUrl : undefined,
          error: typeof data.error === 'string' ? data.error : undefined,
          createdAtMs: data.createdAt?.toMillis?.() || Date.now()
        }
      })
      onChange(items)
    },
    (error) => {
      onError?.(error.message)
    }
  )
}

export function hourlyLimitReached(items: AgentRequest[]): boolean {
  const hourAgo = Date.now() - 60 * 60 * 1000
  return items.filter((item) => item.createdAtMs >= hourAgo).length >= HOURLY_LIMIT
}
