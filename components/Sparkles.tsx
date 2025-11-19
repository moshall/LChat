import React from 'react';
import { motion } from 'framer-motion';

interface SparklesProps {
  active: boolean;
  x: number;
  y: number;
}

export const Sparkles: React.FC<SparklesProps> = ({ active, x, y }) => {
  if (!active) return null;

  // Create an array of 12 particles
  const particles = Array.from({ length: 12 });

  return (
    <div 
      className="fixed pointer-events-none z-50"
      style={{ left: x, top: y }}
    >
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-full bg-nebula-100 shadow-[0_0_10px_#fff]"
          style={{
            backgroundColor: Math.random() > 0.5 ? '#e0d4fc' : '#7652d6'
          }}
        />
      ))}
    </div>
  );
};
