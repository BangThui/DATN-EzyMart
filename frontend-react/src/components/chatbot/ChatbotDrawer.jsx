import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Spin, Typography } from 'antd';
import { MessageOutlined, SendOutlined, AliwangwangOutlined, UserOutlined, CloseOutlined } from '@ant-design/icons';
import axiosClient from '../../services/axiosClient';
import './ChatbotDrawer.css';

const { Text } = Typography;

const ChatbotDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Chào bạn! Mình là Trợ lý ảo của EzyMart. Mình có thể giúp gì cho bạn hôm nay?', sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const getTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return 'Sáng';
    if (hour >= 11 && hour < 14) return 'Trưa';
    return 'Chiều-Tối';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = {
      id: Date.now(),
      text: inputValue.trim(),
      sender: 'user'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await axiosClient.post('/chatbot/chat', {
        message: userMsg.text,
        timeSlot: getTimeSlot()
      });

      const botMsg = {
        id: Date.now() + 1,
        text: response.reply,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Chatbot API Error:', error);
      const errorMsg = {
        id: Date.now() + 1,
        text: 'Hệ thống Trợ lý ảo đang bận một chút, bạn vui lòng thử lại sau nhé!',
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <div className="chatbot-floating-btn" onClick={() => setIsOpen(true)}>
          <MessageOutlined className="chatbot-icon" />
        </div>
      )}

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-window-header">
            <div className="chatbot-header-left">
              <AliwangwangOutlined className="chatbot-header-icon" />
              <span className="chatbot-header-title">Trợ lý ảo EzyMart</span>
            </div>
            <Button 
              type="text" 
              icon={<CloseOutlined style={{ color: '#fff' }} />} 
              onClick={() => setIsOpen(false)} 
              className="chatbot-close-btn"
            />
          </div>

          <div className="chatbot-messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-message-wrapper ${msg.sender}`}>
                {msg.sender === 'bot' && <div className="chatbot-avatar bot"><AliwangwangOutlined /></div>}
                <div className="chatbot-message-bubble">
                  <Text>{msg.text}</Text>
                </div>
                {msg.sender === 'user' && <div className="chatbot-avatar user"><UserOutlined /></div>}
              </div>
            ))}
            
            {loading && (
              <div className="chatbot-message-wrapper bot">
                <div className="chatbot-avatar bot"><AliwangwangOutlined /></div>
                <div className="chatbot-message-bubble loading">
                  <Spin size="small" />
                  <span style={{ marginLeft: 8 }}>Đang gõ...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-container">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Hỏi mình bất cứ điều gì..."
              className="chatbot-input"
              suffix={
                <Button 
                  type="primary" 
                  shape="circle" 
                  icon={<SendOutlined />} 
                  onClick={handleSend} 
                  disabled={!inputValue.trim() || loading}
                />
              }
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotDrawer;
