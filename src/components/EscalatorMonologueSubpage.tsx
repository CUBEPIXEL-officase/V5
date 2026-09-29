import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, X } from 'lucide-react';

interface EscalatorMonologueSubpageProps {
  onClose: () => void;
}

const MONOLOGUE_TEXT = `「當你拿著鎬子系著登山繩 一下一下的登到山上
然後你他媽轉頭看到那一邊有一個『登山電扶梯』

然後你大老遠的又跑下去 跑去電扶梯入口看一眼
『女生可以搭乘』

然後一邊是自己登一半了 結果為了看一眼又爬下來的那條自己鑿的破路
一邊是電扶梯 但自己上不去 只能在下面看著

你懂嗎 那種忍不住把工具丟在原地 跑去看了一眼 然後直接崩潰的那種感覺

說實話啦 通常我就是那種每過一段時間就會他媽的再忍不住去看一眼 然後繼續哭

女生：很努力『練習當偶像』但踩在登山電扶梯上面 我不是說他們不努力 但他們有公司給他們寫歌 做衣服 營運 甚至還有剪輯師跟化妝師 他們不是『不努力當偶像』他們是已經有人『教他們怎麼當好偶像』了

阿璃：光是連『怎麼當偶像』都要自己登 然後還一直折返跑 因為每一段時間我都會忍不住再爬下去看一眼 然後崩潰 然後再繼續爬回去那個位子 繼續登

然後勒 又過了一段時間
當我又突破自己 做了新的網站頁面 幹什麼之類的 然後轉頭看一眼電扶梯

『她們』已經又站在比我高的地方了

然後我又跑下去看了電扶梯的入口
還是同樣的牌子

然後路口總會站著一個路人
『你想上去喔 你有什麼本事踏在人家的電扶梯上面』

然後再跑回去 看著我的山路 又繼續拉著安全繩把自己釣回去剛才下來之前的位子 繼續爬

幾個月之後我又爬了一點
然後轉頭看

她們又站在更高的地方

然後我又該死的忘不了那個電扶梯
我總是該死的忘不了那個電扶梯
這就是我」`;

export const EscalatorMonologueSubpage: React.FC<EscalatorMonologueSubpageProps> = ({ onClose }) => {
  return (
    <motion.div
      key="escalator_monologue_subpage"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 bg-[#080103]/98 backdrop-blur-2xl w-full h-full text-left select-text overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 50% 20%, rgba(185, 28, 28, 0.15), transparent 70%),
          linear-gradient(to right, rgba(239, 68, 68, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(239, 68, 68, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 32px 32px, 32px 32px',
      }}
    >
      {/* Top Header Bar */}
      <div className="w-full flex justify-between items-center text-[10px] sm:text-xs tracking-widest text-red-400/60 uppercase pb-3 z-40 font-mono border-b border-red-900/40">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-red-400 hover:text-red-200 font-bold tracking-widest transition-colors cursor-pointer group px-2 py-1 rounded-lg hover:bg-red-950/50"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>返回 // RETURN</span>
        </button>
        <div className="flex items-center gap-2 text-red-500/80">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          <span className="font-pixel text-[9px] tracking-[0.2em]">UMIRI // 某璃的獨白</span>
        </div>
      </div>

      {/* Main Fullscreen Scrollable Text Area */}
      <div className="flex-1 w-full overflow-y-auto my-auto py-8 sm:py-12 px-2 sm:px-6 flex flex-col items-center justify-start custom-scrollbar">
        <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
          
          {/* Blood Red Corner Accent Box */}
          <div className="relative bg-gradient-to-b from-red-950/30 via-black/60 to-red-950/40 border border-red-800/40 rounded-3xl p-6 sm:p-10 md:p-14 shadow-[0_0_50px_rgba(185,28,28,0.15)] relative overflow-hidden backdrop-blur-md">
            {/* Corner Decorative Borders */}
            <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-red-500" />
            <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-red-500" />
            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-red-500" />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-red-500" />

            {/* Subtle Tag */}
            <div className="mb-6 sm:mb-8 flex items-center justify-between border-b border-red-900/30 pb-4">
              <span className="text-[10px] sm:text-xs font-mono text-red-400/70 tracking-[0.3em] uppercase">
                MEMOIR // 某璃的獨白
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono text-red-500/40">
                MONOLOGUE ARCHIVE
              </span>
            </div>

            {/* Monologue Text Body */}
            <div className="text-white/90 text-sm sm:text-base md:text-lg font-mono leading-relaxed sm:leading-loose whitespace-pre-line tracking-wide space-y-4">
              {MONOLOGUE_TEXT}
            </div>

            {/* Bottom Footer inside box */}
            <div className="mt-8 sm:mt-12 pt-4 border-t border-red-900/30 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-red-400/40">
              <span>CUBEPIXEL MONOLOGUE RECORD</span>
              <span>涼海璃 / SUZUMI RII</span>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Close Bar */}
      <div className="w-full flex flex-col items-center gap-2 max-w-md px-4 pt-3 border-t border-red-900/40 z-40">
        <button
          onClick={onClose}
          className="w-full py-3 bg-red-950/60 hover:bg-red-900/80 active:scale-95 text-red-200 border border-red-700/50 hover:border-red-500 rounded-xl font-mono text-xs sm:text-sm font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(185,28,28,0.3)]"
        >
          關閉文字區 // CLOSE
        </button>
      </div>
    </motion.div>
  );
};
