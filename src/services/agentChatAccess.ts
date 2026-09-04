import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'

export const DEFAULT_AGENT_CHAT_EMAILS = ['frontend@calendar.ru']

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isEmailOnAllowlist(email: string | null | undefined, emails: string[]): boolean {
  if (!email) {
    return false
  }
  const needle = normalizeEmail(email)
  return emails.some((item) => normalizeEmail(item) === needle)
}

function readEmails(data: Record<string, unknown> | undefined): string[] | null {
  const raw = data?.emails
  if (!Array.isArray(raw)) {
    return null
  }
  return raw.filter((item): item is string => typeof item === 'string')
}

export function subscribeAgentChatAllowlist(
  onChange: (emails: string[]) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'config', 'agentChatAccess'),
    (snapshot) => {
      onChange(readEmails(snapshot.data()) ?? DEFAULT_AGENT_CHAT_EMAILS)
    },
    () => {
      onChange(DEFAULT_AGENT_CHAT_EMAILS)
    }
  )
}
