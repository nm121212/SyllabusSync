import React, { useCallback, useEffect, useRef } from 'react';
import { Box, Fab, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import {
  Close,
  DragIndicator,
  SmartToy,
} from '@mui/icons-material';
import ChatPanel, { ChatMessage } from './ChatPanel.tsx';
import { useFloatingChat } from '../contexts/FloatingChatContext.tsx';
import { useTasks } from '../contexts/TasksContext.tsx';

const DOCK_WIDTH = 400;

const defaultGreeting: ChatMessage[] = [
  {
    id: 'greet',
    text:
      "Hi - I'm Cadence. Tell me what's on your mind and I'll slot it into your day. " +
      "Try: 'Remind me to call Alex tomorrow at 6pm', 'Block 90 minutes for deep work Thursday morning', or 'What's on my plate this week?'",
    sender: 'bot',
    timestamp: new Date(),
  },
];

/**
 * Floating, draggable chat surface. Closes to a FAB; reopens from the FAB or nav.
 */
const FloatingChatDock: React.FC = () => {
  const {
    dockOpen,
    closeDock,
    openDock,
    pendingPrompt,
    position,
    setPosition,
    persistPosition,
  } = useFloatingChat();
  const { bumpVersion } = useTasks();

  const dragState = useRef<{
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
  } | null>(null);

  const clamp = useCallback((left: number, top: number) => {
    const margin = 8;
    const header = 72;
    const maxLeft = Math.max(
      margin,
      window.innerWidth - DOCK_WIDTH - margin
    );
    const maxTop = Math.max(
      margin,
      window.innerHeight - header - margin
    );
    return {
      left: Math.min(maxLeft, Math.max(margin, left)),
      top: Math.min(maxTop, Math.max(margin, top)),
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      setPosition((p) => clamp(p.left, p.top));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp, setPosition]);

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: position.left,
      origTop: position.top,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      setPosition(
        clamp(
          dragState.current.origLeft + dx,
          dragState.current.origTop + dy
        )
      );
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setPosition((p) => {
        persistPosition(p);
        return p;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <>
      {!dockOpen && (
        <Tooltip title="Open Cadence chat" placement="left">
          <Fab
            color="primary"
            aria-label="Open chat"
            onClick={() => openDock()}
            sx={{
              position: 'fixed',
              right: 24,
              bottom: 24,
              zIndex: 1350,
            }}
          >
            <SmartToy />
          </Fab>
        </Tooltip>
      )}

      {dockOpen && (
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            left: position.left,
            top: position.top,
            width: DOCK_WIDTH,
            maxWidth: 'calc(100vw - 16px)',
            zIndex: 1350,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            borderRadius: 3,
            background: 'rgba(14, 12, 26, 0.97)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.55)',
          }}
        >
          <Box
            onMouseDown={onHeaderMouseDown}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1.25,
              cursor: 'grab',
              borderBottom: '1px solid rgba(139, 92, 246, 0.22)',
              userSelect: 'none',
              background:
                'linear-gradient(180deg, rgba(124,108,255,0.12) 0%, transparent 100%)',
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <DragIndicator sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 20 }} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                Cadence
              </Typography>
              <Typography
                sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}
                noWrap
              >
                Drag header to move · schedules & reminders
              </Typography>
            </Box>
            <Tooltip title="Hide chat">
              <IconButton
                size="small"
                onClick={() => closeDock()}
                sx={{ color: 'rgba(255,255,255,0.7)' }}
                aria-label="Close chat panel"
              >
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <ChatPanel
              height={520}
              hideHeader
              initialMessages={defaultGreeting}
              pendingPrompt={pendingPrompt}
              onReply={() => bumpVersion()}
              suggestions={[
                'Plan my week',
                'Remind me to pay rent on the 1st',
                'Block focus time tomorrow 9–11am',
                "What's due this week?",
              ]}
            />
          </Box>
        </Paper>
      )}
    </>
  );
};

export default FloatingChatDock;
