import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Fade,
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
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default',
    }}>
      {/* Fixed Header */}
      <Box sx={{
        p: 3,
        borderBottom: '1px solid rgba(255, 107, 53, 0.1)',
        bgcolor: 'background.paper',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ 
            bgcolor: 'primary.main', 
            width: 40, 
            height: 40,
            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
          }}>
            <SmartToy sx={{ fontSize: 20 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
              AI Assistant
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your personal academic planning companion
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Fade in={!!error}>
          <Alert 
            severity="error" 
            sx={{ 
              m: 2, 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(244, 67, 54, 0.2)',
            }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Messages Area */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column',
        gap: 3,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'rgba(255, 107, 53, 0.3)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          bgcolor: 'rgba(255, 107, 53, 0.5)',
        },
      }}>
        {messages.map((message, index) => (
          <Fade in={true} timeout={300} key={message.id}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: 2,
                maxWidth: '100%',
              }}
            >
              {message.sender === 'bot' && (
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 36, 
                  height: 36,
                  mt: 0.5,
                  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
                }}>
                  <SmartToy sx={{ fontSize: 18 }} />
                </Avatar>
              )}
              
              <Box
                sx={{
                  maxWidth: { xs: '85%', sm: '70%', md: '60%' },
                  minWidth: '120px',
                }}
              >
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: message.sender === 'user' 
                      ? 'primary.main' 
                      : 'background.paper',
                    color: message.sender === 'user' ? 'white' : 'text.primary',
                    border: message.sender === 'bot' 
                      ? '1px solid rgba(255, 107, 53, 0.15)' 
                      : 'none',
                    boxShadow: message.sender === 'user'
                      ? '0 4px 12px rgba(255, 107, 53, 0.3)'
                      : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    position: 'relative',
                    '&::before': message.sender === 'bot' ? {
                      content: '""',
                      position: 'absolute',
                      left: '-8px',
                      top: '12px',
                      width: 0,
                      height: 0,
                      borderTop: '8px solid transparent',
                      borderBottom: '8px solid transparent',
                      borderRight: '8px solid rgba(255, 107, 53, 0.15)',
                    } : message.sender === 'user' ? {
                      content: '""',
                      position: 'absolute',
                      right: '-8px',
                      top: '12px',
                      width: 0,
                      height: 0,
                      borderTop: '8px solid transparent',
                      borderBottom: '8px solid transparent',
                      borderLeft: '8px solid #FF6B35',
                    } : {},
                  }}
                >
                  <Typography variant="body1" sx={{ 
                    lineHeight: 1.6,
                    mb: message.taskCreated ? 2 : 0,
                  }}>
                    {message.text}
                  </Typography>
                  
                  {message.taskCreated && (
                    <Box sx={{ 
                      mt: 2, 
                      p: 2, 
                      bgcolor: message.sender === 'user' 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'rgba(255, 107, 53, 0.08)', 
                      borderRadius: 2,
                      border: message.sender === 'user'
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : '1px solid rgba(255, 107, 53, 0.2)',
                    }}>
                      <Typography variant="caption" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 1.5,
                        color: message.sender === 'user' ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary',
                        fontWeight: 500,
                      }}>
                        <CalendarMonth sx={{ fontSize: 16 }} />
                        Task Created & Synced to Calendar
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600,
                          color: message.sender === 'user' ? 'white' : 'text.primary',
                        }}>
                          {message.taskCreated.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Chip 
                            label={message.taskCreated.type} 
                            size="small" 
                            sx={{ 
                              bgcolor: message.sender === 'user' 
                                ? 'rgba(255, 255, 255, 0.2)' 
                                : 'primary.main', 
                              color: message.sender === 'user' ? 'white' : 'white',
                              fontSize: '0.7rem',
                              fontWeight: 500,
                            }} 
                          />
                          <Typography variant="caption" sx={{
                            color: message.sender === 'user' ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary',
                          }}>
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
                    opacity: 0.6, 
                    display: 'block', 
                    mt: 1.5,
                    textAlign: 'right',
                    fontSize: '0.75rem',
                  }}>
                    {formatTime(message.timestamp)}
                  </Typography>
                </Box>
              </Box>

              {message.sender === 'user' && (
                <Avatar sx={{ 
                  bgcolor: 'grey.600', 
                  width: 36, 
                  height: 36,
                  mt: 0.5,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                }}>
                  <Person sx={{ fontSize: 18 }} />
                </Avatar>
              )}
            </Box>
          </Fade>
        ))}
        
        {loading && (
          <Fade in={loading} timeout={300}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                bgcolor: 'primary.main', 
                width: 36, 
                height: 36,
                boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
              }}>
                <SmartToy sx={{ fontSize: 18 }} />
              </Avatar>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid rgba(255, 107, 53, 0.15)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <CircularProgress size={20} sx={{ color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Thinking...
                </Typography>
              </Box>
            </Box>
          </Fade>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Fixed Input Area */}
      <Box sx={{ 
        p: 3, 
        borderTop: '1px solid rgba(255, 107, 53, 0.1)',
        bgcolor: 'background.paper',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        bottom: 0,
        zIndex: 1,
      }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'flex-end',
          maxWidth: '800px',
          mx: 'auto',
        }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ask me anything about your tasks, planning, or just chat..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'background.default',
                border: '1px solid rgba(255, 107, 53, 0.2)',
                '&:hover': {
                  border: '1px solid rgba(255, 107, 53, 0.4)',
                },
                '&.Mui-focused': {
                  border: '1px solid rgba(255, 107, 53, 0.6)',
                  boxShadow: '0 0 0 2px rgba(255, 107, 53, 0.1)',
                },
                '& fieldset': {
                  border: 'none',
                },
              },
              '& .MuiInputBase-input': {
                py: 1.5,
                px: 2,
              },
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!inputText.trim() || loading}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              width: 48,
              height: 48,
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
              '&:hover': {
                bgcolor: 'primary.dark',
                boxShadow: '0 6px 16px rgba(255, 107, 53, 0.4)',
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                bgcolor: 'grey.600',
                color: 'grey.400',
                boxShadow: 'none',
                transform: 'none',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <Send sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatBot;
