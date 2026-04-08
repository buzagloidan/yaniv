import { CardView } from './CardView';
import { useGameStore, selectIsMyTurn } from '../../store/gameStore';
import { handTotal } from '../../utils/cardUtils';
import { useStrings } from '../../strings';

export function PlayerHand() {
  const s = useStrings();
  const myHand = useGameStore((s) => s.myHand);
  const selectedCards = useGameStore((s) => s.selectedCards);
  const toggleCard = useGameStore((s) => s.toggleCard);
  const phase = useGameStore((s) => s.phase);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const total = handTotal(myHand);

  const canSelect = isMyTurn && phase === 'player_turn_discard';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hand total */}
      <div className="text-white/60 text-sm">
        {s.game.handTotal(total)}
      </div>

      {/* Cards — fan layout */}
      <div className="flex items-end justify-center" style={{ minHeight: 96 }}>
        {myHand.map((cardId, i) => {
          const mid = (myHand.length - 1) / 2;
          const offset = i - mid;
          const rotate = offset * 4;
          const translateY = Math.abs(offset) * 3;

          return (
            <div
              key={cardId}
              style={{
                transform: `rotate(${rotate}deg) translateY(${translateY}px)`,
                marginInline: myHand.length > 6 ? '-6px' : '-2px',
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
