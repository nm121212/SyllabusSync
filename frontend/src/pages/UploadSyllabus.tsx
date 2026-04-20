import React, { useState } from 'react';
import { useUpload } from '../contexts/UploadContext.tsx';
import { useTasks } from '../contexts/TasksContext.tsx';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Sync,
  ArrowBack,
  FiberManualRecord,
} from '@mui/icons-material';
import PageHeader from '../components/PageHeader.tsx';
import {
  SyncRequiresSignInDialog,
  useSyncSignInPrompt,
} from '../components/SyncRequiresSignInDialog.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { API_BASE_URL } from '../config/api.ts';
import {
  apiErrorMessageFromResponse,
  catchApiError,
} from '../lib/apiErrorMessage.ts';

interface Task {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  priority: string;
  description: string;
}

interface ParseResult {
  fileName: string;
  courseName: string;
  tasksFound: number;
  tasks: Task[];
}

/**
 * Simpler capture flow - was previously a 3-step wizard with a fake
 * "confirm" step (tasks were actually saved at upload, but the UI lied
 * and showed another loading state), plus Edit/Delete icons on the
 * review table that had no handlers. Both removed. The real flow is
 * now just two honest steps:
 *   1. Drop the file - we parse + save it
 *   2. Review what we found - optionally push everything to Google
 */
const steps = ['Drop a doc', 'Review what we found'];

interface UploadSyllabusProps {
  /** When true, suppress the built-in <PageHeader> so the component can be
   *  embedded inside another section (e.g. the landing page) that supplies
   *  its own heading. */
  embedded?: boolean;
}

const priorityTone = (priority: string): 'error' | 'warning' | 'info' | 'default' => {
  switch (priority) {
    case 'URGENT':
      return 'error';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    default:
      return 'default';
  }
};

const formatDueDate = (iso: string): string => {
  if (!iso) return 'No date';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const UploadSyllabus: React.FC<UploadSyllabusProps> = ({ embedded = false }) => {
  const { session } = useAuth();
  const { guardOr, promptOpen, setPromptOpen, authLoading } =
    useSyncSignInPrompt();
  const { startUpload, updateUploadProgress, updateUploadStatus } = useUpload();
  const { bumpVersion } = useTasks();

  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleUpload = async () => {
    if (!file) {
      setError('Please pick a file first.');
      return;
    }
    setLoading(true);
    setError(null);

    const uploadId = startUpload(file.name);
    const formData = new FormData();
    formData.append('file', file);
    if (courseName) formData.append('courseName', courseName);

    try {
      updateUploadProgress(uploadId, 25);
      const response = await fetch(`${API_BASE_URL}/syllabus/upload`, {
        method: 'POST',
        body: formData,
      });
      updateUploadProgress(uploadId, 75);
      updateUploadStatus(uploadId, 'parsing');
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        updateUploadProgress(uploadId, 100);
        updateUploadStatus(uploadId, 'completed', data);
        setParseResult(data);
        setActiveStep(1);
        /* Tasks are persisted by the upload endpoint - let other panels
           (TasksSection, TaskCalendar, hero stats) refetch. */
        bumpVersion();
      } else {
        const msg = apiErrorMessageFromResponse(
          response,
          'We couldn\u2019t read that file. Try another.',
          data?.error
        );
        updateUploadStatus(uploadId, 'error', null, msg);
        setError(msg);
      }
    } catch (err) {
      const msg = catchApiError(
        err,
        session,
        'Network error - check that the backend is running, then try again.'
      );
      updateUploadStatus(uploadId, 'error', null, msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToCalendar = async () => {
    await guardOr(async () => {
      setSyncLoading(true);
      setSyncError(null);
      setSyncSuccess(false);
      try {
        const tasksResponse = await fetch(`${API_BASE_URL}/syllabus/tasks`);
        const tasks = await tasksResponse.json().catch(() => null);

        if (!tasksResponse.ok) {
          throw new Error(
            apiErrorMessageFromResponse(
              tasksResponse,
              'Could not load tasks.',
              (tasks as { error?: string } | null)?.error
            )
          );
        }

        if (!Array.isArray(tasks) || tasks.length === 0) {
          setSyncError('No tasks to sync yet.');
          return;
        }

        // Group by course so we use the existing per-course sync endpoint.
        const tasksByCourse = tasks.reduce((acc: any, task: any) => {
          const key = task.courseName || 'Personal';
          (acc[key] ||= []).push(task);
          return acc;
        }, {});

        for (const [bucket, bucketTasks] of Object.entries(tasksByCourse)) {
          const syncResponse = await fetch(
            `${API_BASE_URL}/syllabus/generate-calendar`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tasks: bucketTasks, courseName: bucket }),
            }
          );
          if (!syncResponse.ok) {
            const errorData = await syncResponse.json().catch(() => ({}));
            throw new Error(
              apiErrorMessageFromResponse(
                syncResponse,
                'Sync failed. Connect Google Calendar in Settings after you sign in.',
                (errorData as { error?: string })?.error
              )
            );
          }
        }
        setSyncSuccess(true);
        bumpVersion();
      } catch (err) {
        setSyncError(
          catchApiError(err, session, 'Could not sync to Google Calendar.')
        );
      } finally {
        setSyncLoading(false);
      }
    });
  };

  const resetFlow = () => {
    setActiveStep(0);
    setFile(null);
    setCourseName('');
    setParseResult(null);
    setSyncError(null);
    setSyncSuccess(false);
    setError(null);
  };

  return (
    <>
      <SyncRequiresSignInDialog
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
      />
      <Box>
      {!embedded && (
        <PageHeader
          eyebrow="Capture"
          title="Turn any document into a plan"
          subtitle="Drop a PDF, DOCX, or TXT - meeting notes, a brief, an itinerary, a syllabus. Cadence extracts every date and action item so you can review and drop it straight onto your day."
        />
      )}

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Step 1 &middot; Drop your document
              </Typography>

              <TextField
                fullWidth
                label="Bucket (optional)"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                sx={{ mb: 3 }}
                helperText="Group these tasks - e.g. Work, Personal, Trip to Tokyo, CS 3510."
                placeholder="Work · Q2 kickoff"
              />

              <Box
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                sx={{
                  border: '2px dashed',
                  borderColor: dragOver
                    ? 'primary.main'
                    : 'rgba(139, 92, 246, 0.35)',
                  borderRadius: 3,
                  p: 5,
                  textAlign: 'center',
                  background: dragOver
                    ? 'rgba(124, 108, 255, 0.12)'
                    : 'rgba(10, 9, 20, 0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  mb: 3,
                }}
              >
                <input
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                  id="file-upload"
                  type="file"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileSelect(selectedFile);
                  }}
                />
                <label
                  htmlFor="file-upload"
                  style={{ cursor: 'pointer', width: '100%', display: 'block' }}
                >
                  <CloudUpload
                    sx={{ fontSize: 48, color: 'primary.light', mb: 2 }}
                  />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {file
                      ? file.name
                      : 'Drop your document here or click to browse'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--ss-text-mute)' }}>
                    PDF, DOCX or TXT &middot; up to 10&nbsp;MB
                  </Typography>
                </label>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!file || loading}
                  startIcon={
                    loading ? (
                      <CircularProgress size={18} sx={{ color: '#fff' }} />
                    ) : (
                      <CloudUpload />
                    )
                  }
                  size="large"
                >
                  {loading ? 'Reading your doc\u2026' : 'Extract tasks'}
                </Button>
                {file && !loading && (
                  <Button
                    variant="text"
                    onClick={() => setFile(null)}
                    sx={{ color: 'var(--ss-text-mute)' }}
                  >
                    Remove file
                  </Button>
                )}
              </Box>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          )}

          {activeStep === 1 && parseResult && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Step 2 &middot; Review what we found
              </Typography>

              <Alert
                severity="success"
                icon={<CheckCircle fontSize="inherit" />}
                sx={{ mb: 3 }}
              >
                Pulled {parseResult.tasksFound} task
                {parseResult.tasksFound === 1 ? '' : 's'} out of{' '}
                <strong>{parseResult.fileName}</strong>. They&rsquo;re already
                on your plate - tweak or delete individual ones from the Tasks
                section.
              </Alert>

              {syncError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {syncError}
                </Alert>
              )}
              {syncSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Everything pushed to Google Calendar.
                </Alert>
              )}

              <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Task</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Due</TableCell>
                      <TableCell>Priority</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parseResult.tasks.map((task, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {task.title}
                          </Typography>
                          {task.description && (
                            <Typography
                              variant="caption"
                              sx={{ color: 'var(--ss-text-mute)' }}
                            >
                              {task.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={task.type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.75,
                            }}
                          >
                            {task.dueDate && (
                              <FiberManualRecord
                                aria-hidden
                                sx={{ fontSize: 8, color: 'primary.light' }}
                              />
                            )}
                            {formatDueDate(task.dueDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={task.priority}
                            size="small"
                            color={priorityTone(task.priority)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={resetFlow}
                >
                  Drop another doc
                </Button>
                <Button
                  variant="contained"
                  startIcon={
                    syncLoading ? (
                      <CircularProgress size={18} sx={{ color: '#fff' }} />
                    ) : (
                      <Sync />
                    )
                  }
                  onClick={handleSyncToCalendar}
                  disabled={syncLoading || authLoading}
                >
                  {syncLoading
                    ? 'Syncing\u2026'
                    : syncSuccess
                      ? 'Synced \u2714'
                      : 'Push all to Google Calendar'}
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
      </Box>
    </>
  );
};

export default UploadSyllabus;
