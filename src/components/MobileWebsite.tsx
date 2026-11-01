import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Monitor, RefreshCw, ExternalLink, ShieldAlert, Clock, Smartphone } from 'lucide-react';

const LOGO_URL = "/assets/aistudio/____-removebg-preview_d70a7f72.png";
const FALLBACK_LOGO_URL = "/images/logo.png";

const SOCIAL_LINKS = [
  { 
    label: 'Instagram', 
    sub: 'cubepixel.officase', 
    icon: '📸', 
    color: '#E1306C',
    bg: 'rgba(225, 48, 108, 0.12)',
    border: 'rgba(225, 48, 108, 0.35)',
    url: 'https://www.instagram.com/cubepixel.officase?igsh=Y3VuZ2NnOTBsMWZz' 
  },
  { 
    label: 'YouTube', 
    sub: '紡塊像素CubePixel', 
    icon: '📺', 
    color: '#FF4D4D',
    bg: 'rgba(255, 77, 77, 0.12)',
    border: 'rgba(255, 77, 77, 0.35)',
    url: 'https://www.youtube.com/@Q%E3%83%94%E3%82%AF%E3%82%BB-%E3%82%A2%E3%82%A4%E3%83%89%E3%83%AB' 
  },
  { 
    label: 'LINE 官方', 
    sub: '@546ymkbs', 
    icon: '💬', 
    color: '#06C755',
    bg: 'rgba(6, 199, 85, 0.12)',
    border: 'rgba(6, 199, 85, 0.35)',
    url: 'https://line.me/R/ti/p/@546ymkbs' 
  },
];

export interface MobileWebsiteProps {
  gameState?: string;
  setGameState?: (state: any) => void;
  activeSubPage?: string | null;
  setActiveSubPage?: (sub: string | null) => void;
}

export const MobileWebsite: React.FC<MobileWebsiteProps> = () => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#000B18] text-white flex flex-col justify-between items-center p-4 sm:p-6 overflow-hidden select-none font-rounded">
      {/* Subtle Pixel Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Cyber/Neon Ambient Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[110px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-sm flex justify-between items-center text-[10px] tracking-widest uppercase font-mono z-10 pt-1 pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-pink-400">
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping inline-block" />
          <span className="font-bold">QPKS // CUBEPIXEL</span>
        </div>
        <div className="flex items-center gap-1 text-white/50">
          <Clock className="w-3 h-3" />
          <span>{currentTime || '00:00:00'}</span>
        </div>
      </header>

      {/* Main Single Page Content */}
      <main className="w-full max-w-sm flex-1 flex flex-col items-center justify-center my-auto py-4 z-10 text-center gap-5">
        
        {/* Floating Brand Logo with Neon Ring */}
        <motion.div 
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex items-center justify-center"
        >
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-pink-400/60 shadow-[0_0_35px_rgba(244,114,182,0.4),inset_0_0_20px_rgba(244,114,182,0.2)] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 via-transparent to-amber-500/20 pointer-events-none" />
            <img 
              src={LOGO_URL} 
              alt="保持可愛 漫研社 Logo" 
              className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] relative z-10"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_LOGO_URL;
              }}
            />
          </div>

          {/* Sparkle badge */}
          <div className="absolute -bottom-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black font-mono tracking-wider px-2.5 py-0.5 rounded-full shadow-lg border border-pink-300/40 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 animate-spin" />
            <span>CUBEPIXEL</span>
          </div>
        </motion.div>

        {/* Big Update Notice */}
        <div className="space-y-2">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-mono font-bold tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.2)]">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>SYSTEM UPGRADING</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-[0.2em] uppercase font-rounded drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
            新版本更新中
          </h1>
          <p className="text-[11px] sm:text-xs text-white/70 font-mono tracking-widest leading-relaxed">
            手機版版面正在進行全新重構與升級<br />
            敬請期待更加流暢可愛的全新體驗！
          </p>
        </div>

        {/* Notice Card: Desktop Version is active */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 p-3.5 sm:p-4 text-left shadow-xl space-y-2.5 relative overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide">
                電腦版正常運行中
              </div>
              <div className="text-[9px] text-white/40 font-mono">
                DESKTOP VERSION ACTIVE
              </div>
            </div>
          </div>
          
          <p className="text-[11px] text-white/80 leading-relaxed font-rounded">
            若需瀏覽完整的<span className="text-amber-300 font-bold">成員介紹、小基地任務、出禁名單</span>與活動資訊，建議使用<span className="text-cyan-300 font-bold">電腦或筆記型電腦</span>開啟本網站。
          </p>
        </motion.div>

        {/* Social Media Link Hub */}
        <div className="w-full space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-white/40 tracking-widest uppercase px-1">
            <span>OFFICIAL CHANNELS</span>
            <span>官方社群</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: link.bg, borderColor: link.border }}
                className="flex flex-col items-center justify-center p-2 rounded-xl border transition-transform active:scale-95 group text-center cursor-pointer shadow-sm hover:brightness-125"
              >
                <span className="text-base mb-0.5">{link.icon}</span>
                <span className="text-[10px] font-bold text-white tracking-tight leading-tight">
                  {link.label}
                </span>
                <span className="text-[7.5px] text-white/50 font-mono scale-90 truncate max-w-full">
                  前往關注 ↗
                </span>
              </a>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-sm flex flex-col items-center gap-1 pt-2 pb-1 text-center font-mono z-10 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-[8.5px] text-pink-300/80 tracking-widest font-bold">
          <span>保持你的可愛</span>
          <span>•</span>
          <span>紡塊像素 CUBEPIXEL</span>
        </div>
        <div className="text-[7.5px] text-white/30 tracking-wider">
          © 2026 CUBEPIXEL ALL RIGHTS RESERVED
        </div>
      </footer>
    </div>
  );
};
