import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Schedule,
  CalendarMonth,
  Edit,
  Delete,
  Sync,
  MoreVert,
} from '@mui/icons-material';

interface Task {
  id: string;
  course: string;
  title: string;
  type: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

const mockTasks: Task[] = [
  {
    id: '1',
    course: 'CS 3510',
    title: 'Homework 1: Algorithm Analysis',
    type: 'Assignment',
    dueDate: '2024-02-15',
    status: 'pending',
    priority: 'HIGH',
  },
  {
    id: '2',
    course: 'MUSI 3630',
    title: 'Midterm Exam',
    type: 'Exam',
    dueDate: '2024-03-10',
    status: 'pending',
    priority: 'URGENT',
  },
  {
    id: '3',
    course: 'HIST 2111',
    title: 'Research Paper Draft',
    type: 'Paper',
    dueDate: '2024-02-28',
    status: 'completed',
    priority: 'MEDIUM',
  },
  {
    id: '4',
    course: 'CS 3510',
    title: 'Project Proposal',
    type: 'Project',
    dueDate: '2024-04-01',
    status: 'pending',
    priority: 'MEDIUM',
  },
];

const StatsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const [tasks] = useState<Task[]>(mockTasks);

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    dueThisWeek: tasks.filter(t => {
      const dueDate = new Date(t.dueDate);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate <= weekFromNow && t.status === 'pending';
    }).length,
    synced: Math.floor(tasks.length * 0.8), // Mock synced count
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Tasks"
            value={stats.total}
            icon={<Assignment sx={{ fontSize: 32 }} />}
            color="#4F46E5"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={<CheckCircle sx={{ fontSize: 32 }} />}
            color="#22C55E"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Due This Week"
            value={stats.dueThisWeek}
            icon={<Schedule sx={{ fontSize: 32 }} />}
            color="#FACC15"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Synced to Calendar"
            value={stats.synced}
            icon={<CalendarMonth sx={{ fontSize: 32 }} />}
            color="#8B5CF6"
          />
        </Grid>
      </Grid>

      {/* Progress Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Overall Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={(stats.completed / stats.total) * 100}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary">
              {Math.round((stats.completed / stats.total) * 100)}% Complete
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Recent Tasks</Typography>
            <Button variant="outlined" size="small">
              View All
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Course</TableCell>
                  <TableCell>Task</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => {
                  const daysUntil = getDaysUntilDue(task.dueDate);
                  return (
                    <TableRow key={task.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {task.course}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{task.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={task.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={daysUntil <= 3 ? 'error.main' : daysUntil <= 7 ? 'warning.main' : 'text.secondary'}
                          >
                            {daysUntil > 0 ? `${daysUntil} days left` : daysUntil === 0 ? 'Due today' : 'Overdue'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.status}
                          size="small"
                          color={getStatusColor(task.status) as any}
                          variant={task.status === 'completed' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority) as any}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" color="primary">
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="success">
                            <Sync fontSize="small" />
                          </IconButton>
                          <IconButton size="small">
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;