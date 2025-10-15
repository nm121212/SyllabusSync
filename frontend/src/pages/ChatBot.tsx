import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  IconButton,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  CalendarMonth,
} from '@mui/icons-material';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  taskCreated?: {
    title: string;
    dueDate: string;
    type: string;
  };
}

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AI assistant. I can help you add tasks to your calendar. Just tell me what you need to do and when! For example: 'Add a math homework due next Friday' or 'Create a project deadline for December 15th'",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8080/api/chatbot/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputText }),
      });

      if (!response.ok) {
        throw new Error('Failed to process message');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
        taskCreated: data.taskCreated || undefined,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setError('Failed to process your message. Please try again.');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error processing your request. Please try again or rephrase your message.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        AI Assistant
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
          {/* Messages Area */}
          <Box sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            p: 2, 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2,
            backgroundColor: 'background.default',
          }}>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: 1,
                }}
              >
                {message.sender === 'bot' && (
                  <Avatar sx={{ 
                    bgcolor: 'primary.main', 
                    width: 32, 
                    height: 32,
                    mt: 0.5,
                  }}>
                    <SmartToy sx={{ fontSize: 18 }} />
                  </Avatar>
                )}
                
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'background.paper',
                    color: message.sender === 'user' ? 'white' : 'text.primary',
                    border: message.sender === 'bot' ? '1px solid rgba(255, 107, 53, 0.2)' : 'none',
                  }}
                >
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {message.text}
                  </Typography>
                  
                  {message.taskCreated && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(255, 107, 53, 0.1)', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CalendarMonth sx={{ fontSize: 16 }} />
                        Task Created:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {message.taskCreated.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip 
                            label={message.taskCreated.type} 
                            size="small" 
                            sx={{ 
                              bgcolor: 'primary.main', 
                              color: 'white',
                              fontSize: '0.7rem',
                            }} 
                          />
                          <Typography variant="caption" color="text.secondary">
                            Due: {new Date(message.taskCreated.dueDate + 'T00:00:00').toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            }).replace(/\//g, '-')}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  
                  <Typography variant="caption" sx={{ 
                    opacity: 0.7, 
                    display: 'block', 
                    mt: 1,
                    textAlign: 'right',
                  }}>
                    {formatTime(message.timestamp)}
                  </Typography>
                </Paper>

                {message.sender === 'user' && (
                  <Avatar sx={{ 
                    bgcolor: 'grey.600', 
                    width: 32, 
                    height: 32,
                    mt: 0.5,
                  }}>
                    <Person sx={{ fontSize: 18 }} />
                  </Avatar>
                )}
              </Box>
            ))}
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 32, 
                  height: 32,
                }}>
                  <SmartToy sx={{ fontSize: 18 }} />
                </Avatar>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid rgba(255, 107, 53, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Thinking...
                  </Typography>
                </Paper>
              </Box>
            )}
            
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid rgba(255, 107, 53, 0.2)',
            bgcolor: 'background.paper',
          }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Tell me what task you'd like to add and when it's due..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.default',
                    '&:hover': {
                      bgcolor: 'background.default',
                    },
                    '&.Mui-focused': {
                      bgcolor: 'background.default',
                    },
                  },
                }}
              />
              <IconButton
                onClick={handleSendMessage}
                disabled={!inputText.trim() || loading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '&:disabled': {
                    bgcolor: 'grey.600',
                    color: 'grey.400',
                  },
                }}
              >
                <Send />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ChatBot;
