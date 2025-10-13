import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Task {
  title: string;
  course: string;
  type: string;
  dueDate: Date | null;
  description: string;
  priority: string;
}

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

const taskTypes = [
  'Assignment',
  'Project',
  'Exam',
  'Quiz',
  'Lab',
  'Presentation',
  'Paper',
  'Discussion',
  'Other',
];

const priorities = [
  { value: 'LOW', label: 'Low', color: '#22C55E' },
  { value: 'MEDIUM', label: 'Medium', color: '#FACC15' },
  { value: 'HIGH', label: 'High', color: '#F97316' },
  { value: 'URGENT', label: 'Urgent', color: '#EF4444' },
];

const AddTaskModal: React.FC<AddTaskModalProps> = ({ open, onClose, onSave }) => {
  const [task, setTask] = useState<Task>({
    title: '',
    course: '',
    type: 'Assignment',
    dueDate: null,
    description: '',
    priority: 'MEDIUM',
  });

  const handleSave = () => {
    if (task.title && task.course && task.dueDate) {
      onSave(task);
      setTask({
        title: '',
        course: '',
        type: 'Assignment',
        dueDate: null,
        description: '',
        priority: 'MEDIUM',
      });
    }
  };

  const handleClose = () => {
    onClose();
    setTask({
      title: '',
      course: '',
      type: 'Assignment',
      dueDate: null,
      description: '',
      priority: 'MEDIUM',
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Task
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Task Title"
              fullWidth
              required
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
            />

            <TextField
              label="Course"
              fullWidth
              required
              value={task.course}
              onChange={(e) => setTask({ ...task, course: e.target.value })}
              placeholder="e.g., CS 3510, MATH 2550"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={task.type}
                  label="Type"
                  onChange={(e) => setTask({ ...task, type: e.target.value })}
                >
                  {taskTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={task.priority}
                  label="Priority"
                  onChange={(e) => setTask({ ...task, priority: e.target.value })}
                >
                  {priorities.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: priority.color,
                          }}
                        />
                        {priority.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <DateTimePicker
              label="Due Date & Time"
              value={task.dueDate}
              onChange={(newValue) => setTask({ ...task, dueDate: newValue })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                },
              }}
            />

            <TextField
              label="Description (Optional)"
              fullWidth
              multiline
              rows={3}
              value={task.description}
              onChange={(e) => setTask({ ...task, description: e.target.value })}
              placeholder="Additional notes about this task..."
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!task.title || !task.course || !task.dueDate}
          >
            Add Task
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default AddTaskModal;