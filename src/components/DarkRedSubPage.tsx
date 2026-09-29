import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface DarkRedSubPageProps {
  onClose: () => void;
}

export const DarkRedSubPage: React.FC<DarkRedSubPageProps> = ({ onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[9999] bg-black text-white flex flex-col justify-between items-center p-6 md:p-12 select-none overflow-hidden"
    >
      {/* Full Black Loading Screen with Purple-Red Ghost Fire (鬼火) Animation */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="ghost-fire-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center select-none overflow-hidden"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer Purple-Red Glow Aura */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1.5, 1.8, 1.2, 0],
                  opacity: [0, 0.85, 0.95, 0.5, 0],
                }}
                transition={{ duration: 1.8, times: [0, 0.35, 0.65, 0.85, 1], ease: "easeInOut" }}
                className="absolute w-72 h-72 rounded-full bg-gradient-to-t from-purple-800/60 via-red-600/40 to-fuchsia-500/0 blur-3xl pointer-events-none"
              />

              {/* Core Purple-Red Ghost Flame (鬼火) SVG */}
              <motion.div
                initial={{ scale: 0, y: 40, opacity: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1.35, 0.9, 0],
                  y: [40, 0, -20, -45, -80],
                  opacity: [0, 1, 0.95, 0.6, 0],
                  rotate: [0, -5, 5, -3, 0],
                }}
                transition={{ duration: 1.8, times: [0, 0.35, 0.65, 0.85, 1], ease: "easeInOut" }}
                className="relative w-36 h-52 flex items-center justify-center filter drop-shadow-[0_0_40px_rgba(217,70,239,0.95)]"
              >
                <svg viewBox="0 0 100 140" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="ghostFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#881337" />
                      <stop offset="35%" stopColor="#9333ea" />
                      <stop offset="70%" stopColor="#e879f9" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                    <linearGradient id="innerFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#581c87" />
                      <stop offset="45%" stopColor="#f43f5e" />
                      <stop offset="90%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>

                  {/* Outer Flame Silhouette with sharp tip and flickering wisps */}
                  <motion.path
                    fill="url(#ghostFlameGrad)"
                    animate={{
                      d: [
                        "M 50 2 Q 68 35 78 60 Q 88 88 72 110 Q 55 125 50 125 Q 45 125 28 110 Q 12 88 22 60 Q 32 35 50 2 Z",
                        "M 52 0 Q 74 28 82 58 Q 92 88 70 112 Q 52 128 50 128 Q 48 128 30 112 Q 8 88 18 58 Q 26 28 48 0 Z",
                        "M 47 6 Q 62 38 75 62 Q 85 86 74 108 Q 58 122 50 122 Q 42 122 26 108 Q 15 86 25 62 Q 38 38 47 6 Z",
                        "M 50 2 Q 68 35 78 60 Q 88 88 72 110 Q 55 125 50 125 Q 45 125 28 110 Q 12 88 22 60 Q 32 35 50 2 Z",
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
                  />

                  {/* Inner Flame Core */}
                  <motion.path
                    fill="url(#innerFlameGrad)"
                    animate={{
                      d: [
                        "M 50 22 Q 62 48 68 68 Q 75 90 62 104 Q 52 112 50 112 Q 48 112 38 104 Q 25 90 32 68 Q 38 48 50 22 Z",
                        "M 50 16 Q 66 42 70 66 Q 78 88 60 106 Q 51 114 50 114 Q 49 114 40 106 Q 22 88 30 66 Q 34 42 50 16 Z",
                        "M 50 22 Q 62 48 68 68 Q 75 90 62 104 Q 52 112 50 112 Q 48 112 38 104 Q 25 90 32 68 Q 38 48 50 22 Z",
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 0.35, ease: "easeInOut" }}
                  />

                  {/* Bright Core Center */}
                  <ellipse cx="50" cy="88" rx="10" ry="18" fill="#ffffff" opacity="0.95" />
                </svg>
              </motion.div>

              {/* Floating Spirit Embers / Sparks */}
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20, x: (i - 4.5) * 10 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: [-10, -80 - (i % 4) * 20],
                    x: (i - 4.5) * 14 + (i % 2 === 0 ? 15 : -15),
                    scale: [0.4, 1.3, 0],
                  }}
                  transition={{
                    duration: 1.4,
                    delay: 0.15 + i * 0.08,
                    ease: "easeOut",
                  }}
                  className="absolute w-2.5 h-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,1)]"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Subtle Red Atmosphere */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, rgba(239, 68, 68, 0.15) 0%, transparent 70%),
            linear-gradient(to right, rgba(239, 68, 68, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(239, 68, 68, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      />

      {/* Top Bar for Closing */}
      <div className="w-full flex justify-between items-center relative z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-black/80 border border-red-900/60 hover:border-red-600 rounded-xl text-red-500/80 hover:text-red-400 font-mono text-xs tracking-widest transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 text-red-500" />
          <span>返回 // EXIT</span>
        </button>
      </div>

      {/* Main Center Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 px-4 max-w-4xl w-full gap-8">
        {/* Japanese Title in One Line */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-[0.1em] sm:tracking-[0.15em] whitespace-nowrap drop-shadow-[0_0_25px_rgba(255,255,255,0.7)] font-sans"
        >
          あなたの怨み、晴らします。
        </motion.h1>

        {/* Input Field + Retro Gray Send Button Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-lg flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder=""
            className="flex-1 bg-white text-black font-sans px-4 py-3 rounded-none outline-none border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] focus:shadow-[0_0_30px_rgba(255,255,255,0.8)] focus:border-red-600 transition-all duration-200 text-sm md:text-base font-bold"
          />

          {/* Retro Classic Gray Send Button */}
          <button
            onClick={() => {
              if (inputValue.trim()) {
                setInputValue('');
              }
            }}
            className="px-5 py-3 bg-[#c0c0c0] hover:bg-[#d4d4d4] text-black font-mono font-black text-sm md:text-base border-t-2 border-l-2 border-t-white border-l-white border-r-2 border-b-2 border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_rgba(0,0,0,0.8)] cursor-pointer select-none shrink-0"
          >
            送信
          </button>
        </motion.div>
      </div>

      {/* Footer non-clickable text */}
      <div className="w-full text-center relative z-10 pt-4 pointer-events-none select-none">
        <div className="text-xs text-white/40 font-mono tracking-[0.25em] uppercase">
          酸欠地獄通信2026
        </div>
      </div>
    </motion.div>
  );
};
