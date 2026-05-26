import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator() {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -5 },
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#202C33', borderRadius: '12px', width: 'fit-content', borderBottomLeftRadius: '4px', marginBottom: '15px' }}>
      <span style={{ fontSize: '13px', color: '#8696A0' }}>SkillBytes is typing</span>
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        style={{ display: 'flex', gap: '3px', marginTop: '4px' }}
      >
        <motion.div
          variants={dotVariants}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          style={{ width: '5px', height: '5px', backgroundColor: '#8696A0', borderRadius: '50%' }}
        />
        <motion.div
          variants={dotVariants}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          style={{ width: '5px', height: '5px', backgroundColor: '#8696A0', borderRadius: '50%' }}
        />
        <motion.div
          variants={dotVariants}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          style={{ width: '5px', height: '5px', backgroundColor: '#8696A0', borderRadius: '50%' }}
        />
      </motion.div>
    </div>
  );
}
