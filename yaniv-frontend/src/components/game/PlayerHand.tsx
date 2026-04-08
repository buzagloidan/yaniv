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

  const canSelect = isMyTurn && phase === 'player_turn_discard';
  const sortedHand = sortHandForRTL(myHand);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hand total */}
      <div className="text-white/60 text-sm">
        {s.game.handTotal(total)}
      </div>

      {/* Cards — fan layout, highest value left, lowest value right (RTL) */}
      <div className="flex items-end justify-center" style={{ minHeight: 96 }}>
        {sortedHand.map((cardId, i) => {
          const mid = (sortedHand.length - 1) / 2;
          const offset = i - mid;
          const rotate = offset * 4;
          const translateY = Math.abs(offset) * 3;

          return (
            <div
              key={cardId}
              style={{
                transform: `rotate(${rotate}deg) translateY(${translateY}px)`,
                marginInline: sortedHand.length > 6 ? '-6px' : '-2px',
                zIndex: i,
                transformOrigin: 'bottom center',
              }}
            >
              <CardView
                cardId={cardId}
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
