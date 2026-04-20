import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Fade,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import {
  Send,
  Person,
  CalendarMonth,
  AutoAwesome,
  Add,
  ExpandMore,
  EventOutlined,
  NotificationsActiveOutlined,
  ViewWeekOutlined,
  SearchOutlined,
  MicNoneOutlined,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import { API_BASE_URL } from '../config/api.ts';
import PulseChatIcon from './icons/PulseChatIcon.tsx';

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

/** Cadence product palette (aligned with theme + landing). */
const C = {
  pageBg: '#07060d',
  surface: 'rgba(20, 17, 39, 0.94)',
  surfaceDeep: 'rgba(10, 9, 20, 0.75)',
  border: 'rgba(139, 92, 246, 0.22)',
  borderStrong: 'rgba(139, 92, 246, 0.38)',
  borderInput: 'rgba(139, 92, 246, 0.28)',
  purple: '#7c6cff',
  purpleSoft: '#a08fff',
  blue: '#3b82f6',
  cyan: '#22d3ee',
  text: 'rgba(255, 255, 255, 0.94)',
  textMute: 'rgba(255, 255, 255, 0.58)',
  gradient: 'linear-gradient(135deg, #7c6cff 0%, #6366f1 50%, #3b82f6 100%)',
  userBubble:
    'linear-gradient(135deg, rgba(124,108,255,0.38) 0%, rgba(59,130,246,0.22) 100%)',
  botBubble: 'rgba(124, 108, 255, 0.09)',
  serif: '"Fraunces", "Georgia", "Times New Roman", serif',
  sans: '"Inter", "Space Grotesk", "Roboto", system-ui, sans-serif',
};

const COLUMN_MAX = 720;

const defaultGreeting: ChatMessage[] = [
  {
    id: 'greet',
    text:
      "Hi — I'm Cadence, your AI day planner. Tell me what's on your mind and I'll slot it into your day. " +
      "Try: ‘Remind me to call mom tomorrow at 6pm’, ‘Block 2 hours to focus Thursday morning’, or ‘What\u2019s on my plate this week?’",
    sender: 'bot',
    timestamp: new Date(),
  },
];

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const SUGGESTION_ICONS: SvgIconComponent[] = [
  EventOutlined,
  NotificationsActiveOutlined,
  ViewWeekOutlined,
  SearchOutlined,
];

const ChatPanel: React.FC<ChatPanelProps> = ({
  suggestions = [
    'Plan my day tomorrow',
    'Remind me to pay rent on the 1st',
    'Block focus time Thursday 9–11am',
    'What\u2019s due this week?',
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

  const userTurnCount = useMemo(
    () => messages.filter((m) => m.sender === 'user').length,
    [messages]
  );

  /** Claude-style empty state: serif hero only; greeting text moves out of the list. */
  const showHeroEmpty =
    messages.length === 1 &&
    messages[0]?.id === 'greet' &&
    userTurnCount === 0;

  const listMessages = showHeroEmpty ? [] : messages;

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
        borderRadius: '20px',
        border: `1px solid ${C.border}`,
        background: `linear-gradient(165deg, ${C.surface} 0%, ${C.pageBg} 100%)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height,
        minHeight: 480,
        boxShadow:
          '0 24px 80px -28px rgba(0,0,0,0.75), 0 0 0 1px rgba(124,108,255,0.06) inset',
        fontFamily: C.sans,
      }}
    >
      {!hideHeader && (
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'rgba(124, 108, 255, 0.06)',
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              lineHeight: 0,
              filter: 'drop-shadow(0 8px 24px rgba(124,108,255,0.45))',
            }}
          >
            <PulseChatIcon size={36} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: '-0.02em',
                color: C.text,
              }}
            >
              Cadence
            </Typography>
            <Typography sx={{ color: C.textMute, fontSize: 12, mt: 0.25 }}>
              Online · schedules, reminders, daily plans
            </Typography>
          </Box>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: C.cyan,
              boxShadow: `0 0 10px ${C.cyan}`,
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
              border: '1px solid rgba(244,114,182,0.35)',
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
          py: showHeroEmpty ? 2 : 3,
          px: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        {showHeroEmpty && (
          <Box
            sx={{
              textAlign: 'center',
              py: { xs: 2, sm: 4 },
              px: 1,
              maxWidth: COLUMN_MAX,
              mx: 'auto',
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                mb: 1.5,
              }}
            >
              <AutoAwesome
                sx={{
                  fontSize: { xs: 26, sm: 30 },
                  color: C.purpleSoft,
                  filter: 'drop-shadow(0 0 12px rgba(124,108,255,0.55))',
                }}
              />
              <Typography
                component="h2"
                sx={{
                  fontFamily: C.serif,
                  fontWeight: 600,
                  fontSize: { xs: 26, sm: 34, md: 38 },
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  background: C.gradient,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                }}
              >
                What shall we plan today?
              </Typography>
            </Box>
            <Typography
              sx={{
                color: C.textMute,
                fontSize: 15,
                lineHeight: 1.55,
                maxWidth: 420,
                mx: 'auto',
              }}
            >
              Reminders, focus blocks, and Google Calendar sync — say it in plain
              language below.
            </Typography>
          </Box>
        )}

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
          {listMessages.map((m) => (
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
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      mt: 0.25,
                      flexShrink: 0,
                      lineHeight: 0,
                      borderRadius: '8px',
                      boxShadow: `0 0 0 1px ${C.border}`,
                    }}
                  >
                    <PulseChatIcon size={28} />
                  </Box>
                )}

                <Box sx={{ maxWidth: 'min(100%, 560px)' }}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.75,
                      borderRadius: '18px',
                      background:
                        m.sender === 'user' ? C.userBubble : C.botBubble,
                      color: C.text,
                      border: `1px solid ${
                        m.sender === 'bot' ? C.border : 'transparent'
                      }`,
                      boxShadow:
                        m.sender === 'bot'
                          ? 'inset 0 1px 0 rgba(124,108,255,0.12)'
                          : '0 8px 28px -16px rgba(124,108,255,0.35)',
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        lineHeight: 1.65,
                        fontSize: 15,
                        letterSpacing: '-0.01em',
                        mb: m.taskCreated ? 2 : 0,
                        color: C.text,
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
                          background: 'rgba(10, 9, 20, 0.55)',
                          border: `1px solid ${C.border}`,
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
                            color: C.textMute,
                            fontSize: 10,
                          }}
                        >
                          <CalendarMonth sx={{ fontSize: 14, color: C.cyan }} />
                          Added to your day
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 0.75, color: C.text }}
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
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.25,
                              borderRadius: 999,
                              bgcolor: 'rgba(124,108,255,0.2)',
                              color: C.purpleSoft,
                              border: `1px solid ${C.border}`,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {m.taskCreated.type}
                          </Box>
                          <Typography variant="caption" sx={{ color: C.textMute }}>
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
                        opacity: 0.5,
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
                      bgcolor: 'rgba(124,108,255,0.25)',
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <Person sx={{ fontSize: 15, color: C.purpleSoft }} />
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
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    lineHeight: 0,
                    borderRadius: '8px',
                  }}
                >
                  <PulseChatIcon size={28} />
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: '18px',
                    bgcolor: C.botBubble,
                    border: `1px solid ${C.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <CircularProgress size={14} sx={{ color: C.purpleSoft }} />
                  <Typography
                    variant="body2"
                    sx={{ color: C.textMute, fontSize: 14 }}
                  >
                    Planning…
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
          {suggestions.map((s, i) => {
            const Icon = SUGGESTION_ICONS[i % SUGGESTION_ICONS.length];
            return (
              <Box
                key={s}
                role="button"
                tabIndex={0}
                onClick={() => send(s)}
                onKeyDown={(e) => (e.key === 'Enter' ? send(s) : undefined)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.65,
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: C.textMute,
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  cursor: 'pointer',
                  transition:
                    'background 160ms ease, border-color 160ms ease, color 160ms ease',
                  '&:hover': {
                    background: 'rgba(124, 108, 255, 0.1)',
                    borderColor: C.borderStrong,
                    color: C.text,
                  },
                }}
              >
                <Icon sx={{ fontSize: 16, opacity: 0.85 }} />
                {s}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Claude-style composer: main input + bottom toolbar (Cadence colors). */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${C.border}`,
          background: 'rgba(10, 9, 20, 0.65)',
        }}
      >
        <Box
          sx={{
            maxWidth: COLUMN_MAX,
            mx: 'auto',
            borderRadius: '16px',
            border: `1px solid ${C.borderInput}`,
            bgcolor: C.surfaceDeep,
            overflow: 'hidden',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            '&:focus-within': {
              borderColor: C.borderStrong,
              boxShadow: '0 0 0 3px rgba(124, 108, 255, 0.12)',
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
                color: C.text,
                fontSize: 15,
                lineHeight: 1.55,
                letterSpacing: '-0.01em',
                px: 2,
                pt: 1.75,
                pb: 1,
              },
            }}
            sx={{
              '& .MuiInputBase-input::placeholder': {
                color: C.textMute,
                opacity: 1,
              },
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 1,
              borderTop: `1px solid ${C.border}`,
              background: 'rgba(124, 108, 255, 0.04)',
            }}
          >
            <IconButton
              size="small"
              aria-label="Add"
              sx={{
                color: C.textMute,
                flexShrink: 0,
                '&:hover': { color: C.purpleSoft, bgcolor: 'rgba(124,108,255,0.1)' },
              }}
            >
              <Add fontSize="small" />
            </IconButton>
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.25,
                  px: 1.25,
                  py: 0.45,
                  borderRadius: 999,
                  border: `1px solid ${C.border}`,
                  fontSize: 12,
                  fontWeight: 500,
                  color: C.textMute,
                  bgcolor: 'rgba(20,17,39,0.65)',
                }}
              >
                Day planner
                <ExpandMore sx={{ fontSize: 18, opacity: 0.75 }} />
              </Box>
              <IconButton
                size="small"
                aria-label="Voice (coming soon)"
                disabled
                sx={{
                  color: C.textMute,
                  display: { xs: 'none', sm: 'inline-flex' },
                  opacity: 0.45,
                }}
              >
                <MicNoneOutlined sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
            <IconButton
              onClick={() => send()}
              disabled={!inputText.trim() || loading}
              aria-label="Send message"
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: '10px',
                color: '#fff',
                background: C.gradient,
                boxShadow: '0 8px 20px -8px rgba(124,108,255,0.8)',
                '&:hover': {
                  filter: 'brightness(1.08)',
                  boxShadow: '0 10px 24px -8px rgba(124,108,255,0.95)',
                },
                '&:disabled': {
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.25)',
                  boxShadow: 'none',
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
