import React from 'react';
import { Message as MessageType } from '../types';
import Message from './Message';

interface MessageListProps {
  messages: MessageType[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div>
      {messages.map((msg, idx) => (
        <Message key={idx} message={msg} />
      ))}
    </div>
  );
};

export default MessageList;
