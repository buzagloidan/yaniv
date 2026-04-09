import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, selectMe } from '../../store/gameStore';
import { useStrings } from '../../strings';

export function Chat() {
  const s = useStrings();
  const messages = useGameStore((s) => s.chatMessages);
  const sendChat = useGameStore((s) => s.sendChat);
  const players = useGameStore((s) => s.players);
  const me = useGameStore(selectMe);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAnotherHuman = players.some((player) => !player.isBot && player.userId !== me?.userId);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (!hasAnotherHuman && open) {
      setOpen(false);
    }
  }, [hasAnotherHuman, open]);

  const send = () => {
    if (!text.trim()) return;
    sendChat(text);
    setText('');
  };

  if (!hasAnotherHuman) {
    return null;
  }

  return (
    <div className="absolute bottom-36 end-3 z-20">
      {/* Toggle button with unread badge */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-white/80 text-lg flex items-center justify-center transition-colors"
        aria-label={s.game.chat}
        title={s.game.chat}
      >
        <span>💬</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-12 end-0 w-72 bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Messages */}
            <div
              ref={scrollRef}
              className="chat-scroll overflow-y-auto max-h-64 p-3 space-y-2 flex flex-col"
            >
              {messages.length === 0 ? (
                <p className="text-white/20 text-xs text-center py-4">אין הודעות עדיין</p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className="flex flex-col items-start">
                    <span className="text-white/40 text-xs mb-0.5">{m.fromDisplayName}</span>
                    <div className="bg-white/8 rounded-xl px-3 py-1.5 text-sm text-white max-w-[90%]">
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 p-2 border-t border-white/5">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={s.game.chatPlaceholder}
                maxLength={200}
                className="flex-1 bg-white/5 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 outline-none focus:bg-white/10"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-white text-sm transition-colors"
              >
                {s.game.send}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
