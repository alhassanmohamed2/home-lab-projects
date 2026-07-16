import React from 'react';
import { Message as MessageType } from '../types';
import Avatar from './Avatar';

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.user.role === 'user';
  const bubbleClass = isUser ? 'bg-primary text-white' : 'bg-light';
  const alignClass = isUser ? 'd-flex justify-content-end' : 'd-flex justify-content-start';

  return (
    <div className={`mb-2 ${alignClass}`}>
      {!isUser && <Avatar name={message.user.name} isUser={isUser} />}
      <div className={`card ${bubbleClass}`} style={{ maxWidth: '70%' }}>
        <div className="card-body">
          <div className="d-flex justify-content-between">
            <strong className="mb-1">{message.user.name} ({message.user.arabic_name})</strong>
            <small className="text-muted">{new Date(message.timestamp).toLocaleTimeString()}</small>
          </div>
          <p className="mb-1">{message.message}</p>
        </div>
      </div>
      {isUser && <Avatar name={message.user.name} isUser={isUser} />}
    </div>
  );
};

export default Message;
