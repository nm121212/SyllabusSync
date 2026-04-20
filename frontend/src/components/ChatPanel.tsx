import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Fade,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  CalendarMonth,
} from '@mui/icons-material';
import { API_BASE_URL } from '../config/api.ts';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  taskCreated?: {
    title: string;
    dueDate: string;
    type: string;
  };
}

interface ChatPanelProps {
  /** Suggested prompts rendered as clickable pills above the composer. */
  suggestions?: string[];
  /** Starting conversation (defaults to a friendly day-planner greeting). */
  initialMessages?: ChatMessage[];
  /** Callback each time the assistant replies - handy for refreshing calendars etc. */
  onReply?: (message: ChatMessage) => void;
  /** Height of the chat pane. "auto" matches any parent; otherwise a fixed CSS size. */
  height?: string | number;
  /** Hide the coloured status strip at the top. */
  hideHeader?: boolean;
  /** Optional prompt to auto-send. The panel compares the `id` between
   *  renders - same `id` = same request, so changing just the text alone
   *  won't resend. Pass a new `id` to force a fresh send. Useful when a
   *  parent collects a prompt elsewhere (e.g. a hero input) and wants the
   *  chat to continue the conversation. */
  pendingPrompt?: { text: string; id: string };
}

const PURPLE_BORDER = 'rgba(139, 92, 246, 0.25)';
const PURPLE_BORDER_STRONG = 'rgba(139, 92, 246, 0.5)';

const defaultGreeting: ChatMessage[] = [
  {
    id: 'greet',
    text:
      "Hi - I’m Cadence, your AI day planner. Tell me what’s on your mind and I’ll slot it into your day. " +
      "Try: ‘Remind me to call mom tomorrow at 6pm’, ‘Block 2 hours to focus Thursday morning’, or ‘What’s on my plate this week?’",
    sender: 'bot',
    timestamp: new Date(),
  },
];

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const ChatPanel: React.FC<ChatPanelProps> = ({
  suggestions = [
    'Plan my day tomorrow',
    'Remind me to pay rent on the 1st',
    'Block focus time Thursday 9–11am',
    'What’s due this week?',
  ],
  initialMessages = defaultGreeting,
  onReply,
  height = '70vh',
  hideHeader = false,
  pendingPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const sentPendingRef = useRef<string | null>(null);

  /* Auto-scroll ONLY the chat's own messages container - not the whole
     window. The previous implementation used `scrollIntoView` on a bottom
     sentinel, which the browser interprets as "bring this element into
     the viewport" and therefore scrolls every ancestor scroll container,
     including the page itself. That meant every chat turn yanked the
     user away from whatever they were reading. Scrolling the inner
     container directly keeps the page still. */
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (raw?: string) => {
    const text = (raw ?? inputText).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/chatbot/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
        taskCreated: data.taskCreated || undefined,
      };
      setMessages((prev) => [...prev, botMsg]);
      onReply?.(botMsg);
    } catch {
      setError('I couldn’t reach the assistant. Try again in a moment.');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "I'm sorry, something went wrong on my end. Try rephrasing, or check that the backend is running.",
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  useEffect(() => {
    if (
      pendingPrompt &&
      pendingPrompt.text.trim() &&
      pendingPrompt.id !== sentPendingRef.current
    ) {
      sentPendingRef.current = pendingPrompt.id;
      send(pendingPrompt.text);
    }
    // `send` intentionally excluded - it’s recreated each render but stable
    // enough for our one-shot use-case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  return (
    <Box
      sx={{
        borderRadius: 4,
        border: `1px solid ${PURPLE_BORDER}`,
        background:
          'linear-gradient(180deg, rgba(26,23,51,0.75) 0%, rgba(20,17,39,0.5) 100%)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height,
        minHeight: 480,
      }}
    >
      {!hideHeader && (
        <Box
          sx={{
            p: 2.5,
            borderBottom: `1px solid ${PURPLE_BORDER}`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background:
              'linear-gradient(180deg, rgba(124,108,255,0.08) 0%, transparent 100%)',
          }}
        >
          <Avatar
            sx={{
              width: 42,
              height: 42,
              background: 'linear-gradient(135deg,#7c6cff 0%,#3b82f6 100%)',
              boxShadow: '0 8px 24px -10px rgba(124,108,255,0.8)',
            }}
          >
            <SmartToy sx={{ fontSize: 22 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>Cadence</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5 }}>
              Online · schedules, reminders, daily plans
            </Typography>
          </Box>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: '#22d3ee',
              boxShadow: '0 0 10px #22d3ee',
            }}
          />
        </Box>
      )}

      {error && (
        <Fade in={!!error}>
          <Alert
            severity="error"
            sx={{ m: 2, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Messages */}
      <Box
        ref={messagesScrollRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          /* Isolate this container from the rest of the page's scroll
             chain - prevents wheel events from bubbling up once we've
             hit the top/bottom. */
          overscrollBehavior: 'contain',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.25,
        }}
      >
        {messages.map((m) => (
          <Fade in timeout={250} key={m.id}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: 1.5,
              }}
            >
              {m.sender === 'bot' && (
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    mt: 0.5,
                    background:
                      'linear-gradient(135deg,#7c6cff 0%,#3b82f6 100%)',
                  }}
                >
                  <SmartToy sx={{ fontSize: 18 }} />
                </Avatar>
              )}

              <Box sx={{ maxWidth: { xs: '85%', sm: '72%', md: '68%' } }}>
                <Box
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    background:
                      m.sender === 'user'
                        ? 'linear-gradient(135deg,#7c6cff 0%,#6366f1 100%)'
                        : 'rgba(10,9,20,0.6)',
                    color: m.sender === 'user' ? '#fff' : 'rgba(255,255,255,0.92)',
                    border:
                      m.sender === 'bot' ? `1px solid ${PURPLE_BORDER}` : 'none',
                    boxShadow:
                      m.sender === 'user'
                        ? '0 10px 30px -12px rgba(124,108,255,0.7)'
                        : 'none',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ lineHeight: 1.55, mb: m.taskCreated ? 2 : 0 }}
                  >
                    {m.text}
                  </Typography>

                  {m.taskCreated && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: 2.5,
                        background:
                          m.sender === 'user'
                            ? 'rgba(255,255,255,0.14)'
                            : 'rgba(124, 108, 255, 0.15)',
                        border:
                          m.sender === 'user'
                            ? '1px solid rgba(255,255,255,0.22)'
                            : `1px solid ${PURPLE_BORDER_STRONG}`,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1,
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color:
                            m.sender === 'user'
                              ? 'rgba(255,255,255,0.85)'
                              : 'rgba(255,255,255,0.7)',
                        }}
                      >
                        <CalendarMonth sx={{ fontSize: 14 }} />
                        Added to your day
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, mb: 0.75 }}
                      >
                        {m.taskCreated.title}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Chip
                          label={m.taskCreated.type}
                          size="small"
                          sx={{
                            bgcolor:
                              m.sender === 'user'
                                ? 'rgba(255,255,255,0.22)'
                                : 'rgba(124,108,255,0.35)',
                            color: '#fff',
                            border: 'none',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              m.sender === 'user'
                                ? 'rgba(255,255,255,0.85)'
                                : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          Due{' '}
                          {new Date(
                            m.taskCreated.dueDate + 'T00:00:00'
                          ).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          }).replace(/\//g, '-')}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.6,
                      display: 'block',
                      mt: 1.25,
                      textAlign: 'right',
                      fontSize: 11,
                    }}
                  >
                    {formatTime(m.timestamp)}
                  </Typography>
                </Box>
              </Box>

              {m.sender === 'user' && (
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    mt: 0.5,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${PURPLE_BORDER}`,
                  }}
                >
                  <Person sx={{ fontSize: 18 }} />
                </Avatar>
              )}
            </Box>
          </Fade>
        ))}

        {loading && (
          <Fade in timeout={250}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  background: 'linear-gradient(135deg,#7c6cff 0%,#3b82f6 100%)',
                }}
              >
                <SmartToy sx={{ fontSize: 18 }} />
              </Avatar>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: 'rgba(10,9,20,0.6)',
                  border: `1px solid ${PURPLE_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <CircularProgress size={16} sx={{ color: '#a08fff' }} />
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}
                >
                  Planning…
                </Typography>
              </Box>
            </Box>
          </Fade>
        )}

      </Box>

      {/* Suggestion chips */}
      {suggestions.length > 0 && (
        <Box
          sx={{
            px: 2.5,
            pb: 1.5,
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {suggestions.map((s) => (
            <Box
              key={s}
              role="button"
              tabIndex={0}
              onClick={() => send(s)}
              onKeyDown={(e) => (e.key === 'Enter' ? send(s) : undefined)}
              sx={{
                px: 1.5,
                py: 0.6,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: 'rgba(255,255,255,0.78)',
                background: 'rgba(124, 108, 255, 0.08)',
                border: '1px solid rgba(139,92,246,0.25)',
                cursor: 'pointer',
                transition: 'all 160ms ease',
                '&:hover': {
                  background: 'rgba(124, 108, 255, 0.2)',
                  borderColor: 'rgba(139,92,246,0.55)',
                  color: '#fff',
                },
              }}
            >
              {s}
            </Box>
          ))}
        </Box>
      )}

      {/* Composer */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${PURPLE_BORDER}`,
          background:
            'linear-gradient(0deg, rgba(124,108,255,0.05) 0%, transparent 100%)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1.25,
            alignItems: 'flex-end',
            maxWidth: 900,
            mx: 'auto',
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Tell me what to plan - ‘block 90 min for deep work tomorrow’, ‘remind me to email Sam Friday’…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKey}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 999,
                bgcolor: 'rgba(10,9,20,0.6)',
              },
              '& .MuiInputBase-input': { py: 1.25, px: 1.5 },
            }}
          />
          <IconButton
            onClick={() => send()}
            disabled={!inputText.trim() || loading}
            sx={{
              width: 48,
              height: 48,
              borderRadius: 999,
              color: '#fff',
              background: 'linear-gradient(135deg,#7c6cff 0%,#6366f1 100%)',
              boxShadow: '0 10px 24px -10px rgba(124,108,255,0.8)',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 14px 28px -10px rgba(124,108,255,0.9)',
              },
              '&:disabled': {
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.3)',
                boxShadow: 'none',
                transform: 'none',
              },
            }}
          >
            <Send sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatPanel;
