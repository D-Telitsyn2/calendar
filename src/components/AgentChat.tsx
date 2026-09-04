import { FormEvent, useEffect, useState } from 'react'
import {
  Box,
  CircularProgress,
  Fab,
  IconButton,
  Link,
  Paper,
  TextField,
  Typography
} from '@mui/material'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import { FirebaseError } from 'firebase/app'
import {
  hourlyLimitReached,
  startCursorAgent,
  subscribeAgentRequests,
  type AgentRequest
} from '../services/agentChat'
import {
  isEmailOnAllowlist,
  subscribeAgentChatAllowlist
} from '../services/agentChatAccess'

interface AgentChatProps {
  accountId: string
  email: string | null
}

function errorText(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return 'Нет доступа к чату агента'
    }
    return error.message.replace(/^Firebase:\s*/i, '')
  }
  return error instanceof Error ? error.message : 'Не удалось отправить'
}

const AgentChat = ({ accountId, email }: AgentChatProps) => {
  const [allowed, setAllowed] = useState(false)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [localError, setLocalError] = useState('')
  const [requests, setRequests] = useState<AgentRequest[]>([])

  useEffect(() => {
    return subscribeAgentChatAllowlist((emails) => {
      setAllowed(isEmailOnAllowlist(email, emails))
    })
  }, [email])

  useEffect(() => {
    if (!allowed) {
      setRequests([])
      setOpen(false)
      return
    }
    return subscribeAgentRequests(accountId, setRequests, setLocalError)
  }, [accountId, allowed])

  if (!allowed) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const message = text.trim()
    if (!message || sending) {
      return
    }

    if (hourlyLimitReached(requests)) {
      setLocalError('Слишком много запросов за час, подождите')
      return
    }

    setSending(true)
    setLocalError('')
    try {
      await startCursorAgent(message)
      setText('')
    } catch (error) {
      setLocalError(errorText(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Fab
        color="primary"
        aria-label="Чат с агентом"
        onClick={() => setOpen((value) => !value)}
        sx={{ position: 'fixed', right: 20, bottom: 20, zIndex: 20 }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </Fab>

      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            right: 20,
            bottom: 92,
            zIndex: 20,
            width: { xs: 'calc(100vw - 32px)', sm: 380 },
            maxWidth: 380,
            height: 460,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Задача агенту
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Сообщение попадёт в очередь. GitHub запустит агента в течение нескольких минут, затем будет PR.
            </Typography>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {requests.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Например: «сделай кнопку выхода красной» или «подпиши дни недели полностью».
              </Typography>
            )}

            {requests.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Paper variant="outlined" sx={{ p: 1.2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">{item.message}</Typography>
                </Paper>
                <Typography variant="caption" color="text.secondary">
                  {item.status === 'pending' && 'В очереди, агент возьмёт задачу в ближайшие минуты'}
                  {item.status === 'starting' && 'Запускаю агента…'}
                  {item.status === 'started' && (
                    <>
                      Агент работает
                      {item.agentUrl && (
                        <>
                          {' · '}
                          <Link href={item.agentUrl} target="_blank" rel="noreferrer">
                            открыть в Cursor
                          </Link>
                        </>
                      )}
                    </>
                  )}
                  {item.status === 'error' && (item.error || 'Ошибка запуска')}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            {localError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                {localError}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Что изменить на сайте?"
                size="small"
                fullWidth
                multiline
                maxRows={4}
                disabled={sending}
              />
              <IconButton type="submit" color="primary" disabled={sending || !text.trim()} aria-label="Отправить">
                {sending ? <CircularProgress size={20} /> : <SendIcon />}
              </IconButton>
            </Box>
          </Box>
        </Paper>
      )}
    </>
  )
}

export default AgentChat
