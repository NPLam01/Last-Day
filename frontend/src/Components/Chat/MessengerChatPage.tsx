import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, 
  Typography, 
  Input, 
  Button, 
  List, 
  Avatar, 
  Space,
  Divider,
  Badge,
  Row,
  Col,
  Tooltip
} from 'antd';
import { 
  SendOutlined, 
  UserOutlined,
  MessageOutlined 
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import socketService from '../../services/socketService';
import { chatService, Message, ChatUser } from '../../services/chatService';
import './MessengerChatPage.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const MessengerChatPage: React.FC = () => {
  const { user, token } = useAuth();
  const [message, setMessage] = useState('');
  const [messagesByConversation, setMessagesByConversation] = useState<{ [key: string]: Message[] }>({});
  const [activeUsers, setActiveUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [typing, setTyping] = useState<{ [key: string]: boolean }>({});
  const typingTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const loadMessages = useCallback(async (userId: string) => {
    try {
      const messages = await chatService.getMessages(userId);
      console.log('API getMessages for', userId, 'returned', messages);
      
      // Filter out any invalid messages and sort by timestamp
      const validMessages = messages.filter(msg => 
        msg && msg.content && (typeof msg.content === 'string')
      );
      
      const sortedMessages = validMessages.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setMessagesByConversation(prev => {
        const newState = {
          ...prev,
          [userId]: sortedMessages
        };
        console.log('setMessagesByConversation after loadMessages:', newState);
        return newState;
      });
      scrollToBottom();
      // Mark messages as read
      chatService.markAsRead(userId)
        .catch(error => console.error('Error marking messages as read:', error));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);  const loadActiveUsers = useCallback(async () => {
    try {
      const users = await chatService.getActiveUsers();
      // Filter out current user
      const filteredUsers = users.filter(u => u._id !== user?._id);
      setActiveUsers(filteredUsers);
      
      // Auto-select first user if no user is selected and there are users available
      if (!selectedUser && filteredUsers.length > 0) {
        setSelectedUser(filteredUsers[0]);
      }
    } catch (error) {
      console.error('Error loading active users:', error);
    }
  }, [user?._id, selectedUser]);useEffect(() => {
    if (token && !socketConnected) {
      console.log('Connecting socket with token');
      const socket = socketService.connect(`Bearer ${token}`);
      
      if (socket) {        socket.on('connect', () => {
          console.log('Socket connected successfully');
          setSocketConnected(true);
          // Reload messages when reconnected
          if (selectedUser) {
            loadMessages(selectedUser._id);
          }
          loadActiveUsers();
        });

        socket.on('reconnect', () => {
          console.log('Socket reconnected successfully');
          setSocketConnected(true);
          // Reload messages when reconnected
          if (selectedUser) {
            loadMessages(selectedUser._id);
          }
          loadActiveUsers();
        });

        socket.on('connect_error', (error: Error) => {
          console.error('Socket connection error:', error);
          setSocketConnected(false);
        });

        socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          // Only set disconnected for permanent disconnections
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            setSocketConnected(false);
          }
          // For temporary disconnections, keep the connected state and let reconnect handle it
        });
      }

      loadActiveUsers();

      return () => {
        console.log('Cleaning up socket connection');
        if (socketService.isConnected()) {
          socketService.disconnect();
        }
        setSocketConnected(false);
      };
    }
  }, [token, loadActiveUsers, selectedUser, loadMessages]);
  useEffect(() => {
    if (socketConnected) {
      const messageHandler = (newMessage: Message) => {
        console.log('messageHandler called:', newMessage, 'Current user:', user, 'Selected:', selectedUser);

        // Extract IDs correctly regardless of the format
        const senderId = typeof newMessage.sender === 'string' 
          ? newMessage.sender 
          : newMessage.sender._id;
        
        const receiverId = typeof newMessage.receiver === 'string'
          ? newMessage.receiver 
          : newMessage.receiver._id;
        
        const userId = String(user?._id);

        // Only update conversation if we're either the sender or receiver
        if (senderId === userId || receiverId === userId) {
          // Get the ID of the other person in the conversation
          const conversationId = senderId === userId ? receiverId : senderId;          setMessagesByConversation(prev => {
            const conversationMessages = prev[conversationId] || [];
            
            // Check if this is confirming an optimistic message
            const optimisticIndex = conversationMessages.findIndex(msg => 
              msg._id.startsWith('temp_') && 
              msg.content === newMessage.content && 
              senderId === userId &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 5000 // Within 5 seconds
            );

            if (optimisticIndex !== -1) {
              // Replace optimistic message with real message
              const updatedMessages = [...conversationMessages];
              updatedMessages[optimisticIndex] = {
                ...newMessage,
                sender: senderId,
                receiver: receiverId,
                _id: String(newMessage._id)
              };
              return {
                ...prev,
                [conversationId]: updatedMessages.sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                )
              };
            }

            // Check if message already exists by ID
            const exists = conversationMessages.some(msg => 
              String(msg._id) === String(newMessage._id)
            );
            
            if (!exists) {
              // Normalize IDs to string for consistency
              const normalizedMessage = {
                ...newMessage,
                sender: senderId,
                receiver: receiverId,
                _id: String(newMessage._id)
              };

              // Sort messages by timestamp
              const updatedMessages = [...conversationMessages, normalizedMessage]
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              
              return {
                ...prev,
                [conversationId]: updatedMessages
              };
            }
            return prev;
          });
        }

        // Only scroll if the message belongs to the currently selected conversation
        if (selectedUser && (
          senderId === String(selectedUser._id) || 
          receiverId === String(selectedUser._id)
        )) {
          scrollToBottom();
        }
      };      const userOnlineHandler = (userId: string) => {
        console.log('User came online:', userId);
        setActiveUsers(prev => 
          prev.map(user => 
            user._id === userId ? { ...user, isOnline: true } : user
          )
        );
      };

      const userOfflineHandler = (userId: string) => {
        console.log('User went offline:', userId);
        setActiveUsers(prev => 
          prev.map(user => 
            user._id === userId ? { ...user, isOnline: false } : user
          )
        );
      };

      const typingHandler = ({ userId, isTyping }: { userId: string, isTyping: boolean }) => {
        setTyping(prev => ({ ...prev, [userId]: isTyping }));
      };      socketService.onMessage(messageHandler);
      socketService.onUserOnline(userOnlineHandler);
      socketService.onUserOffline(userOfflineHandler);
      socketService.onTyping(typingHandler);

      // Handle message confirmation for sender
      const messageConfirmedHandler = (confirmedMessage: Message) => {
        console.log('messageConfirmedHandler called:', confirmedMessage, 'Current user:', user, 'Selected:', selectedUser);
        
        // Extract IDs correctly
        const senderId = typeof confirmedMessage.sender === 'string' 
          ? confirmedMessage.sender 
          : confirmedMessage.sender._id;
        
        const receiverId = typeof confirmedMessage.receiver === 'string'
          ? confirmedMessage.receiver 
          : confirmedMessage.receiver._id;
        
        const userId = String(user?._id);
        
        // Only handle confirmation for messages sent by current user
        if (senderId === userId) {
          const conversationId = receiverId;
          
          setMessagesByConversation(prev => {
            const conversationMessages = prev[conversationId] || [];
            
            // Find and replace temporary message or add new one if not exists
            const messageExists = conversationMessages.some(msg => 
              String(msg._id) === String(confirmedMessage._id)
            );
            
            if (!messageExists) {
              // If message doesn't exist, add it
              const normalizedMessage = {
                ...confirmedMessage,
                sender: senderId,
                receiver: receiverId,
                _id: String(confirmedMessage._id)
              };
              
              // Remove any temporary messages with same content
              const filteredMessages = conversationMessages.filter(msg => 
                !(msg.content === confirmedMessage.content && 
                  msg._id.toString().length > 10) // temp IDs are typically longer
              );
              
              const updatedMessages = [...filteredMessages, normalizedMessage]
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              
              return {
                ...prev,
                [conversationId]: updatedMessages
              };
            }
            
            return prev;
          });
          
          // Scroll to bottom if this is the selected conversation
          if (selectedUser && String(selectedUser._id) === conversationId) {
            scrollToBottom();
          }
        }
      };

      // Listen for messageConfirmed event
      if (socketService.getSocket()) {
        socketService.getSocket()?.on('messageConfirmed', messageConfirmedHandler);
      }

      return () => {
        socketService.off('newMessage');
        socketService.off('messageConfirmed');
        socketService.off('userOnline');
        socketService.off('userOffline');
        socketService.off('userTyping');
        if (socketService.getSocket()) {
          socketService.getSocket()?.off('messageConfirmed', messageConfirmedHandler);
        }
      };
    }
  }, [socketConnected, user, selectedUser]);
  useEffect(() => {
    if (selectedUser) {
      // Fetch messages when selecting user
      const fetchMessages = async () => {
        setLoading(true);
        try {
          const messages = await chatService.getMessages(selectedUser._id);
          setMessagesByConversation(prev => ({
            ...prev,
            [selectedUser._id]: messages
          }));
        } catch (error) {
          console.error('Error fetching messages:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchMessages();
    }
  }, [selectedUser?._id]);

  // Add periodic refresh
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (selectedUser) {
        const messages = await chatService.getMessages(selectedUser._id);
        setMessagesByConversation(prev => ({
          ...prev,
          [selectedUser._id]: messages
        }));
      }
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(refreshInterval);
  }, [selectedUser]);

  // Add function to refresh users list
  const refreshUsersList = async () => {
    try {
      const users = await chatService.getActiveUsers();
      setActiveUsers(users);
    } catch (error) {
      console.error('Error refreshing users list:', error);
    }
  };

  // Refresh users list periodically
  useEffect(() => {
    refreshUsersList();
    const interval = setInterval(refreshUsersList, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle page visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking socket connection...');
        
        // Reconnect socket if needed
        if (!socketService.isConnected() && token) {
          console.log('Reconnecting socket after tab switch...');
          const socket = socketService.connect(`Bearer ${token}`);
          if (socket) {
            socket.on('connect', () => {
              console.log('Reconnected after tab switch');
              setSocketConnected(true);
              // Reload data when reconnected
              loadActiveUsers();
              if (selectedUser) {
                loadMessages(selectedUser._id);
              }
            });
          }
        } else if (socketService.isConnected()) {
          // Socket is connected, just refresh data
          console.log('Socket still connected, refreshing data...');
          loadActiveUsers();
          if (selectedUser) {
            loadMessages(selectedUser._id);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, selectedUser, loadActiveUsers, loadMessages]);const handleSendMessage = async () => {
    if (!message.trim() || !selectedUser || !user?._id) return;

    // Check if socket is connected
    if (!socketService.isConnected()) {
      console.log('Socket not connected, attempting to reconnect...');
      const socket = socketService.connect(`Bearer ${token}`);
      if (socket) {
        socket.on('connect', () => {
          console.log('Reconnected, sending message...');
          setSocketConnected(true);
          socketService.sendMessage(selectedUser._id, message.trim());
        });
      }
      return;
    }

    const content = message.trim();
    setMessage('');

    // Create optimistic message with proper typing
    const optimisticMessage: Message = {
      _id: `temp_${Date.now()}_${Math.random()}`,
      content,
      sender: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar
      },
      receiver: {
        _id: selectedUser._id,
        username: selectedUser.username,
        avatar: selectedUser.avatar
      },
      messageType: 'text',
      timestamp: new Date(),
      isRead: false,
      status: 'sending'
    };

    // Add optimistic message to UI immediately
    setMessagesByConversation(prev => ({
      ...prev,
      [selectedUser._id]: [...(prev[selectedUser._id] || []), optimisticMessage]
    }));

    // Scroll to bottom immediately
    setTimeout(() => scrollToBottom(), 10);

    try {
      // Clear typing status
      if (typingTimeoutRef.current[selectedUser._id]) {
        clearTimeout(typingTimeoutRef.current[selectedUser._id]);
      }
      socketService.sendTypingStatus(selectedUser._id, false);

      // Send through socket
      socketService.sendMessage(selectedUser._id, content);

      // Set a timeout to mark message as failed if not confirmed
      setTimeout(() => {
        setMessagesByConversation(prev => {
          const conversationMessages = prev[selectedUser._id] || [];
          const messageIndex = conversationMessages.findIndex(msg => msg._id === optimisticMessage._id);

          if (messageIndex !== -1 && conversationMessages[messageIndex]._id.startsWith('temp_')) {
            const updatedMessages = [...conversationMessages];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              status: 'error'
            };
            return {
              ...prev,
              [selectedUser._id]: updatedMessages
            };
          }
          return prev;
        });
      }, 10000);
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark the optimistic message as failed
      setMessagesByConversation(prev => {
        const conversationMessages = prev[selectedUser._id] || [];
        const messageIndex = conversationMessages.findIndex(msg => msg._id === optimisticMessage._id);

        if (messageIndex !== -1) {
          const updatedMessages = [...conversationMessages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status: 'error'
          };
          return {
            ...prev,
            [selectedUser._id]: updatedMessages
          };
        }
        return prev;
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    if (selectedUser) {
      // Clear existing timeout
      if (typingTimeoutRef.current[selectedUser._id]) {
        clearTimeout(typingTimeoutRef.current[selectedUser._id]);
      }

      // Send typing status
      socketService.sendTypingStatus(selectedUser._id, true);

      // Set new timeout
      typingTimeoutRef.current[selectedUser._id] = setTimeout(() => {
        socketService.sendTypingStatus(selectedUser._id, false);
      }, 2000);
    }
  };
  const formatTime = (date: Date | string) => {
    try {
      const messageDate = new Date(date);
      
      // Check if date is valid
      if (isNaN(messageDate.getTime())) {
        return 'Invalid date';
      }

      const now = new Date();
      const diffMs = now.getTime() - messageDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) {
        return 'Vừa xong';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} phút trước`;
      } else if (diffHours < 24) {
        return `${diffHours} giờ trước`;
      } else if (diffDays < 7) {
        return `${diffDays} ngày trước`;
      } else {
        return messageDate.toLocaleDateString('vi-VN');
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid date';
    }
  };

  const formatFullDateTime = (date: Date | string) => {
    try {
      const messageDate = new Date(date);
      
      // Check if date is valid
      if (isNaN(messageDate.getTime())) {
        return 'Invalid date';
      }

      return messageDate.toLocaleString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting full date time:', error);
      return 'Invalid date';
    }  };
  const currentMessages = selectedUser ? messagesByConversation[selectedUser._id] || [] : [];
  // Filter users based on search query
  const filteredUsers = activeUsers.filter(chatUser => 
    chatUser.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="messenger-chat-page">
      <Row gutter={16} style={{ height: '100%' }}>        <Col xs={24} sm={8} md={6} lg={6} xl={5}>
          <Card 
            title={
              <Input
                placeholder="Search users by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
                allowClear
              />
            }
            className="users-card"
            bodyStyle={{ padding: 0 }}
          >            <List
              dataSource={filteredUsers}
              renderItem={(chatUser) => (
                <List.Item
                  className={`user-item ${selectedUser?._id === chatUser._id ? 'selected' : ''}`}
                  onClick={() => setSelectedUser(chatUser)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge 
                        dot 
                        status={chatUser.isOnline ? 'success' : 'default'}
                        offset={[-2, 32]}
                      >
                        <Avatar 
                          icon={<UserOutlined />} 
                          src={chatUser.avatar}
                          size="large"
                        />
                      </Badge>
                    }
                    title={<Text strong>{chatUser.username}</Text>}
                    description={
                      typing[chatUser._id] ? (
                        <Text type="success">Typing...</Text>
                      ) : chatUser.isOnline ? (
                        <Text type="success">Online</Text>
                      ) : chatUser.lastSeen ? (
                        <Text type="secondary">
                          Last seen at {formatTime(chatUser.lastSeen)}
                        </Text>
                      ) : null
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} sm={16} md={18} lg={18} xl={19}>
          {selectedUser ? (
            <Card
              className="chat-card"              title={
                <Space>
                  <Badge 
                    dot 
                    status={selectedUser.isOnline ? 'success' : 'default'}
                    offset={[-2, 32]}
                  >
                    <Avatar 
                      icon={<UserOutlined />} 
                      src={selectedUser.avatar}
                      size="large"
                    />
                  </Badge>
                  <span>{selectedUser.username}</span>
                  {typing[selectedUser._id] && (
                    <Text type="secondary" italic>typing...</Text>
                  )}
                  {!socketConnected && (
                    <Text type="warning" style={{ fontSize: '12px', marginLeft: '8px' }}>
                      ⚠️ Reconnecting...
                    </Text>
                  )}
                </Space>
              }
              style={{
                height: 'calc(100vh - 200px)'
              }}
            >
              <div className="messages-container">
                <List
                  dataSource={currentMessages}                  renderItem={(msg) => {
                    const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender._id;
                    const isOwnMessage = String(user?._id) === String(senderId);
                    const isOptimistic = msg._id.startsWith('temp_');
                    const messageStatus = (msg as any).status;
                    
                    return (                      <List.Item
                        key={msg._id}
                        className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'}`}
                      >
                        <div className="message-content">
                          <Tooltip 
                            title={formatFullDateTime(msg.timestamp)}
                            placement={isOwnMessage ? 'left' : 'right'}
                          >
                            <div 
                              className="message-bubble"
                              style={{
                                backgroundColor: isOwnMessage ? '#1890ff' : '#e4e6eb',
                                color: isOwnMessage ? '#ffffff' : '#000000',
                                opacity: isOptimistic ? 0.7 : 1, // Show optimistic messages as slightly transparent
                                transition: 'opacity 0.2s ease' // Smooth transition when message is confirmed
                              }}
                            >                              <Text style={{ color: 'inherit' }}>{msg.content}</Text>
                              {isOptimistic && messageStatus === 'sending' && (
                                <Text style={{ 
                                  color: 'inherit', 
                                  fontSize: '10px', 
                                  marginLeft: '8px',
                                  opacity: 0.8 
                                }}>
                                  ⏳
                                </Text>
                              )}
                              {isOptimistic && messageStatus === 'failed' && (
                                <Text 
                                  style={{ 
                                    color: 'inherit', 
                                    fontSize: '10px', 
                                    marginLeft: '8px',
                                    opacity: 0.8,
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    // Retry sending the message
                                    socketService.sendMessage(selectedUser._id, msg.content);
                                    // Update status back to sending
                                    setMessagesByConversation(prev => {
                                      const conversationMessages = prev[selectedUser._id] || [];
                                      const messageIndex = conversationMessages.findIndex(m => m._id === msg._id);
                                      if (messageIndex !== -1) {
                                        const updatedMessages = [...conversationMessages];
                                        updatedMessages[messageIndex] = {
                                          ...updatedMessages[messageIndex],
                                          status: 'sending'
                                        } as Message & { status?: string };
                                        return {
                                          ...prev,
                                          [selectedUser._id]: updatedMessages
                                        };
                                      }
                                      return prev;
                                    });
                                  }}
                                  title="Click to retry"
                                >
                                  ❌ Retry
                                </Text>
                              )}
                            </div>
                          </Tooltip>
                          <Text type="secondary" className="message-time">
                            {formatTime(new Date(msg.timestamp))}
                          </Text>
                        </div>
                      </List.Item>
                    );
                  }}
                />
                <div ref={messagesEndRef} />
              </div>

              <Divider style={{ margin: 0 }} />

              <div className="message-input-container">
                <Space.Compact style={{ width: '100%' }}>
                  <TextArea
                    value={message}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    style={{ resize: 'none' }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                  >
                    Send
                  </Button>
                </Space.Compact>
              </div>
            </Card>
          ) : (
            <Card className="no-chat-selected">
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <MessageOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <Title level={4} type="secondary">Select a conversation to start chatting</Title>
                <Text type="secondary">
                  Choose from your existing conversations on the left or start a new one.
                </Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default MessengerChatPage;