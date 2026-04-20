import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext.tsx';
import { API_BASE_URL } from '../config/api.ts';
import {
  apiErrorMessageFromResponse,
  catchApiError,
} from '../lib/apiErrorMessage.ts';

export type EditableTask = {
  id: number;
  title: string;
  description?: string;
  dueDate: string;
  type?: string;
  priority?: string;
};

const EDIT_TYPE_OPTIONS = [
  { label: 'Task', value: 'OTHER' },
  { label: 'Meeting', value: 'PRESENTATION' },
  { label: 'Deadline', value: 'ASSIGNMENT' },
  { label: 'Exam / test', value: 'EXAM' },
  { label: 'Quiz', value: 'QUIZ' },
  { label: 'Project', value: 'PROJECT' },
  { label: 'Lab', value: 'LAB' },
  { label: 'Paper', value: 'PAPER' },
];

const EDIT_PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
];

type FormState = {
  title: string;
  description: string;
  dueDate: string;
  type: string;
  priority: string;
};

export interface EditTaskDialogProps {
  open: boolean;
  task: EditableTask | null;
  onClose: () => void;
  /** Called after a successful PUT so parents can refetch / bump version. */
  onSaved: () => void;
}

const EditTaskDialog: React.FC<EditTaskDialogProps> = ({
  open,
  task,
  onClose,
  onSaved,
}) => {
  const { session } = useAuth();
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    dueDate: '',
    type: 'OTHER',
    priority: 'MEDIUM',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && task) {
      setForm({
        title: task.title ?? '',
        description: task.description ?? '',
        dueDate: task.dueDate ?? '',
        type: task.type ?? 'OTHER',
        priority: task.priority ?? 'MEDIUM',
      });
      setError(null);
    }
  }, [open, task]);

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const save = async () => {
    if (!task) return;
    if (!form.title.trim()) {
      setError('Task title cannot be empty.');
      return;
    }
    if (!form.dueDate) {
      setError('Due date is required.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/syllabus/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          dueDate: form.dueDate,
          type: form.type,
          priority: form.priority,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          apiErrorMessageFromResponse(
            res,
            'Could not save task edits.',
            body?.error
          )
        );
      }
      onSaved();
    } catch (e) {
      setError(catchApiError(e, session, 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit task</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0.1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              disabled={busy}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              label="Notes"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              disabled={busy}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Due date"
              InputLabelProps={{ shrink: true }}
              value={form.dueDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, dueDate: e.target.value }))
              }
              disabled={busy}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Priority"
              value={form.priority}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, priority: e.target.value }))
              }
              disabled={busy}
            >
              {EDIT_PRIORITY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Type"
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, type: e.target.value }))
              }
              disabled={busy}
            >
              {EDIT_TYPE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={save} variant="contained" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTaskDialog;
