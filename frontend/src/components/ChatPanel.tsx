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
  suggestions?: string[];
  initialMessages?: ChatMessage[];
  onReply?: (message: ChatMessage) => void;
  height?: string | number;
  hideHeader?: boolean;
  pendingPrompt?: { text: string; id: string };
}

/* Claude-inspired dark chat: neutral charcoal surfaces, centered column, soft radii. */
const BG = '#111111';
const BG_ELEVATED = '#1a1a1a';
const BORDER = 'rgba(255,255,255,0.09)';
const BORDER_INPUT = 'rgba(255,255,255,0.12)';
const TEXT = 'rgba(255,255,255,0.92)';
const TEXT_MUTE = 'rgba(255,255,255,0.55)';
const USER_BUBBLE = '#3f3f46';
const ASSISTANT_BUBBLE = 'rgba(255,255,255,0.06)';
const COLUMN_MAX = 680;
const ACCENT_SEND = '#d97757';

const defaultGreeting: ChatMessage[] = [
  {
    id: 'greet',
    text:
      "Hi — I'm Cadence, your AI day planner. Tell me what's on your mind and I'll slot it into your day. " +
      "Try: ‘Remind me to call mom tomorrow at 6pm’, ‘Block 2 hours to focus Thursday morning’, or ‘What's on my plate this week?’",
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  return (
    <Box
      sx={{
        borderRadius: '16px',
        border: `1px solid ${BORDER}`,
        background: BG,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height,
        minHeight: 480,
        boxShadow: '0 24px 80px -32px rgba(0,0,0,0.85)',
      }}
    >
      {!hideHeader && (
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: BG_ELEVATED,
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: '#2a2a2a',
              border: `1px solid ${BORDER}`,
            }}
          >
            <SmartToy sx={{ fontSize: 20, color: TEXT_MUTE }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: '-0.02em',
                color: TEXT,
              }}
            >
              Cadence
            </Typography>
            <Typography sx={{ color: TEXT_MUTE, fontSize: 12, mt: 0.25 }}>
              Online · schedules, reminders, daily plans
            </Typography>
          </Box>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: '#4ade80',
              opacity: 0.85,
            }}
          />
        </Box>
      )}

      {error && (
        <Fade in={!!error}>
          <Alert
            severity="error"
            sx={{
              m: 2,
              borderRadius: '12px',
              bgcolor: 'rgba(127,29,29,0.35)',
              border: '1px solid rgba(248,113,113,0.25)',
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        </Fade>
      )}

      <Box
        ref={messagesScrollRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          py: 3,
          px: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: COLUMN_MAX,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          {messages.map((m) => (
            <Fade in timeout={200} key={m.id}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: 1.25,
                }}
              >
                {m.sender === 'bot' && (
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      mt: 0.25,
                      bgcolor: '#2a2a2a',
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <SmartToy sx={{ fontSize: 15, color: TEXT_MUTE }} />
                  </Avatar>
                )}

                <Box sx={{ maxWidth: 'min(100%, 560px)' }}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.75,
                      borderRadius: '18px',
                      background:
                        m.sender === 'user' ? USER_BUBBLE : ASSISTANT_BUBBLE,
                      color: TEXT,
                      border:
                        m.sender === 'bot'
                          ? `1px solid ${BORDER}`
                          : 'none',
                      boxShadow:
                        m.sender === 'user'
                          ? 'none'
                          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        lineHeight: 1.65,
                        fontSize: 15,
                        letterSpacing: '-0.01em',
                        mb: m.taskCreated ? 2 : 0,
                        color: TEXT,
                      }}
                    >
                      {m.text}
                    </Typography>

                    {m.taskCreated && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 1.75,
                          borderRadius: '12px',
                          background: 'rgba(0,0,0,0.35)',
                          border: `1px solid ${BORDER}`,
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
                            color: TEXT_MUTE,
                            fontSize: 10,
                          }}
                        >
                          <CalendarMonth sx={{ fontSize: 14 }} />
                          Added to your day
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 0.75, color: TEXT }}
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
                              bgcolor: 'rgba(255,255,255,0.08)',
                              color: TEXT,
                              border: `1px solid ${BORDER}`,
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          />
                          <Typography variant="caption" sx={{ color: TEXT_MUTE }}>
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
                        opacity: 0.45,
                        display: 'block',
                        mt: 1,
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
                      width: 28,
                      height: 28,
                      mt: 0.25,
                      bgcolor: USER_BUBBLE,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <Person sx={{ fontSize: 15, color: TEXT_MUTE }} />
                  </Avatar>
                )}
              </Box>
            </Fade>
          ))}

          {loading && (
            <Fade in timeout={200}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  maxWidth: COLUMN_MAX,
                  mx: 'auto',
                  width: '100%',
                }}
              >
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: '#2a2a2a',
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <SmartToy sx={{ fontSize: 15, color: TEXT_MUTE }} />
                </Avatar>
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: '18px',
                    bgcolor: ASSISTANT_BUBBLE,
                    border: `1px solid ${BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <CircularProgress size={14} sx={{ color: TEXT_MUTE }} />
                  <Typography
                    variant="body2"
                    sx={{ color: TEXT_MUTE, fontSize: 14 }}
                  >
                    Thinking…
                  </Typography>
                </Box>
              </Box>
            </Fade>
          )}
        </Box>
      </Box>

      {suggestions.length > 0 && (
        <Box
          sx={{
            px: 2.5,
            pb: 1.5,
            maxWidth: COLUMN_MAX,
            width: '100%',
            mx: 'auto',
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: 'center',
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
                py: 0.65,
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 450,
                color: TEXT_MUTE,
                background: 'transparent',
                border: `1px solid ${BORDER}`,
                cursor: 'pointer',
                transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.18)',
                  color: TEXT,
                },
              }}
            >
              {s}
            </Box>
          ))}
        </Box>
      )}

      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${BORDER}`,
          background: BG_ELEVATED,
        }}
      >
        <Box
          sx={{
            maxWidth: COLUMN_MAX,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
            borderRadius: '16px',
            border: `1px solid ${BORDER_INPUT}`,
            bgcolor: '#0c0c0c',
            p: 1.25,
            pl: 1.75,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            '&:focus-within': {
              borderColor: 'rgba(255,255,255,0.22)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
            },
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={5}
            placeholder="How can Cadence help you today?"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                color: TEXT,
                fontSize: 15,
                lineHeight: 1.55,
                letterSpacing: '-0.01em',
              },
            }}
            sx={{
              '& .MuiInputBase-input::placeholder': {
                color: TEXT_MUTE,
                opacity: 1,
              },
            }}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <IconButton
              onClick={() => send()}
              disabled={!inputText.trim() || loading}
              aria-label="Send message"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                color: '#fff',
                bgcolor: ACCENT_SEND,
                transition: 'opacity 0.2s ease, transform 0.15s ease',
                '&:hover': {
                  bgcolor: '#e88f6f',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.25)',
                  transform: 'none',
                },
              }}
            >
              <Send sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatPanel;
