import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Grid, Typography } from '@mui/material';
import {
  CalendarMonth,
  SmartToy,
  ArrowForward,
  ChatBubbleOutline,
  TaskAlt,
  InsertDriveFileOutlined,
} from '@mui/icons-material';
import TaskCalendar, { CalendarTask } from '../components/TaskCalendar.tsx';
import ChatPanel, { ChatMessage } from '../components/ChatPanel.tsx';
import TasksSection from '../components/TasksSection.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card.tsx';
import UploadSyllabus from './UploadSyllabus.tsx';
import { useTasks } from '../contexts/TasksContext.tsx';
import { API_BASE_URL } from '../config/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import GoogleSignInButton from '../components/GoogleSignInButton.tsx';

/* ──────────────────────────────────────────────────────────────────────────
 * Decorative concentric-wave blob (pure SVG)
 * ────────────────────────────────────────────────────────────────────────── */
const WaveBlob: React.FC<{
  size?: number;
  opacity?: number;
  hue?: 'purple' | 'blue';
}> = ({ size = 560, opacity = 0.9, hue = 'purple' }) => {
  const stops =
    hue === 'purple'
      ? ['#c084fc', '#7c6cff', '#3b82f6']
      : ['#60a5fa', '#7c6cff', '#c084fc'];
  const id = React.useId();
  const rings = Array.from({ length: 14 });
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        opacity,
        animation: 'ss-float-slow 10s ease-in-out infinite',
        filter: 'drop-shadow(0 30px 60px rgba(124,108,255,0.25))',
      }}
    >
      <svg viewBox="-260 -260 520 520" width="100%" height="100%">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stops[0]} />
            <stop offset="55%" stopColor={stops[1]} />
            <stop offset="100%" stopColor={stops[2]} />
          </linearGradient>
        </defs>
        {rings.map((_, i) => {
          const base = 40 + i * 14;
          const k = 0.18 + i * 0.015;
          const d = `
            M ${base},0
            C ${base},${base * (0.55 + k)} ${base * (0.55 - k)},${base} 0,${base}
            C ${-base * (0.55 + k)},${base} ${-base},${base * (0.55 - k)} ${-base},0
            C ${-base},${-base * (0.55 + k)} ${-base * (0.55 - k)},${-base} 0,${-base}
            C ${base * (0.55 + k)},${-base} ${base},${-base * (0.55 - k)} ${base},0 Z`;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={`url(#${id})`}
              strokeOpacity={0.25 + (i / rings.length) * 0.7}
              strokeWidth={1.1}
              transform={`rotate(${i * 6})`}
            />
          );
        })}
      </svg>
    </Box>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
 * Tiny reusable pieces
 * ────────────────────────────────────────────────────────────────────────── */
const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="ss-eyebrow">
    <span className="ss-eyebrow-dot" aria-hidden />
    {children}
  </span>
);

const SectionHeader: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center';
}> = ({ eyebrow, title, subtitle, align = 'center' }) => (
  <Box
    sx={{ textAlign: align, maxWidth: 760, mx: align === 'center' ? 'auto' : 0 }}
  >
    <Eyebrow>{eyebrow}</Eyebrow>
    <Typography
      variant="h2"
      sx={{
        mt: 2.5,
        mb: 2,
        fontSize: { xs: 38, sm: 48, md: 56 },
        lineHeight: 1.05,
      }}
      className="ss-gradient-text"
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        sx={{
          color: 'rgba(255,255,255,0.72)',
          fontSize: { xs: 15, md: 17 },
          maxWidth: 640,
          mx: align === 'center' ? 'auto' : 0,
          lineHeight: 1.6,
        }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
);

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  accent: string;
  onClick?: () => void;
  cta: string;
}> = ({ icon, title, description, bullets, accent, onClick, cta }) => (
  <Box
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={(e) => (onClick && e.key === 'Enter' ? onClick() : undefined)}
    sx={{
      position: 'relative',
      p: { xs: 3, md: 3.5 },
      height: '100%',
      borderRadius: 4,
      border: '1px solid rgba(139, 92, 246, 0.2)',
      background:
        'linear-gradient(180deg, rgba(26,23,51,0.9) 0%, rgba(20,17,39,0.6) 100%)',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition:
        'transform 250ms ease, border-color 250ms ease, box-shadow 250ms ease',
      '&:hover': {
        transform: onClick ? 'translateY(-4px)' : 'none',
        borderColor: 'rgba(139, 92, 246, 0.55)',
        boxShadow: '0 30px 60px -30px rgba(124,108,255,0.55)',
        '& .ss-cta-arrow': { transform: 'translateX(6px)' },
        '& .ss-card-glow': { opacity: 0.9 },
      },
    }}
  >
    <Box
      className="ss-card-glow"
      sx={{
        position: 'absolute',
        inset: -1,
        borderRadius: 4,
        pointerEvents: 'none',
        opacity: 0.35,
        transition: 'opacity 250ms ease',
        background: `radial-gradient(400px 160px at 0% 0%, ${accent}33, transparent 60%)`,
      }}
    />
    <Box
      sx={{
        position: 'relative',
        width: 52,
        height: 52,
        borderRadius: 2.5,
        display: 'grid',
        placeItems: 'center',
        mb: 2.5,
        color: '#fff',
        background: `linear-gradient(135deg, ${accent} 0%, #7c6cff 100%)`,
        boxShadow: `0 12px 30px -12px ${accent}AA`,
      }}
    >
      {icon}
    </Box>
    <Typography variant="h5" sx={{ position: 'relative', mb: 1, fontWeight: 700 }}>
      {title}
    </Typography>
    <Typography
      sx={{
        position: 'relative',
        color: 'rgba(255,255,255,0.72)',
        mb: 2,
        lineHeight: 1.6,
      }}
    >
      {description}
    </Typography>
    <Box
      component="ul"
      sx={{
        position: 'relative',
        listStyle: 'none',
        p: 0,
        m: 0,
        mb: 2.5,
        display: 'grid',
        gap: 0.75,
      }}
    >
      {bullets.map((b) => (
        <Box
          component="li"
          key={b}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'rgba(255,255,255,0.78)',
            fontSize: 14,
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: accent,
              boxShadow: `0 0 8px ${accent}`,
            }}
          />
          {b}
        </Box>
      ))}
    </Box>
    {onClick && (
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          color: '#c7b9ff',
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '0.02em',
        }}
      >
        {cta}
        <ArrowForward
          className="ss-cta-arrow"
          sx={{ fontSize: 16, transition: 'transform 250ms ease' }}
        />
      </Box>
    )}
  </Box>
);

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <Box>
    <Typography
      sx={{
        fontSize: { xs: 28, md: 34 },
        fontWeight: 800,
        letterSpacing: '-0.02em',
      }}
      className="ss-gradient-text-blue"
    >
      {value}
    </Typography>
    <Typography
      sx={{
        fontSize: 12,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.55)',
        mt: 0.5,
      }}
    >
      {label}
    </Typography>
  </Box>
);

/* ──────────────────────────────────────────────────────────────────────────
 * Live stats from the backend – fall back gracefully when no data yet / offline
 * ────────────────────────────────────────────────────────────────────────── */
interface BackendTask {
  id: number;
  courseName?: string;
  title: string;
  type?: string;
  dueDate: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: string;
  googleEventId?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface LiveStats {
  loaded: boolean;
  hasData: boolean;
  total: number;
  completed: number;
  dueThisWeek: number;
  synced: number;
  pct: number;
  upcoming: BackendTask[];
  tasks: BackendTask[];
  /** Live Google Calendar connection state (null = not yet checked). */
  calendarConnected: boolean | null;
}

/** Fetches tasks once and recomputes stats on demand. Refetches whenever the
 *  shared tasks `version` changes (triggered by the AddTaskDialog, TasksSection
 *  and the chat), plus a local `refetch` escape hatch. */
const useLiveStats = (
  sharedVersion: number
): LiveStats & { refetch: () => void } => {
  const [tasks, setTasks] = useState<BackendTask[] | null>(null);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(
    null
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tasksRes, calRes] = await Promise.all([
          fetch(`${API_BASE_URL}/syllabus/tasks`),
          fetch(`${API_BASE_URL}/syllabus/calendar/status`).catch(
            () => null as unknown as Response
          ),
        ]);
        if (!cancelled) {
          if (tasksRes.ok) {
            const data: BackendTask[] = await tasksRes.json();
            setTasks(Array.isArray(data) ? data : []);
          } else {
            setTasks([]);
          }
          if (calRes && calRes.ok) {
            const d = await calRes.json().catch(() => ({}));
            setCalendarConnected(!!d?.connected);
          } else {
            setCalendarConnected(false);
          }
        }
      } catch {
        if (!cancelled) {
          setTasks([]);
          setCalendarConnected(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, sharedVersion]);

  /* Keep the tasks+calendar split view "live" even if a task was created
     through a path that didn't bump the shared version. */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setReloadKey((k) => k + 1);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = useMemo<LiveStats>(() => {
    if (tasks === null) {
      return {
        loaded: false,
        hasData: false,
        total: 0,
        completed: 0,
        dueThisWeek: 0,
        synced: 0,
        pct: 0,
        upcoming: [],
        tasks: [],
        calendarConnected,
      };
    }
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const synced = tasks.filter((t) => !!t.googleEventId).length;
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const dueThisWeek = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate + 'T00:00:00');
      return d <= weekFromNow && t.status !== 'COMPLETED';
    }).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const upcoming = [...tasks]
      .filter((t) => t.status !== 'COMPLETED' && !!t.dueDate)
      .sort(
        (a, b) =>
          new Date(a.dueDate + 'T00:00:00').getTime() -
          new Date(b.dueDate + 'T00:00:00').getTime()
      )
      .slice(0, 4);

    return {
      loaded: true,
      hasData: total > 0,
      total,
      completed,
      dueThisWeek,
      synced,
      pct,
      upcoming,
      tasks,
      calendarConnected,
    };
  }, [tasks, calendarConnected]);

  return { ...stats, refetch: () => setReloadKey((k) => k + 1) };
};

const formatShortDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

/* ──────────────────────────────────────────────────────────────────────────
 * Page
 * ────────────────────────────────────────────────────────────────────────── */
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { version, bumpVersion } = useTasks();
  const stats = useLiveStats(version);
  const { session } = useAuth();

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  /** A prompt typed in the hero that we forward to the chat panel. Each
   *  submission gets a fresh id so repeated submissions still trigger a send. */
  const [pendingPrompt, setPendingPrompt] = useState<
    { text: string; id: string } | undefined
  >(undefined);
  const [heroInput, setHeroInput] = useState('');

  const submitHero = (raw?: string) => {
    const text = (raw ?? heroInput).trim();
    if (!text) return;
    setPendingPrompt({ text, id: `hero-${Date.now()}` });
    setHeroInput('');
    setTimeout(() => scrollToId('chat'), 40);
  };

  /* The chat panel starts with a single friendly greeting; the pendingPrompt
   * above is what actually drives the first real user turn. */
  const initialChatMessages: ChatMessage[] = useMemo(
    () => [
      {
        id: 'greet',
        text:
          "Hi - I’m Cadence. Tell me what’s on your mind and I’ll slot it into your day. " +
          "Try: ‘Remind me to call Alex tomorrow at 6pm’, ‘Block 90 minutes for deep work Thursday morning’, or ‘What’s on my plate this week?’",
        sender: 'bot',
        timestamp: new Date(),
      },
    ],
    []
  );

  /* Hero card upcoming rows - strictly real tasks. When there are none we
     render a single "nothing yet" row rather than lying about fake
     reminders, so the app never looks pre-populated. */
  const liveUpcoming = stats.upcoming.slice(0, 3).map((t, i) => ({
    t: t.title,
    d: formatShortDate(t.dueDate),
    c: ['#7c6cff', '#c084fc', '#3b82f6'][i % 3],
  }));

  const heroCardLabel = !stats.loaded
    ? 'Loading today\u2026'
    : stats.hasData
      ? `${stats.total} on your plate`
      : 'Nothing scheduled yet';
  const heroCardSubtitle = stats.hasData
    ? `${stats.dueThisWeek} due this week \u00b7 ${stats.synced} on Google Calendar`
    : 'Chat or drop a doc and it lands here.';
  const heroCardFooterRight = stats.hasData
    ? `${stats.synced}/${stats.total} synced`
    : '';

  return (
    <Box>
      {/* HERO ──────────────────────────────────────────────────────────── */}
      <Box
        component="section"
        id="today"
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          py: { xs: 5, md: 7 },
          overflow: 'hidden',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            right: { xs: '-30%', md: '-8%' },
            top: { xs: '-10%', md: '8%' },
            display: { xs: 'none', sm: 'block' },
            pointerEvents: 'none',
          }}
        >
          <WaveBlob size={560} opacity={0.95} hue="purple" />
        </Box>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            right: { xs: '-40%', md: '12%' },
            bottom: { xs: '-30%', md: '-14%' },
            display: { xs: 'none', md: 'block' },
            pointerEvents: 'none',
          }}
        >
          <WaveBlob size={360} opacity={0.7} hue="blue" />
        </Box>

        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            <Grid item xs={12} md={7} className="ss-fade-up">
              <Eyebrow>Cadence · AI day planner</Eyebrow>
              <Typography
                variant="h1"
                sx={{
                  mt: 2,
                  fontSize: { xs: 40, sm: 52, md: 64 },
                  lineHeight: 1.02,
                  letterSpacing: '-0.03em',
                  fontWeight: 800,
                }}
                className="ss-gradient-text"
              >
                Plan your day.
              </Typography>
              <Typography
                sx={{
                  mt: 2,
                  fontSize: { xs: 16, md: 18 },
                  lineHeight: 1.55,
                  color: 'var(--ss-text-soft)',
                  maxWidth: 560,
                }}
              >
                A chatbot that actually runs your schedule. Tell it what you want
                done - reminders, focus blocks, errands, meetings - and it lands
                on your calendar.
              </Typography>

              {/* Primary sign-up CTA — shown only when signed out. Once
                  the user authenticates we collapse this row so the page
                  doesn't keep pushing them to sign in. */}
              {!session && (
                <Box
                  sx={{
                    mt: 3.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    flexWrap: 'wrap',
                  }}
                >
                  <GoogleSignInButton label="Sign up with Google" />
                  <Typography
                    sx={{ fontSize: 13, color: 'var(--ss-text-mute)' }}
                  >
                    Free during beta &middot; one click &middot; no credit card
                  </Typography>
                </Box>
              )}

              {/* Inline chat prompt – submits straight into the chat section */}
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitHero();
                }}
                sx={{
                  mt: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 0.75,
                  pl: 2.25,
                  maxWidth: 560,
                  borderRadius: 999,
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  background:
                    'linear-gradient(180deg, rgba(26,23,51,0.75) 0%, rgba(20,17,39,0.45) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 20px 40px -24px rgba(124,108,255,0.5)',
                }}
              >
                <ChatBubbleOutline
                  sx={{ color: '#a08fff', fontSize: 20, flexShrink: 0 }}
                />
                <Box
                  component="input"
                  value={heroInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHeroInput(e.target.value)
                  }
                  placeholder="Remind me to call Alex tomorrow at 6pm…"
                  sx={{
                    flex: 1,
                    bgcolor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: 15,
                    fontFamily: 'inherit',
                    py: 1.25,
                    '::placeholder': { color: 'rgba(255,255,255,0.5)' },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="small"
                  endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                  sx={{ ml: 0.5, flexShrink: 0 }}
                >
                  Plan it
                </Button>
              </Box>

              {/* Quick-try chips */}
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  maxWidth: 560,
                }}
              >
                {[
                  'Plan my day tomorrow',
                  'Block 2h deep work Thursday',
                  'What’s on my plate this week?',
                ].map((s) => (
                  <Box
                    key={s}
                    role="button"
                    tabIndex={0}
                    onClick={() => submitHero(s)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' ? submitHero(s) : undefined
                    }
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.72)',
                      background: 'rgba(124,108,255,0.08)',
                      border: '1px solid rgba(139,92,246,0.25)',
                      cursor: 'pointer',
                      transition: 'all 160ms ease',
                      '&:hover': {
                        background: 'rgba(124,108,255,0.2)',
                        borderColor: 'rgba(139,92,246,0.55)',
                        color: '#fff',
                      },
                    }}
                  >
                    {s}
                  </Box>
                ))}
              </Box>

              {/* Real stats only - never marketing filler. When the
                  user hasn't got anything on their plate yet we
                  hide the stat row entirely so the hero isn't
                  padded with pretend numbers. */}
              {stats.hasData && (
                <Box
                  sx={{
                    mt: 4,
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(3, minmax(0, 1fr))',
                      md: 'repeat(3, max-content)',
                    },
                    columnGap: { xs: 3, md: 6 },
                    rowGap: 3,
                  }}
                >
                  <Stat value={String(stats.total)} label="On your plate" />
                  <Stat
                    value={String(stats.dueThisWeek)}
                    label="Due this week"
                  />
                  <Stat value={`${stats.pct}%`} label="Completed" />
                </Box>
              )}
            </Grid>

            <Grid
              item
              xs={12}
              md={5}
              sx={{
                display: { xs: 'none', md: 'flex' },
                justifyContent: 'flex-end',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 380,
                  p: 3,
                  borderRadius: 4,
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  background:
                    'linear-gradient(180deg, rgba(26,23,51,0.75) 0%, rgba(20,17,39,0.45) 100%)',
                  backdropFilter: 'blur(10px)',
                }}
                className="ss-fade-up"
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    aria-hidden
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: 'linear-gradient(135deg,#7c6cff,#3b82f6)',
                    }}
                  />
                  <Typography sx={{ fontWeight: 600 }}>Today</Typography>
                  <Typography
                    sx={{
                      ml: 'auto',
                      fontSize: 11,
                      color: 'var(--ss-text-mute)',
                      letterSpacing: '0.18em',
                    }}
                  >
                    {stats.loaded ? 'UPDATED' : 'LOADING\u2026'}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    mt: 3,
                    fontSize: 34,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                  className="ss-gradient-text-blue"
                >
                  {heroCardLabel}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 13,
                  }}
                >
                  {heroCardSubtitle}
                </Typography>
                <Box sx={{ mt: 2.5, display: 'grid', gap: 1 }}>
                  {liveUpcoming.length > 0 ? (
                    liveUpcoming.map((row) => (
                      <Box
                        key={row.t}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.25,
                          borderRadius: 2,
                          border: '1px solid rgba(139,92,246,0.2)',
                          background: 'rgba(10,9,20,0.5)',
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: row.c,
                            boxShadow: `0 0 10px ${row.c}`,
                          }}
                        />
                        <Typography sx={{ fontSize: 14 }}>{row.t}</Typography>
                        <Typography
                          sx={{
                            ml: 'auto',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {row.d}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    /* Honest empty state instead of fake rows - a
                       subtle dashed card hints that this is the slot
                       upcoming items will live in. */
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px dashed rgba(139,92,246,0.28)',
                        background: 'rgba(10,9,20,0.35)',
                        textAlign: 'center',
                        color: 'var(--ss-text-mute)',
                        fontSize: 13,
                      }}
                    >
                      Your next three items show up here.
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    mt: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--ss-text-mute)',
                    gap: 1,
                  }}
                >
                  {stats.calendarConnected === null ? (
                    <span>Checking Google Calendar\u2026</span>
                  ) : stats.calendarConnected ? (
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        color: '#22d3ee',
                      }}
                    >
                      <Box
                        aria-hidden
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: '#22d3ee',
                          boxShadow: '0 0 8px #22d3ee',
                        }}
                      />
                      Google Calendar connected
                    </Box>
                  ) : (
                    <Box
                      component={RouterLink}
                      to="/settings"
                      sx={{
                        color: '#c7b9ff',
                        textDecoration: 'none',
                        fontWeight: 600,
                        '&:hover': { color: '#fff' },
                      }}
                    >
                      Connect Google Calendar \u2192
                    </Box>
                  )}
                  <span>{heroCardFooterRight}</span>
                </Box>
              </Box>
            </Grid>
          </Grid>

        </Container>
      </Box>

      {/* FEATURES ─────────────────────────────────────────────────────── */}
      <Box
        component="section"
        id="features"
        sx={{ py: { xs: 7, md: 10 }, position: 'relative' }}
      >
        <Container maxWidth="lg">
          <SectionHeader
            eyebrow="What it does"
            title={
              <>
                One assistant for <br /> everything on your plate.
              </>
            }
            subtitle="Reminders, focus blocks, routines, appointments, deadlines. You chat - it organises."
          />

          <Grid container spacing={3} sx={{ mt: { xs: 4, md: 6 } }}>
            <Grid item xs={12} md={3}>
              <FeatureCard
                icon={<SmartToy />}
                title="Chat-first scheduling"
                description="Ask in plain English. Cadence parses intent, dates and durations - and schedules it for you."
                bullets={[
                  'Relative dates (“next Friday”)',
                  'Recurring events',
                  'Context-aware suggestions',
                ]}
                accent="#7c6cff"
                cta="Open chat"
                onClick={() => scrollToId('chat')}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FeatureCard
                icon={<InsertDriveFileOutlined />}
                title="Capture from any doc"
                description="Drop in meeting notes, a syllabus, an itinerary - Cadence extracts the tasks and dates."
                bullets={[
                  'PDF, DOCX, TXT',
                  'Preview before saving',
                  'Bulk-schedule at once',
                ]}
                accent="#c084fc"
                cta="Upload a document"
                onClick={() => scrollToId('capture')}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FeatureCard
                icon={<TaskAlt />}
                title="Tasks, done your way"
                description="Add manually, complete in a click, or push straight to Google Calendar. Everything stays in sync."
                bullets={[
                  'One-tap complete',
                  'Buckets (Work, Personal…)',
                  'Priority & due dates',
                ]}
                accent="#22d3ee"
                cta="Open tasks"
                onClick={() => scrollToId('tasks')}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FeatureCard
                icon={<CalendarMonth />}
                title="Google Calendar sync"
                description="One-click OAuth. Every task lands as a real calendar event with reminders and colour coding."
                bullets={[
                  'Bulk sync',
                  'Auto token refresh',
                  'Same view on every device',
                ]}
                accent="#3b82f6"
                cta="Open calendar"
                onClick={() => scrollToId('calendar')}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CHAT ──────────────────────────────────────────────────────────── */}
      <Box
        component="section"
        id="chat"
        sx={{ py: { xs: 7, md: 10 }, position: 'relative' }}
      >
        <Container maxWidth="lg">
          <SectionHeader
            eyebrow="The chat"
            title={
              <>
                Talk. It&rsquo;ll handle <br /> the scheduling.
              </>
            }
            subtitle="No menus, no forms. Just say what you need. Cadence figures out the date, the time, the type, and puts it on your Google Calendar."
          />
          <Box sx={{ mt: { xs: 4, md: 6 }, maxWidth: 980, mx: 'auto' }}>
            <ChatPanel
              height={640}
              initialMessages={initialChatMessages}
              pendingPrompt={pendingPrompt}
              onReply={() => bumpVersion()}
              suggestions={[
                'Plan my week',
                'Remind me to pay rent on the 1st',
                'Block focus time tomorrow 9–11am',
                'What\u2019s due this week?',
              ]}
            />
          </Box>
        </Container>
      </Box>

      {/* CAPTURE (doc upload, reframed) ───────────────────────────────── */}
      <Box component="section" id="capture" sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="md">
          <SectionHeader
            eyebrow="Capture"
            title={
              <>
                Got a document? <br /> We&rsquo;ll pull the tasks out.
              </>
            }
            subtitle="Drop a meeting note, a project brief, a class syllabus, an itinerary - Cadence extracts every date and action so you can review, then save."
          />

          {/* The actual uploader - no decorative twin. */}
          <Box
            id="capture-dropzone"
            sx={{ mt: { xs: 4, md: 6 }, scrollMarginTop: 96 }}
          >
            <UploadSyllabus embedded />
          </Box>
        </Container>
      </Box>

      {/* TASKS + CALENDAR ─────────────────────────────────────────────── */}
      <Box component="section" id="tasks" sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <SectionHeader
            eyebrow="Tasks + calendar"
            title={
              <>
                Plan and execute <br /> in one view.
              </>
            }
            subtitle="Your task list and month view now live side-by-side, so you can edit work and see dates in one place."
          />
          <Box sx={{ mt: { xs: 4, md: 6 } }}>
            <Box id="calendar" sx={{ scrollMarginTop: 96 }}>
              <Card sx={{ overflow: 'hidden' }}>
                <Grid container>
                  <Grid
                    item
                    xs={12}
                    lg={8.5}
                    sx={{
                      borderRight: {
                        xs: 'none',
                        lg: '1px solid rgba(139, 92, 246, 0.16)',
                      },
                      borderBottom: {
                        xs: '1px solid rgba(139, 92, 246, 0.16)',
                        lg: 'none',
                      },
                    }}
                  >
                    <CardHeader>
                      <CardTitle>Your month</CardTitle>
                      <CardDescription>
                        Drag your eyes across the month and spot due dates instantly.
                      </CardDescription>
                    </CardHeader>
                    <CardContent sx={{ pt: 0 }}>
                      <TaskCalendar
                        tasks={(stats.tasks ?? []) as CalendarTask[]}
                        variant="full"
                        framed={false}
                      />
                    </CardContent>
                  </Grid>
                  <Grid item xs={12} lg={3.5}>
                    <CardHeader>
                      <CardTitle>My tasks</CardTitle>
                      <CardDescription>
                        Quick edits, completion, and Google sync in one rail.
                      </CardDescription>
                    </CardHeader>
                    <CardContent sx={{ pt: 0, pb: 1 }}>
                      {/* The sticky top-bar "+ New task" button is the one canonical
                          entry point for manual task creation, so no extra CTA here. */}
                      <TasksSection embedded />
                    </CardContent>
                  </Grid>
                </Grid>
              </Card>
            </Box>
          </Box>
          {stats.calendarConnected === false && (
            <Box
              sx={{
                mt: 3,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/settings')}
                startIcon={<CalendarMonth />}
              >
                Connect Google Calendar
              </Button>
            </Box>
          )}
        </Container>
      </Box>

      {/* Pricing + giant marketing CTA removed entirely - this is an app,
          not a landing page. The slim "beta" strip above the footer is
          enough context while we're free. */}

      {/* BETA STRIP + FOOTER ─────────────────────────────────────────── */}
      <Box
        component="footer"
        sx={{
          borderTop: '1px solid rgba(139, 92, 246, 0.18)',
          mt: { xs: 2, md: 4 },
          py: 3,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 1.5,
              justifyContent: 'space-between',
              color: 'var(--ss-text-mute)',
              fontSize: 13,
            }}
          >
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <Box
                aria-hidden
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: '#22d3ee',
                  boxShadow: '0 0 8px #22d3ee',
                }}
              />
              <span>Free during beta - no credit card needed.</span>
            </Box>
            <Box>
              &copy; {new Date().getFullYear()} Cadence &middot; Your day, in
              rhythm.
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
