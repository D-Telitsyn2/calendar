import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import {
  Box,
  CircularProgress,
  Fab,
  IconButton,
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
      return 'Нет доступа'
    }
    if (error.code === 'failed-precondition' || error.message.includes('index')) {
      return 'Список ещё готовится, напишите задачу — она сохранится'
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
  const listRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

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

  useEffect(() => {
    if (!open) {
      return
    }
    const node = listRef.current
    if (!node) {
      return
    }
    node.scrollTop = node.scrollHeight
  }, [open, requests])

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

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <>
      <Fab
        color="primary"
        aria-label="Написать, что изменить"
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
            height: 380,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Задача агенту
            </Typography>
          </Box>

          <Box
            ref={listRef}
            sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}
          >
            {requests.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Paper variant="outlined" sx={{ p: 1.2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">{item.message}</Typography>
                </Paper>
                <Typography variant="caption" color={item.status === 'error' ? 'error' : 'text.secondary'}>
                  {item.status === 'pending' && 'Принято, скоро возьмём в работу'}
                  {(item.status === 'starting' || item.status === 'started') && 'Делаем'}
                  {item.status === 'done' && 'Готово'}
                  {item.status === 'error' && 'Не получилось, напишите ещё раз'}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            component="form"
            ref={formRef}
            onSubmit={handleSubmit}
            sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
          >
            {localError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                {localError}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleComposerKeyDown}
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
