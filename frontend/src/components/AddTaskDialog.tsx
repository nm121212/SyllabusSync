import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { Close, AutoAwesome } from '@mui/icons-material';
import { useTasks } from '../contexts/TasksContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { API_BASE_URL } from '../config/api.ts';
import {
  apiErrorMessageFromResponse,
  catchApiError,
} from '../lib/apiErrorMessage.ts';

/**
 * Manual task creation. Posts a single-item batch to the existing
 * /api/syllabus/tasks/batch endpoint (so we don't need a new endpoint). On
 * success we bump the shared tasks version so every panel refetches.
 */

/** Friendly labels mapped to the backend TaskType enum values. */
const TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Task', value: 'OTHER' },
  { label: 'Meeting', value: 'PRESENTATION' },
  { label: 'Deadline', value: 'ASSIGNMENT' },
  { label: 'Exam / test', value: 'EXAM' },
  { label: 'Quiz', value: 'QUIZ' },
  { label: 'Project', value: 'PROJECT' },
  { label: 'Lab', value: 'LAB' },
  { label: 'Paper', value: 'PAPER' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const addDaysIso = (delta: number) => {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Quick-date shortcuts - reduces the most common friction (picking a
 *  nearby date) from ~3 clicks in the native date picker to 1. */
const QUICK_DATES: { label: string; iso: () => string }[] = [
  { label: 'Today', iso: () => addDaysIso(0) },
  { label: 'Tomorrow', iso: () => addDaysIso(1) },
  { label: 'In 3 days', iso: () => addDaysIso(3) },
  { label: 'Next week', iso: () => addDaysIso(7) },
];

const AddTaskDialog: React.FC = () => {
  const { session } = useAuth();
  const { isAddTaskOpen, closeAddTask, bumpVersion } = useTasks();

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(todayIso());
  const [type, setType] = useState('OTHER');
  const [priority, setPriority] = useState('MEDIUM');
  const [bucket, setBucket] = useState('Personal');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Existing bucket names, pulled once when the dialog opens, so the
   *  user can pick "Work" / "Personal" / a class etc. from an
   *  autocomplete instead of re-typing (and risking typos that split
   *  buckets like "Work" vs "work "). */
  const [knownBuckets, setKnownBuckets] = useState<string[]>([]);

  useEffect(() => {
    if (isAddTaskOpen) {
      setTitle('');
      setDueDate(todayIso());
      setType('OTHER');
      setPriority('MEDIUM');
      setBucket('Personal');
      setDescription('');
      setError(null);
      setSubmitting(false);

      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/syllabus/tasks`);
          if (!res.ok) return;
          const data = await res.json();
          if (!Array.isArray(data)) return;
          const buckets = Array.from(
            new Set(
              data
                .map((t: any) => (t?.courseName || '').trim())
                .filter((s: string) => !!s)
            )
          ).sort((a, b) => a.localeCompare(b));
          setKnownBuckets(buckets);
        } catch {
          /* empty is fine - falls back to free-text input */
        }
      })();
    }
  }, [isAddTaskOpen]);

  const bucketOptions = useMemo(() => {
    const defaults = ['Personal', 'Work', 'Errands', 'Health'];
    return Array.from(new Set([...knownBuckets, ...defaults]));
  }, [knownBuckets]);

  const dueDateIsToday = dueDate === todayIso();

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Give the task a title.');
      return;
    }
    if (!dueDate) {
      setError('Pick a due date.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/syllabus/tasks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: bucket.trim() || 'Personal',
          tasks: [
            {
              title: title.trim(),
              description: description.trim(),
              type,
              priority,
              dueDate,
            },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          apiErrorMessageFromResponse(
            res,
            'Could not save the task.',
            body?.error
          )
        );
      }
      bumpVersion();
      closeAddTask();
    } catch (e: unknown) {
      setError(catchApiError(e, session, 'Something went wrong.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isAddTaskOpen}
      onClose={submitting ? undefined : closeAddTask}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background:
            'linear-gradient(180deg, rgba(26,23,51,0.96) 0%, rgba(15,13,26,0.96) 100%)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pb: 1.25,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg,#7c6cff 0%,#3b82f6 100%)',
            boxShadow: '0 10px 24px -12px rgba(124,108,255,0.8)',
          }}
        >
          <AutoAwesome sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
            New task
          </Typography>
          <Typography
            sx={{
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.04em',
            }}
          >
            Adds to your plate and - once you're connected - to Google Calendar.
          </Typography>
        </Box>
        <IconButton
          onClick={closeAddTask}
          disabled={submitting}
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: 'rgba(139,92,246,0.18)' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              fullWidth
              label="What's on your plate?"
              placeholder="e.g. Call Alex, Prep sprint review, Dentist appointment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </Grid>
          <Grid item xs={12}>
            {/* Quick-date chips - most tasks land today / tomorrow /
                this week, and the native date picker takes 3+ clicks
                for those. One tap here = done. */}
            <Box
              sx={{
                display: 'flex',
                gap: 0.75,
                flexWrap: 'wrap',
                mb: 1.25,
              }}
              role="group"
              aria-label="Quick-pick due date"
            >
              {QUICK_DATES.map((q) => {
                const active = dueDate === q.iso();
                return (
                  <Box
                    key={q.label}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDueDate(q.iso())}
                    onKeyDown={(e) =>
                      e.key === 'Enter' || e.key === ' '
                        ? (e.preventDefault(), setDueDate(q.iso()))
                        : undefined
                    }
                    sx={{
                      px: 1.5,
                      py: 0.6,
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      color: active ? '#fff' : 'var(--ss-text-soft)',
                      background: active
                        ? 'linear-gradient(135deg,#7c6cff 0%,#6366f1 100%)'
                        : 'rgba(124,108,255,0.08)',
                      border: active
                        ? '1px solid transparent'
                        : '1px solid rgba(139,92,246,0.25)',
                      transition: 'all 160ms ease',
                      '&:hover': {
                        background: active
                          ? 'linear-gradient(135deg,#7c6cff 0%,#6366f1 100%)'
                          : 'rgba(124,108,255,0.2)',
                        color: '#fff',
                      },
                    }}
                  >
                    {q.label}
                  </Box>
                );
              })}
            </Box>
            <TextField
              fullWidth
              type="date"
              label={dueDateIsToday ? 'Due date (today)' : 'Due date'}
              InputLabelProps={{ shrink: true }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={submitting}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
            >
              {TYPE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={submitting}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              freeSolo
              options={bucketOptions}
              value={bucket}
              onChange={(_, v) => setBucket(v ?? '')}
              onInputChange={(_, v) => setBucket(v)}
              disabled={submitting}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Bucket"
                  placeholder="Personal"
                  helperText="Group tasks by bucket - pick an existing one or type a new name."
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              label="Notes"
              placeholder="Optional details - location, attendees, links…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          onClick={closeAddTask}
          disabled={submitting}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          variant="contained"
          color="primary"
          startIcon={
            submitting ? (
              <CircularProgress size={14} sx={{ color: '#fff' }} />
            ) : undefined
          }
        >
          {submitting ? 'Saving…' : 'Add to my day'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTaskDialog;
