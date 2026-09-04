import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENT_CHAT_EMAILS, isEmailOnAllowlist, normalizeEmail } from './agentChatAccess'

describe('normalizeEmail', () => {
  it('обрезает пробелы и приводит к нижнему регистру', () => {
    expect(normalizeEmail('  FrontEnd@Calendar.RU ')).toBe('frontend@calendar.ru')
  })
})

describe('isEmailOnAllowlist', () => {
  it('пускает адрес из списка без учёта регистра', () => {
    expect(isEmailOnAllowlist('Frontend@calendar.ru', DEFAULT_AGENT_CHAT_EMAILS)).toBe(true)
  })

  it('не пускает чужой адрес и пустое значение', () => {
    expect(isEmailOnAllowlist('other@calendar.ru', DEFAULT_AGENT_CHAT_EMAILS)).toBe(false)
    expect(isEmailOnAllowlist(null, DEFAULT_AGENT_CHAT_EMAILS)).toBe(false)
  })
})
