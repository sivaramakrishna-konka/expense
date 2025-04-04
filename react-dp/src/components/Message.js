import React from 'react';
import './Message.css';

const Message = ({ message, isSuccess }) => {
  if (!message) return null;

  return (
    <div id="message" className={`message ${isSuccess ? 'success' : 'error'}`}>
      {message}
    </div>
  );
};

export default Message;