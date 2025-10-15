import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  ExpandMore,
  ExpandLess,
  Close,
} from '@mui/icons-material';
import { useUpload } from '../contexts/UploadContext.tsx';

const UploadStatusBar: React.FC = () => {
  const { uploads, clearUpload, clearAllUploads } = useUpload();
  const [expanded, setExpanded] = React.useState(false);

  if (uploads.length === 0) return null;

  const activeUploads = uploads.filter(upload => 
    upload.status === 'uploading' || upload.status === 'parsing'
  );
  const completedUploads = uploads.filter(upload => 
    upload.status === 'completed' || upload.status === 'error'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return 'primary';
      case 'parsing': return 'warning';
      case 'completed': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle fontSize="small" />;
      case 'error': return <Error fontSize="small" />;
      default: return null;
    }
  };

  const formatDuration = (startTime: number) => {
    const duration = Date.now() - startTime;
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        zIndex: 1000,
        maxHeight: expanded ? '300px' : '60px',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease-in-out',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Upload Status ({uploads.length})
          </Typography>
          {activeUploads.length > 0 && (
            <Chip
              label={`${activeUploads.length} active`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {completedUploads.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                clearAllUploads();
              }}
              title="Clear all completed uploads"
            >
              <Close fontSize="small" />
            </IconButton>
          )}
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </Box>
      </Box>

      {/* Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 1, maxHeight: '240px', overflow: 'auto' }}>
          {uploads.map((upload) => (
            <Box
              key={upload.id}
              sx={{
                mb: 1,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.default',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                  {upload.fileName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={upload.status}
                    size="small"
                    color={getStatusColor(upload.status) as any}
                    icon={getStatusIcon(upload.status)}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDuration(upload.startTime)}
                  </Typography>
                  {(upload.status === 'completed' || upload.status === 'error') && (
                    <IconButton
                      size="small"
                      onClick={() => clearUpload(upload.id)}
                      title="Remove from list"
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {(upload.status === 'uploading' || upload.status === 'parsing') && (
                <LinearProgress
                  variant="determinate"
                  value={upload.progress}
                  sx={{ mb: 1 }}
                />
              )}

              {upload.status === 'error' && upload.error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {upload.error}
                </Alert>
              )}

              {upload.status === 'completed' && upload.result && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  {upload.result.tasksSaved} tasks created and synced to calendar!
                </Alert>
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default UploadStatusBar;
