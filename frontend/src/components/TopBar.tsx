import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Add,
} from '@mui/icons-material';
import AddTaskModal from './AddTaskModal.tsx';

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const [addTaskOpen, setAddTaskOpen] = useState(false);


  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid rgba(255, 107, 53, 0.2)',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onMenuClick}
            sx={{ 
              '&:hover': {
                bgcolor: 'rgba(255, 107, 53, 0.1)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddTaskOpen(true)}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            Add Task
          </Button>

        </Toolbar>
      </AppBar>

      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onSave={(task) => {
          console.log('New task:', task);
          setAddTaskOpen(false);
        }}
      />
    </>
  );
};

export default TopBar;