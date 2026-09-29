import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skull, AlertTriangle, ShieldAlert, UserPlus, Trash2, ShieldCheck, Flame, Terminal } from 'lucide-react';
const bannedPoster = "https://lh3.googleusercontent.com/d/130eYoP73HTibdQ76Ztnp0lou66jo_gAf";
const bannedPoster2 = "https://lh3.googleusercontent.com/d/1I5Y6bWvuyfmAn5mispwM-oBZFbz2d6nR";

export interface BannedPerson {
  id: string;
  name: string;
  avatar: string;
  reason: string;
  duration: string;
  dangerLevel: 'low' | 'medium' | 'high' | 'apocalyptic';
  date: string;
}

interface BannedListPageProps {
  onBack: () => void;
}

export const BannedListPage: React.FC<BannedListPageProps> = ({ onBack }) => {
  const [bannedList, setBannedList] = useState<BannedPerson[]>([]);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('永久出禁');
  const [dangerLevel, setDangerLevel] = useState<BannedPerson['dangerLevel']>('medium');
  const [showAddForm, setShowAddForm] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('qpixel_banned_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BannedPerson[];
        // Filter out any default placeholder/test members (IDs: ban-1, ban-2, ban-3, ban-4)
        const filtered = parsed.filter(item => !['ban-1', 'ban-2', 'ban-3', 'ban-4'].includes(item.id));
        setBannedList(filtered);
        if (parsed.length !== filtered.length) {
          localStorage.setItem('qpixel_banned_list', JSON.stringify(filtered));
        }
      } catch (e) {
        setBannedList([]);
      }
    } else {
      setBannedList([]);
      localStorage.setItem('qpixel_banned_list', JSON.stringify([]));
    }

    // Generate fun terminal logs
    const initialLogs = [
      'SECURE PROTOCOL v4.16 ACTIVE...',
      'FIREWALL STATUS: SECURE (PORT: 3000)',
      'SCANNING PIXEL DIMENSIONAL MATRIX...',
      'NO RECENT ANOMALIES DETECTED.',
      'READY FOR COMMANDS.'
    ];
    setTerminalLogs(initialLogs);
  }, []);

  // Load custom Flaming Ornate Gem Arrow cursor for the Banned List Page only
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.cursors-4u.net/cursors/animated/flaming-pointer-ddb87d2f-96.css';
    link.id = 'banned-list-cursor-style';
    document.head.appendChild(link);

    // Disable the global custom cursor when in the Banned List Page
    document.documentElement.classList.add('banned-list-active');

    return () => {
      const existing = document.getElementById('banned-list-cursor-style');
      if (existing) {
        existing.remove();
      }
      // Re-enable global custom cursor when leaving Banned List Page
      document.documentElement.classList.remove('banned-list-active');
    };
  }, []);

  // Update terminal logs when people are banned/pardonned
  const logToTerminal = (msg: string) => {
    setTerminalLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 15)
    ]);
  };

  const saveList = (list: BannedPerson[]) => {
    setBannedList(list);
    localStorage.setItem('qpixel_banned_list', JSON.stringify(list));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !reason.trim()) return;

    const avatars = ['🚫', '👾', '🤡', '👺', '💩', '🧟', '👻', '💣', '🔥'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    const newBan: BannedPerson = {
      id: `ban-${Date.now()}`,
      name: name.trim(),
      avatar: randomAvatar,
      reason: reason.trim(),
      duration: duration || '永久出禁',
      dangerLevel,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [newBan, ...bannedList];
    saveList(updated);
    logToTerminal(`THREAT DETECTED: Added ${name} to blacklist.`);

    // Reset Form
    setName('');
    setReason('');
    setDuration('永久出禁');
    setDangerLevel('medium');
    setShowAddForm(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`確定要將 ${name} 赦免（從出禁名單中移除）嗎？`)) {
      const updated = bannedList.filter(item => item.id !== id);
      saveList(updated);
      logToTerminal(`PARDON ISSUED: Restored privileges for ${name}.`);
    }
  };

  const getDangerBadge = (level: BannedPerson['dangerLevel']) => {
    switch (level) {
      case 'low':
        return {
          bg: 'bg-green-950/40 border-green-500/50 text-green-400',
          label: '低危險度 // LOW',
          icon: <ShieldCheck className="w-3.5 h-3.5" />
        };
      case 'medium':
        return {
          bg: 'bg-yellow-950/40 border-yellow-500/50 text-yellow-400',
          label: '中度警告 // WARNING',
          icon: <AlertTriangle className="w-3.5 h-3.5" />
        };
      case 'high':
        return {
          bg: 'bg-orange-950/40 border-orange-500/50 text-orange-400',
          label: '高度危害 // HIGH RISK',
          icon: <ShieldAlert className="w-3.5 h-3.5" />
        };
      case 'apocalyptic':
        return {
          bg: 'bg-red-950/50 border-red-500/70 text-red-400 animate-pulse',
          label: '生化危害 // APOCALYPTIC',
          icon: <Skull className="w-3.5 h-3.5 animate-bounce" />
        };
    }
  };

  const isEmpty = bannedList.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-neutral-950 flex flex-col font-mono overflow-y-auto scroll-smooth custom-scrollbar"
    >

      {/* Warning Grid Background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,85,85,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,85,85,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Warning Striped Top Edge */}
      <div 
        className="h-2 w-full bg-repeat-x pointer-events-none opacity-80 shrink-0 relative z-20"
        style={{ 
          backgroundImage: 'repeating-linear-gradient(45deg, #FACC15, #FACC15 12px, #000000 12px, #000000 24px)' 
        }}
      />

      {/* Warning Striped Left Edge (Full Screen Height, Far Left) */}
      <div 
        className="fixed top-0 left-0 bottom-0 w-2 bg-repeat-y pointer-events-none opacity-80 z-50"
        style={{ 
          backgroundImage: 'repeating-linear-gradient(135deg, #FACC15, #FACC15 12px, #000000 12px, #000000 24px)' 
        }}
      />

      {/* Top-Left Return Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.1, x: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        className="absolute top-8 left-8 z-[1010] flex items-center gap-4 text-[#FF5555] hover:text-[#FF5555]/80 group"
      >
        <div className="w-10 h-10 rounded-full border-2 border-[#FF5555] flex items-center justify-center group-hover:bg-[#FF5555] group-hover:text-black transition-all">
          <span className="text-xl">←</span>
        </div>
        <span className="font-black tracking-widest text-xs uppercase font-pixel">Back to Base</span>
      </motion.button>

      {/* Main Container */}
      <div className="flex-1 flex flex-col relative z-10 w-full min-h-screen pl-6 pr-6 xl:pl-8 xl:pr-8 pb-12">
        {/* Left Column: Banned Poster Frames & Name (Sidebar-style, far left) */}
        <div className="w-full shrink-0 bg-neutral-950/65 backdrop-blur-md p-6 sm:p-8 pt-32 xl:pt-40 flex flex-col xl:flex-row items-center xl:items-start justify-start gap-8">
          
          {/* Title Area: 出禁公告區 */}
          <div className="flex flex-col gap-2 shrink-0 text-center xl:text-left xl:pt-4 max-w-[200px]">
            <h1 className="text-3xl sm:text-4xl font-black text-[#FACC15] tracking-widest font-pixel relative whitespace-nowrap">
              出禁公告區
            </h1>
            <div className="h-1 w-16 bg-[#FACC15] mx-auto xl:mx-0 my-2"></div>
            <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase leading-relaxed">
              OFFICIAL BLACKLIST BAN NOTICE
            </p>
          </div>

          {/* Grouped Frames Container */}
          <div className="flex flex-col lg:flex-row items-center justify-start gap-8 w-full max-w-5xl">
            {/* Grouped Frame 1 for Poster & Name Label with Yellow Diagonal Stripes Border */}
            <div 
              className="rounded-[2.5rem] p-2 w-full max-w-[380px] sm:max-w-[420px] flex flex-col gap-4 animate-fade-in shadow-[0_0_50px_rgba(234,179,8,0.25)]"
              style={{ 
                backgroundImage: 'repeating-linear-gradient(45deg, #FACC15, #FACC15 12px, #000000 12px, #000000 24px)' 
              }}
            >
              <div className="bg-slate-950 rounded-[2rem] p-6 w-full h-full flex flex-col gap-4">
                {/* Poster Image Frame 1 */}
                <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900 aspect-[3/4] w-full flex items-center justify-center">
                  <img
                    src={bannedPoster}
                    alt="酸欠像素偶像居酒屋官方出禁公告"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Name Label */}
                <div className="text-center py-2.5 px-3 bg-yellow-950/40 border border-yellow-500/30 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.05)]">
                  <span className="text-xs font-black text-[#FACC15] tracking-widest font-mono">
                    姓名：多托雷 (示意)
                  </span>
                </div>
              </div>
            </div>

            {/* Grouped Frame 2 for Poster & Name Label with Yellow Diagonal Stripes Border */}
            <div 
              className="rounded-[2.5rem] p-2 w-full max-w-[380px] sm:max-w-[420px] flex flex-col gap-4 animate-fade-in shadow-[0_0_50px_rgba(234,179,8,0.25)]"
              style={{ 
                backgroundImage: 'repeating-linear-gradient(45deg, #FACC15, #FACC15 12px, #000000 12px, #000000 24px)' 
              }}
            >
              <div className="bg-slate-950 rounded-[2rem] p-6 w-full h-full flex flex-col gap-4">
                {/* Poster Image Frame 2 */}
                <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900 aspect-[3/4] w-full flex items-center justify-center">
                  <img
                    src={bannedPoster2}
                    alt="酸欠像素偶像居酒屋官方出禁公告 二"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Name Label */}
                <div className="text-center py-2.5 px-3 bg-yellow-950/40 border border-yellow-500/30 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.05)]">
                  <span className="text-xs font-black text-[#FACC15] tracking-widest font-mono">
                    姓名：詭異無禮怪老子
                  </span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Terminal Footer Strip */}
      <div className="px-6 py-4 border-t border-[#FF5555]/20 bg-black/90 flex items-center justify-between text-[10px] text-white/30 tracking-widest shrink-0 font-mono relative z-20">
        <span>SECURITY SYSTEMS SECURED // SECURE GATEWAY OK</span>
        <span className="animate-pulse">● SECURED GRID STATUS: APOCALYPTIC BARRIER ONLINE</span>
      </div>
    </motion.div>
  );
};
