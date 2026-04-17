import { useGameStore, selectMe } from '../../store/gameStore';
import { useStrings } from '../../strings';

export function ScoreBoard() {
  const s = useStrings();
  const me = useGameStore(selectMe);
  const roundNumber = useGameStore((state) => state.roundNumber);
  const roomCode = useGameStore((state) => state.roomCode);
  const isPrivateTable = useGameStore((state) => state.isPrivateTable);

  return (
    <>
      <div
        className="pointer-events-none absolute top-4 end-18 z-20 text-right"
        style={{ color: 'rgba(255,251,240,0.46)' }}
      >
        {roomCode && !isPrivateTable && (
          <div className="text-[0.66rem] font-medium tracking-[0.08em]">
            {s.game.roomCode(roomCode)}
          </div>
        )}
        {roundNumber > 0 && (
          <div className="text-[0.66rem] font-medium tracking-[0.08em]">
            {s.game.round(roundNumber)}
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute bottom-3 end-4 z-20"
        style={{
          color: '#C53030',
          textShadow: '0 4px 18px rgba(122, 23, 23, 0.28)',
          fontFamily: 'Syne, sans-serif',
        }}
      >
        <span className="text-[2rem] font-black sm:text-[2.15rem]">
          {me?.score ?? 0}
        </span>
      </div>
    </>
  );
}
