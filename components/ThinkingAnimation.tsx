import React, { useState, useEffect } from 'react';

interface ThinkingAnimationProps {
  messages?: string[];
  interval?: number; // in milliseconds
  className?: string;
}

const defaultMessages = [
  "Co-Pilot is thinking...",
  "Analyzing request...",
  "Consulting knowledge base...",
  "Generating response...",
  "Crafting a solution...",
  "Working on it..."
];

const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({ 
  messages = defaultMessages, 
  interval = 2000,
  className
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, interval);

    return () => clearInterval(timer);
  }, [messages, interval]);

  return (
    <div className={className}>
      {messages[currentMessageIndex]}
    </div>
  );
};

export default ThinkingAnimation;