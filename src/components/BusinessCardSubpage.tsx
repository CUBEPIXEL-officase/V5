import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, RotateCw, Sparkles } from 'lucide-react';

interface BusinessCardSubpageProps {
  onClose: () => void;
}

export const BusinessCardSubpage: React.FC<BusinessCardSubpageProps> = ({ onClose }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [holographicSheen, setHolographicSheen] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20; // -10 to +10 deg
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20; // -10 to +10 deg
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <motion.div
      key="business_card_subpage"
      initial={{ opacity: 0, y: 150 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 150 }}
      transition={{ type: "spring", damping: 25, stiffness: 180 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-between p-3.5 sm:p-4 bg-[#0a0f1d]/98 backdrop-blur-xl w-full h-full text-white overflow-hidden select-none"
    >
      {/* Top Back/Navigation Bar */}
      <div className="w-full flex justify-between items-center text-[9px] tracking-widest text-white/40 uppercase pt-1.5 pb-2.5 z-40 font-mono border-b border-teal-500/30">
        <button 
          onClick={onClose}
          className="flex items-center gap-1 text-teal-300 hover:text-white font-bold tracking-widest cursor-pointer active:scale-95 transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>返回</span>
        </button>
        <div className="flex items-center gap-1.5 text-teal-300 font-bold">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping inline-block" />
          <span>OFFICIAL NAMECARD // 翻面名片</span>
        </div>
      </div>

      {/* Main Interactive Container */}
      <div className="flex-1 w-full overflow-y-auto py-4 px-1 my-auto flex flex-col items-center justify-center gap-4 custom-scrollbar">
        
        {/* Top Status & Controls */}
        <div className="flex items-center justify-between w-full max-w-sm px-1">
          <div className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-teal-950/70 border border-teal-500/40 rounded-full text-[10px] font-mono text-teal-300 font-bold shadow-[0_0_10px_rgba(45,212,191,0.2)]">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>{isFlipped ? '背面：店長 海璃名片' : '正面：酸欠像素居酒屋'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setHolographicSheen(!holographicSheen)}
              className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold border transition-all ${
                holographicSheen 
                  ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.4)]' 
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
              title="切換炫彩光澤特效"
            >
              ✨ 光澤
            </button>
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-[0_0_12px_rgba(45,212,191,0.6)] active:scale-95 transition-all cursor-pointer"
            >
              <RotateCw className="w-3 h-3 animate-spin-slow" />
              <span>翻面</span>
            </button>
          </div>
        </div>

        {/* 3D Flippable Card Stage */}
        <div 
          className="w-full max-w-sm aspect-[1.75/1] min-h-[200px] sm:min-h-[220px] [perspective:1200px] cursor-pointer group"
          onClick={() => setIsFlipped(!isFlipped)}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
        >
          <motion.div
            animate={{
              rotateY: isFlipped ? 180 : 0,
              rotateX: isHovered ? mousePos.y : 0,
              rotateZ: isHovered ? mousePos.x * 0.15 : 0,
            }}
            transition={{
              rotateY: { duration: 0.6, ease: [0.23, 1, 0.32, 1] },
              rotateX: { duration: 0.15, ease: "easeOut" },
              rotateZ: { duration: 0.15, ease: "easeOut" },
            }}
            className="w-full h-full relative [transform-style:preserve-3d] rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.6),0_0_25px_rgba(124,58,237,0.35)]"
          >
            {/* ===================== FRONT SIDE (正面：酸欠像素居酒屋 圖片) ===================== */}
            <div 
              className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden [backface-visibility:hidden] border-2 border-purple-400/50 bg-[#6D28D9] select-none ${
                holographicSheen ? 'after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/15 after:to-transparent after:pointer-events-none' : ''
              }`}
            >
              <img 
                src="https://lh3.googleusercontent.com/d/12lcqlRzNsb3gzpVqL_47n7hwJYtSkOGD" 
                alt="酸欠像素偶像居酒屋 正面" 
                className="w-full h-full object-cover sm:object-contain bg-[#6D28D9]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.src.includes('export=view')) {
                    target.src = "https://drive.google.com/uc?export=view&id=12lcqlRzNsb3gzpVqL_47n7hwJYtSkOGD";
                  }
                }}
              />
            </div>

            {/* ===================== BACK SIDE (背面：店長 海璃名片 圖片) ===================== */}
            <div 
              className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden [transform:rotateY(180deg)] [backface-visibility:hidden] border-2 border-purple-400/50 bg-[#6D28D9] select-none ${
                holographicSheen ? 'after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/15 after:to-transparent after:pointer-events-none' : ''
              }`}
            >
              <img 
                src="https://lh3.googleusercontent.com/d/1k0V1nzaB_xwrxxvFtL0msJCUHk1dPyWD" 
                alt="店長 海璃名片 背面" 
                className="w-full h-full object-cover sm:object-contain bg-[#6D28D9]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.src.includes('export=view')) {
                    target.src = "https://drive.google.com/uc?export=view&id=1k0V1nzaB_xwrxxvFtL0msJCUHk1dPyWD";
                  }
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Interactive Flip Hint */}
        <div className="text-[10px] text-teal-300/80 font-mono flex items-center gap-1.5 animate-pulse pt-1">
          <RotateCw className="w-3 h-3" />
          <span>點擊名片或按鈕即可 3D 翻轉正面 / 背面</span>
        </div>

      </div>

      {/* Bottom Button to exit */}
      <div className="w-full flex flex-col gap-2 max-w-sm px-2 mt-1">
        <button 
          onClick={onClose}
          className="w-full py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-200 cursor-pointer pointer-events-auto border border-white/10"
        >
          關閉名片
        </button>
      </div>
    </motion.div>
  );
};
