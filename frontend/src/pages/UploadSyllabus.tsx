import React, { useState } from 'react';
import { useUpload } from '../contexts/UploadContext.tsx';
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
  IconButton,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Edit,
  Delete,
  CalendarMonth,
  Sync,
} from '@mui/icons-material';

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

const steps = ['Upload Syllabus', 'Review Tasks', 'Confirm & Save'];

const UploadSyllabus: React.FC = () => {
  const { startUpload, updateUploadProgress, updateUploadStatus } = useUpload();
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
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    // Start tracking upload in global context
    const uploadId = startUpload(file.name);

    const formData = new FormData();
    formData.append('file', file);
    if (courseName) {
      formData.append('courseName', courseName);
    }

    try {
      // Simulate upload progress
      updateUploadProgress(uploadId, 25);
      
      const response = await fetch('/api/syllabus/upload', {
        method: 'POST',
        body: formData,
      });

      updateUploadProgress(uploadId, 75);
      updateUploadStatus(uploadId, 'parsing');

      const data = await response.json();

      if (response.ok) {
        updateUploadProgress(uploadId, 100);
        updateUploadStatus(uploadId, 'completed', data);
        setParseResult(data);
        setActiveStep(1);
      } else {
        updateUploadStatus(uploadId, 'error', null, data.error || 'Upload failed');
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      updateUploadStatus(uploadId, 'error', null, 'Network error occurred');
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Mock save operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setActiveStep(2);
    } catch (err) {
      setError('Failed to save tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToCalendar = async () => {
    setSyncLoading(true);
    setSyncError(null);
    setSyncSuccess(false);
    
    try {
      const API_BASE_URL = 'http://localhost:8080/api';
      
      // Get all tasks
      const tasksResponse = await fetch(`${API_BASE_URL}/syllabus/tasks`);
      const tasks = await tasksResponse.json();
      
      if (tasks.length === 0) {
        setSyncError('No tasks found to sync');
        return;
      }
      
      // Group tasks by course
      const tasksByCourse = tasks.reduce((acc: any, task: any) => {
        const courseName = task.courseName || 'Unknown Course';
        if (!acc[courseName]) {
          acc[courseName] = [];
        }
        acc[courseName].push(task);
        return acc;
      }, {});
      
      // Sync each course's tasks
      for (const [courseName, courseTasks] of Object.entries(tasksByCourse)) {
        const syncResponse = await fetch(`${API_BASE_URL}/syllabus/generate-calendar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tasks: courseTasks,
            courseName: courseName,
          }),
        });
        
        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          throw new (Error as any)((errorData as any).error || 'Failed to sync tasks');
        }
      }
      
      setSyncSuccess(true);
      setSyncError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? (err as Error).message : 'Failed to sync tasks');
    } finally {
      setSyncLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Upload Syllabus
      </Typography>

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
                Step 1: Upload Your Syllabus
              </Typography>

              <TextField
                fullWidth
                label="Course Name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                sx={{ mb: 3 }}
                placeholder="e.g., CS 3510 - Design and Analysis of Algorithms"
              />

              <Box
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                sx={{
                  border: '2px dashed',
                  borderColor: dragOver ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: dragOver ? 'primary.light' : 'grey.50',
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
                <label htmlFor="file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                  <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {file ? file.name : 'Drop your syllabus here or click to browse'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supports PDF, DOCX, and TXT files (max 10MB)
                  </Typography>
                </label>
              </Box>

              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!file || loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
                size="large"
              >
                {loading ? 'Processing...' : 'Upload & Parse Syllabus'}
              </Button>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          )}

          {activeStep === 1 && parseResult && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Step 2: Review Extracted Tasks
              </Typography>

              <Alert severity="success" sx={{ mb: 3 }}>
                Successfully extracted {parseResult.tasksFound} tasks from {parseResult.fileName}
              </Alert>

              <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Task</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parseResult.tasks.map((task, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {task.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {task.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={task.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            }).replace(/\//g, '-') : 'No date'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={task.priority}
                            size="small"
                            color={getPriorityColor(task.priority) as any}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="primary">
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirm}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                >
                  {loading ? 'Saving...' : 'Confirm & Save Tasks'}
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                Tasks Saved Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {parseResult?.tasksFound} tasks have been added to your dashboard.
              </Typography>
              
              {syncError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {syncError}
                </Alert>
              )}
              
              {syncSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Tasks synced to Google Calendar successfully!
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setActiveStep(0);
                    setFile(null);
                    setCourseName('');
                    setParseResult(null);
                    setSyncError(null);
                    setSyncSuccess(false);
                  }}
                >
                  Upload Another Syllabus
                </Button>
                <Button
                  variant="contained"
                  startIcon={syncLoading ? <CircularProgress size={20} /> : <Sync />}
                  onClick={handleSyncToCalendar}
                  disabled={syncLoading}
                >
                  {syncLoading ? 'Syncing...' : 'Sync to Calendar'}
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default UploadSyllabus;