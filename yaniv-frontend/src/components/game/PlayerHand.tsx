import type { Ref } from 'react';
import { motion } from 'framer-motion';
import { CardView } from './CardView';
import { TurnCountdown } from './TurnCountdown';
import { useGameStore, selectIsMyTurn, selectMe } from '../../store/gameStore';
import { handTotal, parseCard, isJoker } from '../../utils/cardUtils';
import { useStrings } from '../../strings';
import type { CardId, GamePhase } from '../../shared/types';

function sortHandForRTL(hand: CardId[]): CardId[] {
  // In RTL layout first item renders on the RIGHT — sort ascending so highest
  // value card ends up visually on the LEFT and lowest on the RIGHT.
  const order: Record<string, number> = {
    K: 13, Q: 12, J: 11, '10': 10, '9': 9, '8': 8, '7': 7,
    '6': 6, '5': 5, '4': 4, '3': 3, '2': 2, A: 1, joker: 0,
  };
  return [...hand].sort((a, b) => {
    const ra = isJoker(a) ? 0 : (order[parseCard(a).rank] ?? 0);
    const rb = isJoker(b) ? 0 : (order[parseCard(b).rank] ?? 0);
    return ra - rb; // ascending → RTL renders as highest-left, lowest-right
  });
}

interface Props {
  handRef?: Ref<HTMLDivElement>;
  cardRef?: (cardId: CardId, node: HTMLDivElement | null) => void;
  revealedHand?: CardId[] | null;
  revealedTotal?: number | null;
  phase?: GamePhase | null;
  turnDeadlineEpoch?: number | null;
  showCountdown?: boolean;
}

export function PlayerHand({ handRef, cardRef, revealedHand, revealedTotal, phase, turnDeadlineEpoch, showCountdown }: Props) {
  const s = useStrings();
  const myHand = useGameStore((s) => s.myHand);
  const selectedCards = useGameStore((s) => s.selectedCards);
  const toggleCard = useGameStore((s) => s.toggleCard);
  const hadabakaCard = useGameStore((s) => s.hadabakaCard);
  const hadabakaAccept = useGameStore((s) => s.hadabakaAccept);
  const phase = useGameStore((s) => s.phase);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const me = useGameStore(selectMe);
  const lastTurnAnimation = useGameStore((s) => s.lastTurnAnimation);
  const displayHand = revealedHand ?? myHand;
  const total = revealedTotal ?? handTotal(displayHand);
  const isWaitingRoom = phase === 'waiting_for_players';
  const isSpectating = !!me?.isEliminated && !revealedHand;

  const canSelect = phase === 'player_turn_discard' || phase === 'player_turn_draw';
  const isHadabakaPhase = isMyTurn && phase === 'player_turn_hadabaka';
  const sortedHand = sortHandForRTL(displayHand);
  const myDrawAnimationSeq =
    lastTurnAnimation?.action === 'draw' &&
    lastTurnAnimation.actingUserId === me?.userId &&
    lastTurnAnimation.myNewCard
      ? lastTurnAnimation.seq
      : 0;

  if (isWaitingRoom) {
    return (
      <div className="flex flex-col items-center gap-2.5">
        <div className="text-white/65 text-sm">
          {s.game.handOnStart}
        </div>

        <div className="flex items-end justify-center gap-1.5" style={{ minHeight: 112 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const offset = Math.abs(i - 2) * 4;
            return (
              <div
                key={i}
                className="w-16 h-24 rounded-2xl border border-white/20 bg-white/10"
                style={{
                  transform: `translateY(${offset}px)`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(6px)',
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (isSpectating) {
    return (
      <div className="flex flex-col items-center gap-2.5">
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold tabular-nums"
          style={{
            background: 'rgba(255,251,240,0.72)',
            color: '#0C4A6E',
            border: '1px solid rgba(12,74,110,0.12)',
            boxShadow: '0 8px 20px rgba(12,74,110,0.08)',
          }}
        >
          {s.game.spectating}
        </div>

        <div
          ref={handRef}
          className="flex min-h-[124px] items-center justify-center px-4 text-center"
        >
          <div
            className="rounded-[1.75rem] px-5 py-4 text-sm font-medium"
            style={{
              background: 'rgba(255,255,255,0.4)',
              color: '#7C5533',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 12px 30px rgba(12,74,110,0.08)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {s.game.eliminated}
          </div>
        </div>
      </div>
    );
  }

  const overlap = sortedHand.length >= 8 ? -28 : sortedHand.length >= 7 ? -24 : sortedHand.length >= 6 ? -20 : -12;

  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* Hand total + turn countdown row */}
      <div className="flex items-center justify-center gap-2">
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold tabular-nums"
          style={{
            background: 'rgba(255,251,240,0.72)',
            color: '#0C4A6E',
            border: '1px solid rgba(12,74,110,0.12)',
            boxShadow: '0 8px 20px rgba(12,74,110,0.08)',
          }}
        >
          {s.game.handTotal(total)}
        </div>
        {showCountdown && (
          <TurnCountdown
            phase={phase ?? null}
            turnDeadlineEpoch={turnDeadlineEpoch ?? null}
            show={!!showCountdown}
          />
        )}
      </div>

      {/* Cards — fan layout, highest value left, lowest value right (RTL) */}
      <div ref={handRef} className="flex items-end justify-center px-2" style={{ minHeight: 124 }}>
        {sortedHand.map((cardId, i) => {
          const mid = (sortedHand.length - 1) / 2;
          const offset = i - mid;
          const rotate = offset * 4.5;
          const translateY = Math.abs(offset) * 4;
          const isHadabakaCandidate = isHadabakaPhase && hadabakaCard === cardId;
          const isFreshDrawnCard =
            lastTurnAnimation?.action === 'draw' &&
            lastTurnAnimation.actingUserId === me?.userId &&
            lastTurnAnimation.myNewCard === cardId;

          return (
            <div
              key={`${cardId}-${isFreshDrawnCard ? myDrawAnimationSeq : 'stable'}`}
              style={{
                transform: `rotate(${rotate}deg) translateY(${translateY}px)`,
                marginInlineStart: i === 0 ? 0 : overlap,
                zIndex: isHadabakaCandidate ? sortedHand.length + 2 : i,
                transformOrigin: 'bottom center',
              }}
            >
              <motion.div
                initial={
                  isHadabakaCandidate
                    ? false
                    : isFreshDrawnCard
                    ? { x: 42, y: -30, scale: 0.78, rotate: 10, opacity: 0 }
                    : false
                }
                animate={
                  isHadabakaCandidate
                    ? { y: [0, -8, 0], scale: [1, 1.04, 1] }
                    : isFreshDrawnCard
                      ? { x: 0, y: 0, scale: 1, rotate: 0, opacity: [0, 0, 1] }
                      : { y: 0, scale: 1, x: 0, opacity: 1, rotate: 0 }
                }
                transition={
                  isHadabakaCandidate
                    ? { duration: 0.68, repeat: Infinity, ease: 'easeInOut' }
                    : isFreshDrawnCard
                      ? { duration: 0.82, ease: 'easeOut', times: [0, 0.8, 1] }
                      : { duration: 0.18 }
                }
                className={isHadabakaCandidate ? 'animate-hadabaka-glow' : undefined}
              >
                <div ref={(node) => cardRef?.(cardId, node)}>
                  <CardView
                    cardId={cardId}
                    size="lg"
                    selected={selectedCards.includes(cardId)}
                    onClick={isHadabakaCandidate ? hadabakaAccept : canSelect ? () => toggleCard(cardId) : undefined}
                    className={isHadabakaCandidate ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-transparent' : undefined}
                  />
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
