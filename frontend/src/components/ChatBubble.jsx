import React from 'react';
import { motion } from 'framer-motion';
import styles from '../styles/ChatBubble.module.css';

const ChatBubble = ({ message, isUser }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`${styles.bubbleWrapper} ${isUser ? styles.userWrapper : styles.botWrapper}`}
    >
      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
        <p>{message}</p>
        <div className={styles.timestamp}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
