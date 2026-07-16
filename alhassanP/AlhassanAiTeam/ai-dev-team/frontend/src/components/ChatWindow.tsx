import React, { useState, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { User, Message } from '../types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './Chat.css';

const currentUser: User = {
  id: 1,
  name: 'Alhassan',
  arabic_name: 'الحسن',
  role: 'user',
};

const ChatWindow: React.FC = () => {
  const [socketUrl, setSocketUrl] = useState('ws://localhost:8000/ws/1');
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  const handleSendMessage = useCallback((message: string) => {
    const messageToSend: Message = {
      user: currentUser,
      message: message,
      timestamp: new Date().toISOString(),
    };
    sendMessage(JSON.stringify(messageToSend));
  }, [sendMessage]);

  React.useEffect(() => {
    if (lastMessage !== null) {
      const receivedMessage: Message = JSON.parse(lastMessage.data);
      
      setMessageHistory(prev => {
        if (receivedMessage.message_id) {
          const existingMessageIndex = prev.findIndex(
            msg => msg.message_id === receivedMessage.message_id
          );
          if (existingMessageIndex !== -1) {
            const updatedHistory = [...prev];
            updatedHistory[existingMessageIndex] = receivedMessage;
            return updatedHistory;
          }
        }
        return [...prev, receivedMessage];
      });
    }
  }, [lastMessage]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  return (
    <div className="container mt-5">
      <div className="card">
        <div className="card-header">
          AI Dev Team Chat - Connection Status: {connectionStatus}
        </div>
        <div className="card-body" style={{ height: '500px', overflowY: 'scroll' }}>
          <MessageList messages={messageHistory} />
        </div>
        <div className="card-footer">
          <MessageInput onSendMessage={handleSendMessage} disabled={readyState !== ReadyState.OPEN} />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
