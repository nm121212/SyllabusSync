import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  Box,
  Button,
  InputAdornment,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search,
  Add,
} from '@mui/icons-material';
import AddTaskModal from './AddTaskModal.tsx';

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid #E5E7EB',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onMenuClick}
            sx={{ display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <TextField
            placeholder="Search tasks, courses..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              flexGrow: 1,
              maxWidth: 400,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'grey.50',
                '&:hover': {
                  bgcolor: 'grey.100',
                },
                '&.Mui-focused': {
                  bgcolor: 'background.paper',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'grey.500' }} />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ flexGrow: 1 }} />

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