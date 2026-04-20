import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Snackbar,
  Alert,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  Menu as MenuIcon,
  Close as CloseIcon,
  HomeOutlined,
  CalendarMonth,
  TaskAltOutlined,
  CloudUploadOutlined,
  TuneOutlined,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTasks } from '../contexts/TasksContext.tsx';
import AddTaskDialog from './AddTaskDialog.tsx';
import { API_BASE_URL } from '../config/api.ts';
import UserMenu from './UserMenu.tsx';
import PulseChatIcon from './icons/PulseChatIcon.tsx';

/**
 * App chrome: a fixed left sidebar with quick nav + a thin top bar with
 * the contextual greeting and the primary "New task" CTA. Wraps every
 * route so the product feels like one coherent app rather than a
 * scroll-marketing page.
 */

const SIDEBAR_WIDTH = 232;
const SIDEBAR_WIDTH_COLLAPSED = 76;

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
};

/** Sections we observe for scroll-spy (nav labels are separate from this list). */
const SCROLL_SPY_IDS = [
  'today',
  'features',
  'chat',
  'tasks',
  'calendar',
  'capture',
];

const primaryNav: NavItem[] = [
  { label: 'Today', to: '/#today', icon: <HomeOutlined /> },
  { label: 'Chat', to: '/#chat', icon: <PulseChatIcon size={22} /> },
  { label: 'Capture', to: '/#capture', icon: <CloudUploadOutlined /> },
];

const secondaryNav: NavItem[] = [
  { label: 'Settings', to: '/settings', icon: <TuneOutlined /> },
];

const formatToday = (): string => {
  const d = new Date();
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

/* ──────────────────────────────────────────────────────────────────────── */
const Logo: React.FC<{ collapsed?: boolean }> = ({ collapsed }) => (
  <Box
    component={RouterLink}
    to="/"
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      textDecoration: 'none',
      color: 'inherit',
      px: collapsed ? 0 : 0.5,
      justifyContent: collapsed ? 'center' : 'flex-start',
    }}
  >
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: '12px',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #7c6cff 0%, #3b82f6 100%)',
        boxShadow: '0 8px 24px -12px rgba(124,108,255,0.9)',
        flexShrink: 0,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 24 24"
        sx={{ width: 18, height: 18, color: '#fff' }}
      >
        {/* Pulse / rhythm mark */}
        <path
          fill="currentColor"
          d="M2 12h3l2-6 4 12 3-10 2 6h6v2h-7l-1-3-3 10-4-14-1 3H2v-2Z"
        />
      </Box>
    </Box>
    {!collapsed && (
      <Box sx={{ lineHeight: 1 }}>
        <Typography
          component="span"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontSize: 18,
            display: 'block',
          }}
        >
          Cadence
        </Typography>
        <Typography
          component="span"
          sx={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--ss-text-mute)',
            textTransform: 'uppercase',
          }}
        >
          Your day, in rhythm
        </Typography>
      </Box>
    )}
  </Box>
);

const NavButton: React.FC<{
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  onClick: () => void;
}> = ({ item, active, collapsed, onClick }) => {
  const content = (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' ? onClick() : undefined)}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: collapsed ? 1.25 : 1.75,
        py: 1.1,
        borderRadius: 2.5,
        cursor: 'pointer',
        color: active ? '#fff' : 'rgba(255,255,255,0.68)',
        background: active
          ? 'linear-gradient(90deg, rgba(124,108,255,0.18), rgba(124,108,255,0.05))'
          : 'transparent',
        border: active
          ? '1px solid rgba(139,92,246,0.35)'
          : '1px solid transparent',
        transition: 'all 180ms ease',
        justifyContent: collapsed ? 'center' : 'flex-start',
        '&:hover': {
          color: '#fff',
          background: 'rgba(124,108,255,0.08)',
          borderColor: 'rgba(139,92,246,0.2)',
        },
        '&:hover .ss-nav-dot, &[data-active="true"] .ss-nav-dot': {
          opacity: 1,
        },
      }}
      data-active={active}
    >
      <Box
        className="ss-nav-dot"
        sx={{
          position: 'absolute',
          left: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 4,
          height: active ? 22 : 10,
          borderRadius: 999,
          background: 'linear-gradient(180deg,#7c6cff,#3b82f6)',
          opacity: active ? 1 : 0,
          transition: 'all 200ms ease',
        }}
      />
      <Box
        sx={{
          width: 22,
          height: 22,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {item.icon}
      </Box>
      {!collapsed && (
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: active ? 600 : 500,
            letterSpacing: '-0.005em',
          }}
        >
          {item.label}
        </Typography>
      )}
    </Box>
  );
  return collapsed ? (
    <Tooltip title={item.label} placement="right">
      {content}
    </Tooltip>
  ) : (
    content
  );
};

/** Tasks + Calendar grouped in one bordered block (scroll to #tasks / #calendar). */
const PlanNavGroup: React.FC<{
  collapsed: boolean;
  activeHash: string;
  onHashNavigate: (hash: string) => void;
}> = ({ collapsed, activeHash, onHashNavigate }) => {
  const tasksActive = activeHash === 'tasks';
  const calActive = activeHash === 'calendar';

  const subRow = (
    label: string,
    hash: string,
    icon: React.ReactNode,
    active: boolean
  ) => (
    <Box
      key={hash}
      onClick={() => onHashNavigate(hash)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' ? onHashNavigate(hash) : undefined)}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: collapsed ? 1.25 : 1.5,
        py: 0.85,
        borderRadius: 2,
        cursor: 'pointer',
        color: active ? '#fff' : 'rgba(255,255,255,0.68)',
        background: active
          ? 'linear-gradient(90deg, rgba(124,108,255,0.22), rgba(124,108,255,0.06))'
          : 'transparent',
        border: active
          ? '1px solid rgba(139,92,246,0.4)'
          : '1px solid transparent',
        transition: 'all 180ms ease',
        justifyContent: collapsed ? 'center' : 'flex-start',
        '&:hover': {
          color: '#fff',
          background: 'rgba(124,108,255,0.1)',
          borderColor: 'rgba(139,92,246,0.25)',
        },
      }}
    >
      <Box
        sx={{
          width: 22,
          height: 22,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      {!collapsed && (
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: active ? 600 : 500,
            letterSpacing: '-0.005em',
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );

  const groupInner = (
    <Box
      sx={{
        borderRadius: 2.5,
        border: '1px solid rgba(139, 92, 246, 0.28)',
        background: 'rgba(124, 108, 255, 0.05)',
        p: collapsed ? 0.35 : 0.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.35,
      }}
    >
      {subRow('Tasks', 'tasks', <TaskAltOutlined sx={{ fontSize: 20 }} />, tasksActive)}
      {subRow(
        'Calendar',
        'calendar',
        <CalendarMonth sx={{ fontSize: 20 }} />,
        calActive
      )}
    </Box>
  );

  if (collapsed) {
    return (
      <Tooltip title="Tasks & calendar" placement="right">
        <Box
          onClick={() => onHashNavigate('tasks')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            e.key === 'Enter' ? onHashNavigate('tasks') : undefined
          }
          sx={{
            borderRadius: 2.5,
            border: '1px solid rgba(139, 92, 246, 0.28)',
            background: 'rgba(124, 108, 255, 0.05)',
            py: 0.75,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { background: 'rgba(124, 108, 255, 0.12)' },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateRows: '11px 11px',
              gap: '3px',
              justifyItems: 'center',
            }}
          >
            <TaskAltOutlined sx={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }} />
            <CalendarMonth sx={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }} />
          </Box>
        </Box>
      </Tooltip>
    );
  }

  return groupInner;
};

/* ──────────────────────────────────────────────────────────────────────── */
const Sidebar: React.FC<{
  collapsed: boolean;
  activeHash: string;
  onNavigate: (item: NavItem) => void;
  onHashNavigate: (hash: string) => void;
  currentPath: string;
}> = ({ collapsed, activeHash, onNavigate, onHashNavigate, currentPath }) => (
  <Box
    sx={{
      width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid rgba(139, 92, 246, 0.16)',
      backgroundColor: 'rgba(10, 9, 20, 0.55)',
      backdropFilter: 'blur(14px)',
      transition: 'width 200ms ease',
      zIndex: 5,
    }}
  >
    <Box sx={{ p: 2, pt: 2.5 }}>
      <Logo collapsed={collapsed} />
    </Box>

    <Box sx={{ px: 1.25, mt: 1, display: 'grid', gap: 0.5 }}>
      {primaryNav.slice(0, 2).map((item) => {
        const hash = item.to.startsWith('/#') ? item.to.slice(2) : '';
        const active =
          currentPath === '/' ? activeHash === hash : currentPath === item.to;
        return (
          <NavButton
            key={item.to}
            item={item}
            active={active}
            collapsed={collapsed}
            onClick={() => onNavigate(item)}
          />
        );
      })}
      <PlanNavGroup
        collapsed={collapsed}
        activeHash={activeHash}
        onHashNavigate={onHashNavigate}
      />
      {primaryNav.slice(2).map((item) => {
        const hash = item.to.startsWith('/#') ? item.to.slice(2) : '';
        const active =
          currentPath === '/' ? activeHash === hash : currentPath === item.to;
        return (
          <NavButton
            key={item.to}
            item={item}
            active={active}
            collapsed={collapsed}
            onClick={() => onNavigate(item)}
          />
        );
      })}
    </Box>

    <Box sx={{ flexGrow: 1 }} />

    <Box
      sx={{
        px: 1.25,
        pb: 2,
        display: 'grid',
        gap: 0.5,
        borderTop: '1px solid rgba(139, 92, 246, 0.1)',
        pt: 1.5,
        mx: collapsed ? 1 : 1.5,
      }}
    >
      {secondaryNav.map((item) => {
        const active = currentPath === item.to;
        return (
          <NavButton
            key={item.to}
            item={item}
            active={active}
            collapsed={collapsed}
            onClick={() => onNavigate(item)}
          />
        );
      })}
    </Box>
  </Box>
);

/* ──────────────────────────────────────────────────────────────────────── */
/* Small, self-contained "Sync to Google Calendar" action that lives in
   the TopBar. Keeping it here - rather than forcing the user to hunt
   for the Settings page - means a single click pushes whatever is new
   to their calendar. Connection state is checked lazily when they
   click, not on every mount, to avoid the flicker of a disabled
   button on cold start. */
type SyncState = 'idle' | 'syncing' | 'ok' | 'error';

const SyncToGoogleButton: React.FC = () => {
  const navigate = useNavigate();
  const { bumpVersion } = useTasks();
  const [state, setState] = useState<SyncState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);

  const runSync = async () => {
    if (state === 'syncing') return;
    setState('syncing');
    setMessage(null);
    try {
      const statusRes = await fetch(
        `${API_BASE_URL}/syllabus/calendar/status`
      );
      const statusJson = await statusRes.json().catch(() => ({}));
      if (!statusJson?.connected) {
        setState('error');
        setMessage(
          'Connect Google Calendar first - opening Settings.'
        );
        setSnackOpen(true);
        setTimeout(() => navigate('/settings'), 400);
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/syllabus/tasks/sync-all-calendar`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Sync failed.');
      }
      const synced =
        typeof data?.synced === 'number' ? data.synced : undefined;
      setState('ok');
      setMessage(
        synced === 0
          ? 'Everything was already on your calendar.'
          : synced != null
            ? `Pushed ${synced} task${synced === 1 ? '' : 's'} to Google Calendar.`
            : 'Pushed everything to Google Calendar.'
      );
      setSnackOpen(true);
      bumpVersion();
      setTimeout(() => setState('idle'), 2500);
    } catch (e) {
      setState('error');
      setMessage(e instanceof Error ? e.message : 'Sync failed.');
      setSnackOpen(true);
      setTimeout(() => setState('idle'), 2500);
    }
  };

  const label =
    state === 'syncing'
      ? 'Syncing\u2026'
      : state === 'ok'
        ? 'Synced'
        : 'Sync to Google';

  const icon =
    state === 'syncing' ? (
      <CircularProgress size={16} sx={{ color: 'inherit' }} />
    ) : state === 'ok' ? (
      <CheckCircleIcon />
    ) : (
      <SyncIcon />
    );

  return (
    <>
      <Tooltip title="Push all tasks to Google Calendar">
        <span>
          <Button
            variant="outlined"
            color="primary"
            startIcon={icon}
            onClick={runSync}
            disabled={state === 'syncing'}
            sx={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
              borderColor:
                state === 'ok'
                  ? 'rgba(34, 211, 238, 0.6)'
                  : 'rgba(139, 92, 246, 0.35)',
              color:
                state === 'ok' ? '#22d3ee' : 'rgba(255,255,255,0.92)',
              '&:hover': {
                borderColor: 'rgba(139, 92, 246, 0.55)',
                background: 'rgba(139, 92, 246, 0.08)',
              },
              /* Hide the label on narrow screens; icon still conveys
                 the action and the aria-label keeps it accessible. */
              '& .MuiButton-startIcon': {
                mr: { xs: 0, sm: 1 },
              },
              px: { xs: 1.25, sm: 2 },
              minWidth: { xs: 40, sm: 'auto' },
            }}
            aria-label="Sync tasks to Google Calendar"
          >
            <Box
              component="span"
              sx={{ display: { xs: 'none', sm: 'inline' } }}
            >
              {label}
            </Box>
          </Button>
        </span>
      </Tooltip>
      <Snackbar
        open={snackOpen}
        autoHideDuration={3500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={state === 'error' ? 'error' : 'success'}
          variant="filled"
          sx={{ fontWeight: 600 }}
        >
          {message}
        </Alert>
      </Snackbar>
    </>
  );
};

/* ──────────────────────────────────────────────────────────────────────── */
const TopBar: React.FC<{
  onMobileMenu: () => void;
  subtitle?: string;
}> = ({ onMobileMenu, subtitle }) => {
  const { openAddTask } = useTasks();
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: { xs: 2, md: 3.5 },
        py: 1.5,
        backgroundColor: 'rgba(10, 9, 20, 0.72)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.14)',
      }}
    >
      <IconButton
        onClick={onMobileMenu}
        sx={{
          display: { xs: 'inline-flex', md: 'none' },
          color: '#fff',
          border: '1px solid rgba(139, 92, 246, 0.22)',
          borderRadius: 2,
        }}
      >
        <MenuIcon />
      </IconButton>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ss-text-mute)',
          }}
        >
          {formatToday()}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.2,
              mt: 0.25,
            }}
            noWrap
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <SyncToGoogleButton />
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={openAddTask}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          <Box
            component="span"
            sx={{ display: { xs: 'none', sm: 'inline' } }}
          >
            New task
          </Box>
          <Box
            component="span"
            sx={{ display: { xs: 'inline', sm: 'none' } }}
          >
            New
          </Box>
        </Button>
        <UserMenu />
      </Box>
    </Box>
  );
};

/* ──────────────────────────────────────────────────────────────────────── */
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState<string>('today');

  const goToHash = React.useCallback(
    (hash: string) => {
      setMobileOpen(false);
      if (location.pathname !== '/') {
        navigate('/');
        window.setTimeout(() => {
          window.history.replaceState({}, '', `/#${hash}`);
          document
            .getElementById(hash)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      } else {
        window.history.replaceState({}, '', `/#${hash}`);
        document
          .getElementById(hash)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [location.pathname, navigate]
  );

  /* Track which landing section is in view so the sidebar highlights it. */
  useEffect(() => {
    if (location.pathname !== '/') return;
    const elements = SCROLL_SPY_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)
          )[0];
        if (visible) setActiveHash(visible.target.id);
      },
      {
        // 80px from top so the active row swaps right as the section
        // clears the top bar.
        rootMargin: '-80px 0px -55% 0px',
        threshold: [0, 0.2, 0.5, 1],
      }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  /* Respect a hash in the URL when the app first boots (e.g. user
     shares "/#capture"). React Router doesn't scroll for us. */
  useEffect(() => {
    if (location.pathname !== '/') return;
    const id = window.location.hash.replace('#', '');
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    // Small delay so the section is laid out before we scroll.
    const t = window.setTimeout(
      () => el.scrollIntoView({ behavior: 'auto', block: 'start' }),
      80
    );
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  const handleNavigate = (item: NavItem) => {
    setMobileOpen(false);
    if (item.to.startsWith('/#')) {
      const id = item.to.slice(2);
      /* Keep the URL hash in sync with the landing section so refresh /
         share-URL preserves the user's scroll position. We don't use
         react-router's navigate for the hash because it re-renders; a
         direct pushState avoids the flash. */
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          window.history.replaceState({}, '', `/#${id}`);
          document
            .getElementById(id)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      } else {
        window.history.replaceState({}, '', `/#${id}`);
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    navigate(item.to);
  };

  /* Match the current path to a section to show on the top bar. */
  const routeSubtitles: Record<string, string> = {
    '/': 'Welcome back. Here\u2019s your day.',
    '/settings': 'Settings - connect Google & manage sync.',
  };
  const subtitle =
    routeSubtitles[location.pathname] ?? 'Your day, in rhythm.';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Sidebar
          collapsed={false}
          activeHash={activeHash}
          onNavigate={handleNavigate}
          onHashNavigate={goToHash}
          currentPath={location.pathname}
        />
      </Box>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: SIDEBAR_WIDTH,
            backgroundColor: '#0a0914',
            backgroundImage: 'none',
            borderRight: '1px solid rgba(139, 92, 246, 0.22)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
          }}
        >
          <Logo />
          <IconButton
            onClick={() => setMobileOpen(false)}
            sx={{ color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ px: 1.25, display: 'grid', gap: 0.5 }}>
          {primaryNav.slice(0, 2).map((item) => {
            const hash = item.to.startsWith('/#') ? item.to.slice(2) : '';
            const active =
              location.pathname === '/'
                ? activeHash === hash
                : location.pathname === item.to;
            return (
              <NavButton
                key={item.to}
                item={item}
                active={active}
                collapsed={false}
                onClick={() => handleNavigate(item)}
              />
            );
          })}
          <PlanNavGroup
            collapsed={false}
            activeHash={activeHash}
            onHashNavigate={goToHash}
          />
          {primaryNav.slice(2).map((item) => {
            const hash = item.to.startsWith('/#') ? item.to.slice(2) : '';
            const active =
              location.pathname === '/'
                ? activeHash === hash
                : location.pathname === item.to;
            return (
              <NavButton
                key={item.to}
                item={item}
                active={active}
                collapsed={false}
                onClick={() => handleNavigate(item)}
              />
            );
          })}
          {secondaryNav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <NavButton
                key={item.to}
                item={item}
                active={active}
                collapsed={false}
                onClick={() => handleNavigate(item)}
              />
            );
          })}
        </Box>
      </Drawer>

      {/* Main column */}
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TopBar
          onMobileMenu={() => setMobileOpen(true)}
          subtitle={subtitle}
        />
        <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
        </Box>
      </Box>

      <AddTaskDialog />
    </Box>
  );
};

export default AppShell;
