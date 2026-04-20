import React from 'react';
import { Box } from '@mui/material';
import PageHeader from '../components/PageHeader.tsx';
import ChatPanel from '../components/ChatPanel.tsx';

const ChatBot: React.FC = () => (
  <Box>
    <PageHeader
      eyebrow="AI assistant"
      title="Plan your day"
      subtitle="Your chatbot for scheduling, reminders, and focus blocks. Talk to it like a human - it handles the calendar."
    />
    <ChatPanel height="70vh" />
  </Box>
);

export default ChatBot;
