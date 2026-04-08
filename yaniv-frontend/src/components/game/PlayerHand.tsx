import { CardView } from './CardView';
import { useGameStore, selectIsMyTurn } from '../../store/gameStore';
import { handTotal, parseCard, isJoker } from '../../utils/cardUtils';
import { useStrings } from '../../strings';
import type { CardId } from '../../shared/types';

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

export function PlayerHand() {
  const s = useStrings();
  const myHand = useGameStore((s) => s.myHand);
  const selectedCards = useGameStore((s) => s.selectedCards);
  const toggleCard = useGameStore((s) => s.toggleCard);
  const phase = useGameStore((s) => s.phase);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const total = handTotal(myHand);
  const isWaitingRoom = phase === 'waiting_for_players';

  const canSelect = isMyTurn && phase === 'player_turn_discard';
  const sortedHand = sortHandForRTL(myHand);

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

  const overlap = sortedHand.length >= 8 ? -28 : sortedHand.length >= 7 ? -24 : sortedHand.length >= 6 ? -20 : -12;

  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* Hand total */}
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

      {/* Cards — fan layout, highest value left, lowest value right (RTL) */}
      <div className="flex items-end justify-center px-2" style={{ minHeight: 128 }}>
        {sortedHand.map((cardId, i) => {
          const mid = (sortedHand.length - 1) / 2;
          const offset = i - mid;
          const rotate = offset * 4.5;
          const translateY = Math.abs(offset) * 4;

          return (
            <div
              key={cardId}
              style={{
                transform: `rotate(${rotate}deg) translateY(${translateY}px)`,
                marginInlineStart: i === 0 ? 0 : overlap,
                zIndex: i,
                transformOrigin: 'bottom center',
              }}
            >
              <CardView
                cardId={cardId}
                size="lg"
                selected={selectedCards.includes(cardId)}
                onClick={canSelect ? () => toggleCard(cardId) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
