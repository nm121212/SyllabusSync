import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import { CloudUpload, Calendar, Assignment } from '@mui/icons-material';

interface Task {
  title: string;
  dueDate: string;
  type: string;
  priority: string;
  description: string;
}

interface ParseResult {
  message: string;
  fileName: string;
  courseName: string;
  tasksFound: number;
  tasks: Task[];
}

const SyllabusUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (courseName) {
      formData.append('courseName', courseName);
    }

    try {
      const response = await fetch('/api/syllabus/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setParseResult(data);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCalendar = async () => {
    if (!parseResult) return;

    setLoading(true);
    try {
      const response = await fetch('/api/syllabus/generate-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: parseResult.tasks,
          courseName: parseResult.courseName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCalendarUrl(data.calendarUrl);
      } else {
        setError(data.error || 'Calendar generation failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
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
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Assignment color="primary" />
        Syllabus Upload & Calendar Generator
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Step 1: Upload Your Syllabus
          </Typography>
          
          <TextField
            fullWidth
            label="Course Name (optional)"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <input
              accept=".pdf,.docx,.txt"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                sx={{ mr: 2 }}
              >
                Choose File
              </Button>
            </label>
            {file && (
              <Typography variant="body2" component="span">
                Selected: {file.name}
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
          >
            {loading ? 'Processing...' : 'Upload & Parse Syllabus'}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {parseResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Step 2: Review Extracted Tasks
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              Found {parseResult.tasksFound} tasks in {parseResult.fileName}
            </Alert>

            <List>
              {parseResult.tasks.map((task, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{task.title}</Typography>
                          <Chip 
                            label={task.type} 
                            size="small" 
                            variant="outlined" 
                          />
                          <Chip 
                            label={task.priority} 
                            size="small" 
                            color={getPriorityColor(task.priority) as any}
                          />
                        </Box>
                      }
                      secondary={`Due: ${new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }).replace(/\//g, '-')} | ${task.description}`}
                    />
                  </ListItem>
                  {index < parseResult.tasks.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <Button
              variant="contained"
              color="secondary"
              onClick={handleGenerateCalendar}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Calendar />}
              sx={{ mt: 2 }}
            >
              {loading ? 'Generating...' : 'Generate Calendar'}
            </Button>
          </CardContent>
        </Card>
      )}

      {calendarUrl && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Step 3: Your Calendar is Ready!
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              Calendar generated successfully with {parseResult?.tasksFound} events!
            </Alert>

            <Button
              variant="contained"
              href={calendarUrl}
              target="_blank"
              startIcon={<Calendar />}
            >
              Open Calendar
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SyllabusUpload;