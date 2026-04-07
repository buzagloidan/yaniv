import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { getTables, createTable, joinTable } from '../../networking/api';
import { he } from '../../strings/he';
import { Button } from '../ui/Button';
import { CreateTableModal } from './CreateTableModal';
import { JoinTableModal } from './JoinTableModal';
import type { TableSummary } from '../../shared/types';

/* ── Decorative SVGs ── */

function WaveHeader() {
  return (
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full" style={{ height: 40, display: 'block' }}>
      <path d="M0,30 C240,55 480,5 720,30 C960,55 1200,10 1440,30 L1440,60 L0,60Z" fill="#F5E6C8" opacity="0.7" />
      <path d="M0,45 C300,25 600,55 900,40 C1100,30 1300,50 1440,38 L1440,60 L0,60Z" fill="#E2C99A" opacity="0.4" />
    </svg>
  );
}

function PlayerDots({ count, max }: { count: number; max: number }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-colors"
          style={{ background: i < count ? '#0891B2' : '#E2C99A' }}
        />
      ))}
    </div>
  );
}

/* Table "destination" card colors — each gets its own accent strip */
const CARD_ACCENTS = [
  { from: '#0891B2', to: '#0E7490' }, // ocean
  { from: '#F26419', to: '#D9560E' }, // coral
  { from: '#16A34A', to: '#15803D' }, // palm
  { from: '#7C3AED', to: '#6D28D9' }, // lavender
  { from: '#DB2777', to: '#BE185D' }, // flamingo
];

function TableCard({ table, index, onJoin, joining }: { table: TableSummary; index: number; onJoin: () => void; joining?: boolean }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const inProgress = table.status === 'in_progress';
  const count = table.player_count ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      onClick={onJoin}
      className="cursor-pointer group"
    >
      <div
        className="rounded-2xl overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5"
        style={{
          background: 'white',
          boxShadow: '0 4px 16px rgba(26,51,82,0.08), 0 1px 4px rgba(26,51,82,0.04)',
          border: '1px solid rgba(226,201,154,0.4)',
        }}
      >
        {/* Accent top strip */}
        <div
          className="h-1.5"
          style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
        />

        <div className="px-4 py-3 flex items-center justify-between gap-3">
          {/* Left: info */}
          <div className="flex flex-col gap-1.5 min-w-0">
            {/* Room code */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-base font-bold tracking-wider"
                style={{ color: '#1A3352', fontFamily: 'Syne, sans-serif' }}
              >
                {table.room_code}
              </span>

              {inProgress && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#E0F2FE', color: '#0E7490' }}
                >
                  בתהליך
                </span>
              )}

              {table.is_ranked ? (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#FEF3C7', color: '#92400E' }}
                >
                  {he.lobby.ranked}
                </span>
              ) : (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#F5E6C8', color: '#7C5533' }}
                >
                  {he.lobby.casual}
                </span>
              )}
            </div>

            {/* Player dots + count */}
            <div className="flex items-center gap-2">
              <PlayerDots count={count} max={table.max_players} />
              <span className="text-xs" style={{ color: '#7C6A50' }}>
                {he.lobby.players(count, table.max_players)} · ספף {table.yaniv_threshold}
              </span>
            </div>
          </div>

          {/* Right: join button */}
          <Button
            size="sm"
            variant={inProgress ? 'secondary' : 'primary'}
            onClick={e => { e.stopPropagation(); onJoin(); }}
            disabled={joining}
            className="shrink-0"
          >
            {joining ? '...' : inProgress ? 'המתן' : he.lobby.join}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function LobbyPage() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const token = user!.sessionToken;

  const load = async () => {
    try {
      const data = await getTables(token);
      setTables(data.tables);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (settings: Parameters<typeof createTable>[1]) => {
    const data = await createTable(token, settings);
    navigate(`/game/${data.tableId}?code=${data.roomCode}`);
  };

  const handleJoin = async (code: string) => {
    setJoinError(null);
    setJoiningCode(code);
    try {
      const data = await joinTable(token, code);
      navigate(`/game/${data.tableId}?code=${data.roomCode}`);
    } catch (e) {
      setJoinError((e as Error).message ?? 'שגיאה בהצטרפות');
    } finally {
      setJoiningCode(null);
    }
  };

  const handleJoinRow = (table: TableSummary) => {
    handleJoin(table.room_code);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #F0F9FF 0%, #FDFAF3 30%, #FDFAF3 100%)' }}
    >
      {/* ── Header ── */}
      <header
        className="relative"
        style={{ background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <img src="/yaniv-logo.png" alt="יניב" className="w-9 h-9 object-contain drop-shadow" />
            <span
              className="text-xl font-bold text-white tracking-wide"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              יניב
            </span>
          </div>

          {/* User + sign out */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-sm text-white/90 font-medium">{user?.displayName}</span>
            </div>
            <button
              onClick={signOut}
              className="text-sm text-sky-200 hover:text-white transition-colors px-2 py-1"
            >
              {he.lobby.signOut}
            </button>
          </div>
        </div>

        {/* Wave divider */}
        <WaveHeader />
      </header>

      {/* ── Action Bar ── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex gap-3">
          <Button onClick={() => setShowCreate(true)} className="flex-1 gap-2">
            <span>＋</span>
            {he.lobby.createTable}
          </Button>
          <Button variant="secondary" onClick={() => setShowJoin(true)} className="flex-1 gap-2">
            <span>#</span>
            {he.lobby.joinWithCode}
          </Button>
        </div>
      </div>

      {/* ── Section Label ── */}
      <div className="px-4 mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: '#2D4F7C' }}>
          שולחנות פעילים
        </span>
        <div className="flex-1 h-px" style={{ background: '#E2C99A' }} />
        <span className="text-xs" style={{ color: '#7C6A50' }}>
          {tables.length > 0 ? `${tables.length} שולחנות` : ''}
        </span>
      </div>

      {/* ── Table List ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <AnimatePresence>
          {loading ? (
            <div className="flex flex-col items-center gap-3 mt-16">
              <motion.div
                className="text-3xl"
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🌴
              </motion.div>
              <p className="text-sm" style={{ color: '#7C6A50' }}>{he.lobby.loading}</p>
            </div>
          ) : tables.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 mt-16"
            >
              <span className="text-4xl">🏖</span>
              <p className="text-sm" style={{ color: '#7C6A50' }}>{he.lobby.noTables}</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {joinError && (
                <div className="rounded-xl px-4 py-2.5 text-sm text-center" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
                  {joinError}
                </div>
              )}
              {tables.map((t, i) => (
                <TableCard
                  key={t.id}
                  table={t}
                  index={i}
                  onJoin={() => handleJoinRow(t)}
                  joining={joiningCode === t.room_code}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom wave decoration ── */}
      <div className="pointer-events-none fixed bottom-0 inset-x-0 opacity-30" style={{ height: 60 }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,35 1440,30 L1440,60 L0,60Z" fill="#0891B2" />
        </svg>
      </div>

      <CreateTableModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
      <JoinTableModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoin={handleJoin}
      />
    </div>
  );
}
