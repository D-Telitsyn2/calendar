import { getFunctions, httpsCallable } from 'firebase/functions'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe
} from 'firebase/firestore'
import { app, db } from './firebase'

export type AgentRequestStatus = 'starting' | 'started' | 'error'

export interface AgentRequest {
  id: string
  message: string
  status: AgentRequestStatus
  agentUrl?: string
  error?: string
  createdAtMs: number
}

type StartCursorAgentResponse = {
  id: string
  agentId: string
  agentUrl: string
}

const functions = getFunctions(app, 'us-central1')
const startCursorAgentFn = httpsCallable<{ message: string }, StartCursorAgentResponse>(
  functions,
  'startCursorAgent'
)

export async function startCursorAgent(message: string): Promise<StartCursorAgentResponse> {
  const result = await startCursorAgentFn({ message })
  return result.data
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
          status: (data.status || 'starting') as AgentRequestStatus,
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
