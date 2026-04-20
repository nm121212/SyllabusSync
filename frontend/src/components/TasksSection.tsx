import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  CheckCircleOutline,
  CloudDone,
  CloudSync,
  DeleteOutline,
  EditOutlined,
  MoreHoriz,
  Search,
} from '@mui/icons-material';
import { useTasks } from '../contexts/TasksContext.tsx';
import { API_BASE_URL } from '../config/api.ts';
import EditTaskDialog from './EditTaskDialog.tsx';

/**
 * "Tasks" card on the landing: a compact, scannable list of everything on
 * the user's plate with inline complete/delete/sync-to-google actions and
 * a prominent "Add task" button. Reads and mutates the same backend the
 * chat and calendar use, and bumps the shared tasks version on any change.
 */

interface BackendTask {
  id: number;
  courseName?: string;
  title: string;
  type?: string;
  priority?: string;
  dueDate: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  googleEventId?: string;
  description?: string;
}

const TYPE_TO_LABEL: Record<string, { label: string; color: string }> = {
  ASSIGNMENT: { label: 'Deadline', color: '#7c6cff' },
  PROJECT: { label: 'Project', color: '#a855f7' },
  EXAM: { label: 'Exam', color: '#f472b6' },
  QUIZ: { label: 'Quiz', color: '#fbbf24' },
  LAB: { label: 'Lab', color: '#22d3ee' },
  PRESENTATION: { label: 'Meeting', color: '#3b82f6' },
  PAPER: { label: 'Paper', color: '#c084fc' },
  DISCUSSION: { label: 'Discussion', color: '#60a5fa' },
  OTHER: { label: 'Task', color: '#7c6cff' },
};

const formatDue = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7)
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  if (diff < 0) return `${-diff} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isOverdue = (t: BackendTask): boolean => {
  if (!t.dueDate || t.status === 'COMPLETED') return false;
  const d = new Date(t.dueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

type TaskFilter = 'all' | 'open' | 'done';

const TasksSection: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { version, bumpVersion, openAddTask } = useTasks();
  const [tasks, setTasks] = useState<BackendTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    taskId: number;
  } | null>(null);
  /** Two-click delete guard: the first click turns the Delete item into a
   *  red "Really delete?" so a single stray click can never nuke a task. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  /* Bulk actions (Clear completed / Delete all) live in a small overflow
     menu on the list header. Both are guarded by a confirm state so a
     stray click can't wipe someone's plate. */
  const [bulkAnchor, setBulkAnchor] = useState<HTMLElement | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<
    null | 'clearCompleted' | 'deleteAll'
  >(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [editingTask, setEditingTask] = useState<BackendTask | null>(null);

  /* Fetch on mount + whenever the shared version bumps */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/syllabus/tasks`);
        if (!res.ok) throw new Error('fetch failed');
        const data: BackendTask[] = await res.json();
        if (!cancelled) setTasks(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setTasks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const sorted = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => {
      const aDone = a.status === 'COMPLETED';
      const bDone = b.status === 'COMPLETED';
      if (aDone !== bDone) return aDone ? 1 : -1;
      const ad = a.dueDate ? new Date(a.dueDate + 'T00:00:00').getTime() : 0;
      const bd = b.dueDate ? new Date(b.dueDate + 'T00:00:00').getTime() : 0;
      return ad - bd;
    });
  }, [tasks]);

  const openCount = sorted.filter((t) => t.status !== 'COMPLETED').length;
  const doneCount = sorted.filter((t) => t.status === 'COMPLETED').length;

  /** Final list the user sees - sort-then-filter-then-search. */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((t) => {
      if (filter === 'open' && t.status === 'COMPLETED') return false;
      if (filter === 'done' && t.status !== 'COMPLETED') return false;
      if (!q) return true;
      const hay = `${t.title} ${t.courseName ?? ''} ${t.type ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sorted, filter, query]);

  const setPending = (id: number, pending: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });

  const openEdit = (t: BackendTask) => {
    setMenuAnchor(null);
    setConfirmDeleteId(null);
    setError(null);
    setEditingTask(t);
  };

  const toggleComplete = async (t: BackendTask) => {
    setPending(t.id, true);
    setError(null);
    try {
      const nextStatus = t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      const res = await fetch(
        `${API_BASE_URL}/syllabus/tasks/${t.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      if (!res.ok) throw new Error('Could not update task.');
      bumpVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setPending(t.id, false);
    }
  };

  const deleteTask = async (t: BackendTask) => {
    setMenuAnchor(null);
    setPending(t.id, true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/syllabus/tasks/${t.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Could not delete task.');
      bumpVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setPending(t.id, false);
    }
  };

  const clearCompleted = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    setError(null);
    try {
      const done = (tasks ?? []).filter((t) => t.status === 'COMPLETED');
      // Delete done tasks in parallel; we ignore individual failures and
      // just surface a generic error if *nothing* succeeded. This keeps
      // the UX predictable without blocking on a slow server.
      const results = await Promise.allSettled(
        done.map((t) =>
          fetch(`${API_BASE_URL}/syllabus/tasks/${t.id}`, { method: 'DELETE' })
        )
      );
      const ok = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as Response).ok
      ).length;
      if (ok === 0 && done.length > 0) {
        throw new Error('Could not clear completed tasks.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBulkBusy(false);
      setBulkAnchor(null);
      setBulkConfirm(null);
      bumpVersion();
    }
  };

  const deleteAll = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/syllabus/tasks`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Could not delete tasks.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBulkBusy(false);
      setBulkAnchor(null);
      setBulkConfirm(null);
      bumpVersion();
    }
  };

  const closeBulk = () => {
    setBulkAnchor(null);
    setBulkConfirm(null);
  };

  const syncToGoogle = async (t: BackendTask) => {
    setMenuAnchor(null);
    setPending(t.id, true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/syllabus/tasks/${t.id}/sync-calendar`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || 'Could not sync. Connect Google Calendar first.'
        );
      }
      bumpVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sync.');
    } finally {
      setPending(t.id, false);
    }
  };

  const loading = tasks === null;

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: embedded ? 0 : 4,
        border: embedded ? 'none' : '1px solid rgba(139, 92, 246, 0.22)',
        background: embedded
          ? 'transparent'
          : 'linear-gradient(180deg, rgba(26,23,51,0.75) 0%, rgba(20,17,39,0.45) 100%)',
        backdropFilter: embedded ? 'none' : 'blur(10px)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2.5, md: 3 },
          py: 2.25,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          borderBottom: '1px solid rgba(139, 92, 246, 0.16)',
          background:
            'linear-gradient(180deg, rgba(124,108,255,0.06) 0%, transparent 100%)',
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 180 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>
            On your plate
          </Typography>
          <Typography
            sx={{ color: 'var(--ss-text-mute)', fontSize: 12.5 }}
          >
            {loading
              ? 'Loading\u2026'
              : `${openCount} open \u00b7 ${doneCount} done`}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            order: { xs: 0, sm: 1 },
          }}
        >
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Add />}
            onClick={openAddTask}
          >
            Add task
          </Button>
          {!loading && sorted.length > 0 && (
            /* A labelled button is used instead of a lone kebab icon
               because "Delete all / Clear completed" are destructive
               and need to be discoverable - an anonymous ⋯ button was
               too easy to miss. The small caret hints at a menu. */
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => setBulkAnchor(e.currentTarget)}
              aria-haspopup="menu"
              aria-expanded={Boolean(bulkAnchor)}
              aria-label="Bulk task actions"
              endIcon={
                <Box
                  component="span"
                  sx={{
                    fontSize: 10,
                    lineHeight: 1,
                    opacity: 0.75,
                  }}
                  aria-hidden
                >
                  ▾
                </Box>
              }
              sx={{
                whiteSpace: 'nowrap',
                color: 'rgba(255,255,255,0.9)',
                borderColor: 'rgba(139, 92, 246, 0.32)',
                '&:hover': {
                  borderColor: 'rgba(139, 92, 246, 0.55)',
                  background: 'rgba(139, 92, 246, 0.08)',
                },
              }}
            >
              Manage
            </Button>
          )}
        </Box>
      </Box>

      {/* Bulk actions menu (Clear completed / Delete all) */}
      <Menu
        anchorEl={bulkAnchor}
        open={Boolean(bulkAnchor)}
        onClose={closeBulk}
        PaperProps={{
          sx: {
            minWidth: 260,
            bgcolor: 'rgba(20,17,39,0.98)',
            border: '1px solid rgba(139, 92, 246, 0.28)',
          },
        }}
      >
        <MenuItem
          disabled={bulkBusy || doneCount === 0}
          onClick={() => {
            if (bulkConfirm === 'clearCompleted') {
              clearCompleted();
            } else {
              setBulkConfirm('clearCompleted');
            }
          }}
          sx={{
            gap: 1.25,
            color:
              bulkConfirm === 'clearCompleted'
                ? '#f472b6'
                : 'rgba(255,255,255,0.9)',
            fontWeight: bulkConfirm === 'clearCompleted' ? 700 : 500,
          }}
        >
          <CheckCircleOutline fontSize="small" />
          {bulkConfirm === 'clearCompleted'
            ? `Really clear ${doneCount} completed?`
            : `Clear completed (${doneCount})`}
        </MenuItem>
        <MenuItem
          disabled={bulkBusy || sorted.length === 0}
          onClick={() => {
            if (bulkConfirm === 'deleteAll') {
              deleteAll();
            } else {
              setBulkConfirm('deleteAll');
            }
          }}
          sx={{
            gap: 1.25,
            color:
              bulkConfirm === 'deleteAll'
                ? '#f472b6'
                : '#f472b6',
            fontWeight: bulkConfirm === 'deleteAll' ? 700 : 600,
          }}
        >
          <DeleteOutline fontSize="small" />
          {bulkConfirm === 'deleteAll'
            ? `Really delete ALL ${sorted.length}?`
            : `Delete all tasks (${sorted.length})`}
        </MenuItem>
      </Menu>

      {/* Search + filter row - only shown when there's something to
          filter, so empty accounts don't get visual noise. */}
      {!loading && sorted.length > 0 && (
        <Box
          sx={{
            px: { xs: 2.5, md: 3 },
            pt: 2,
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            borderBottom: '1px solid rgba(139, 92, 246, 0.08)',
          }}
        >
          <TextField
            size="small"
            placeholder="Search tasks\u2026"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search
                    fontSize="small"
                    sx={{ color: 'var(--ss-text-mute)' }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              flexGrow: 1,
              minWidth: 160,
              '& .MuiOutlinedInput-root': { borderRadius: 999 },
            }}
          />
          <Box
            role="tablist"
            aria-label="Filter tasks"
            sx={{
              display: 'inline-flex',
              p: 0.3,
              borderRadius: 999,
              border: '1px solid rgba(139, 92, 246, 0.22)',
              background: 'rgba(10,9,20,0.5)',
            }}
          >
            {(
              [
                { id: 'all' as const, label: `All (${sorted.length})` },
                { id: 'open' as const, label: `Open (${openCount})` },
                { id: 'done' as const, label: `Done (${doneCount})` },
              ]
            ).map((opt) => {
              const active = filter === opt.id;
              return (
                <Box
                  key={opt.id}
                  role="tab"
                  aria-selected={active}
                  tabIndex={0}
                  onClick={() => setFilter(opt.id)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' || e.key === ' '
                      ? (e.preventDefault(), setFilter(opt.id))
                      : undefined
                  }
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: active ? '#fff' : 'var(--ss-text-mute)',
                    background: active
                      ? 'linear-gradient(135deg,#7c6cff 0%,#6366f1 100%)'
                      : 'transparent',
                    transition: 'all 160ms ease',
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ m: 2, borderRadius: 2 }}
          onClose={() => setError(null)}
          action={
            /Connect Google Calendar/i.test(error) ? (
              <Button
                component="a"
                href="/settings"
                color="inherit"
                size="small"
                sx={{ fontWeight: 600 }}
              >
                Open Settings
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      )}

      {/* List */}
      <Box
        sx={{
          maxHeight: embedded ? 640 : 520,
          overflowY: 'auto',
          py: loading ? 0 : 0.5,
        }}
      >
        {loading && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              color: 'var(--ss-text-mute)',
              gap: 1.25,
            }}
          >
            <CircularProgress size={16} sx={{ color: '#a08fff' }} />
            <Typography variant="body2">Loading your tasks…</Typography>
          </Box>
        )}

        {!loading && sorted.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
            <Typography
              sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, mb: 0.75 }}
            >
              Nothing on your plate yet.
            </Typography>
            <Typography
              sx={{
                color: 'var(--ss-text-mute)',
                fontSize: 13.5,
                mb: 2.5,
                maxWidth: 360,
                mx: 'auto',
              }}
            >
              Add a task manually, chat with Cadence, or drop a document and
              we&rsquo;ll extract the tasks for you.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={openAddTask}
            >
              Add your first task
            </Button>
          </Box>
        )}

        {!loading && sorted.length > 0 && visible.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 5, px: 3 }}>
            <Typography
              sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, mb: 0.5 }}
            >
              No matches.
            </Typography>
            <Typography
              sx={{
                color: 'var(--ss-text-mute)',
                fontSize: 13,
                mb: 2,
              }}
            >
              Try a different search term or switch the filter.
            </Typography>
            <Button
              variant="text"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Reset filters
            </Button>
          </Box>
        )}

        {!loading &&
          visible.map((t) => {
            const done = t.status === 'COMPLETED';
            const overdue = isOverdue(t);
            const typeMeta =
              TYPE_TO_LABEL[(t.type ?? 'OTHER').toUpperCase()] ??
              TYPE_TO_LABEL.OTHER;
            const isPending = pendingIds.has(t.id);
            return (
              <Box
                key={t.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: { xs: 2, md: 2.5 },
                  py: 1.5,
                  borderBottom: '1px solid rgba(139, 92, 246, 0.08)',
                  transition: 'background 160ms ease',
                  opacity: done ? 0.55 : 1,
                  '&:last-of-type': { borderBottom: 'none' },
                  '&:hover': { background: 'rgba(124, 108, 255, 0.05)' },
                }}
              >
                <Tooltip title={done ? 'Mark as not done' : 'Mark done'}>
                  <IconButton
                    size="small"
                    disabled={isPending}
                    onClick={() => toggleComplete(t)}
                    sx={{
                      color: done ? '#22d3ee' : 'rgba(255,255,255,0.55)',
                      '&:hover': { color: done ? '#22d3ee' : '#a08fff' },
                    }}
                  >
                    {done ? (
                      <CheckCircle sx={{ fontSize: 22 }} />
                    ) : (
                      <CheckCircleOutline sx={{ fontSize: 22 }} />
                    )}
                  </IconButton>
                </Tooltip>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 14.5,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.92)',
                      textDecoration: done ? 'line-through' : 'none',
                      mb: 0.25,
                    }}
                    noWrap
                  >
                    {t.title}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Chip
                      label={typeMeta.label}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10.5,
                        letterSpacing: '0.04em',
                        background: `${typeMeta.color}22`,
                        color: typeMeta.color,
                        border: `1px solid ${typeMeta.color}44`,
                        fontWeight: 600,
                      }}
                    />
                    {t.courseName && (
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.55)',
                        }}
                        noWrap
                      >
                        {t.courseName}
                      </Typography>
                    )}
                    {t.dueDate && (
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: overdue
                            ? '#f472b6'
                            : 'rgba(255,255,255,0.6)',
                          fontWeight: overdue ? 600 : 400,
                        }}
                      >
                        · {formatDue(t.dueDate)}
                      </Typography>
                    )}
                    {t.googleEventId && (
                      <Tooltip title="Synced to Google Calendar">
                        <CloudDone
                          sx={{ fontSize: 14, color: '#22d3ee', ml: 0.25 }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {isPending ? (
                  <CircularProgress size={16} sx={{ color: '#a08fff' }} />
                ) : (
                  <IconButton
                    size="small"
                    onClick={(e) =>
                      setMenuAnchor({ el: e.currentTarget, taskId: t.id })
                    }
                    sx={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    <MoreHoriz fontSize="small" />
                  </IconButton>
                )}
              </Box>
            );
          })}
      </Box>

      <Menu
        anchorEl={menuAnchor?.el ?? null}
        open={!!menuAnchor}
        onClose={() => {
          setMenuAnchor(null);
          setConfirmDeleteId(null);
        }}
        PaperProps={{
          sx: {
            bgcolor: '#141127',
            border: '1px solid rgba(139,92,246,0.22)',
            mt: 0.5,
            minWidth: 200,
          },
        }}
      >
        {menuAnchor &&
          sorted.find((t) => t.id === menuAnchor.taskId) && (
            <Box>
              <MenuItem
                onClick={() => {
                  const t = sorted.find((x) => x.id === menuAnchor.taskId);
                  if (t) openEdit(t);
                }}
              >
                <EditOutlined sx={{ fontSize: 18, mr: 1.25 }} />
                Edit task
              </MenuItem>
              {!sorted.find((t) => t.id === menuAnchor.taskId)
                ?.googleEventId && (
                <MenuItem
                  onClick={() => {
                    const t = sorted.find((x) => x.id === menuAnchor.taskId);
                    if (t) syncToGoogle(t);
                  }}
                >
                  <CloudSync sx={{ fontSize: 18, mr: 1.25 }} />
                  Sync to Google
                </MenuItem>
              )}
              {/* Two-click delete: first click arms, second deletes.
                  The menu stays open on first click (handled by stopping
                  the default onClose path). */}
              <MenuItem
                onClick={(e) => {
                  const t = sorted.find((x) => x.id === menuAnchor.taskId);
                  if (!t) return;
                  if (confirmDeleteId === t.id) {
                    deleteTask(t);
                    setConfirmDeleteId(null);
                  } else {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDeleteId(t.id);
                  }
                }}
                sx={{
                  color:
                    confirmDeleteId === menuAnchor.taskId
                      ? '#fff'
                      : '#f472b6',
                  background:
                    confirmDeleteId === menuAnchor.taskId
                      ? 'rgba(244,114,182,0.25)'
                      : 'transparent',
                  fontWeight:
                    confirmDeleteId === menuAnchor.taskId ? 700 : 500,
                  '&:hover': {
                    background:
                      confirmDeleteId === menuAnchor.taskId
                        ? 'rgba(244,114,182,0.35)'
                        : 'rgba(244,114,182,0.12)',
                  },
                }}
              >
                <DeleteOutline sx={{ fontSize: 18, mr: 1.25 }} />
                {confirmDeleteId === menuAnchor.taskId
                  ? 'Tap again to confirm'
                  : 'Delete'}
              </MenuItem>
            </Box>
          )}
      </Menu>

      <EditTaskDialog
        open={editingTask !== null}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSaved={() => {
          setEditingTask(null);
          bumpVersion();
        }}
      />
    </Box>
  );
};

export default TasksSection;
