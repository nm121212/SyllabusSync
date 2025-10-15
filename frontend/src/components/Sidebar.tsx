import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CloudUpload,
  CalendarMonth,
  MenuOpen,
} from '@mui/icons-material';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Upload Syllabus', icon: <CloudUpload />, path: '/upload' },
  { text: 'Calendar', icon: <CalendarMonth />, path: '/calendar' },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const drawerWidth = 280;

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(255, 107, 53, 0.2)',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            📚
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            SyllabusSync
          </Typography>
        </Box>
        <IconButton onClick={onToggle} size="small">
          <MenuOpen />
        </IconButton>
      </Box>

      <Divider />

      <List sx={{ px: 1, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: '#000000',
                  color: '#FF6B35',
                  borderLeft: '3px solid',
                  borderLeftColor: '#FF6B35',
                  '&:hover': {
                    bgcolor: '#000000',
                  },
                },
                '&:hover': {
                  bgcolor: 'rgba(255, 107, 53, 0.1)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path ? '#FF6B35' : 'grey.600',
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: location.pathname === item.path ? 600 : 400,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

    </Drawer>
  );
};

export default Sidebar;