import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CardView } from './CardView';
import { useGameStore } from '../../store/gameStore';
import type { CardId, DrawSource } from '../../shared/types';

const FLIGHT_CARD_WIDTH = 78;
const FLIGHT_CARD_HEIGHT = 116;

interface Point {
  x: number;
  y: number;
}

interface FlightCard {
  id: string;
  cardId: CardId;
  faceDown: boolean;
  from: Point;
  to: Point;
  startRotate: number;
  endRotate: number;
  delay: number;
  duration: number;
}

interface Props {
  myUserId: string | null;
  deckEl: HTMLDivElement | null;
  discardEl: HTMLDivElement | null;
  myHandEl: HTMLDivElement | null;
  opponentHandEls: Record<string, HTMLDivElement | null>;
}

function centerPoint(element: HTMLElement | null): Point | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function spreadOffset(index: number, count: number, gap: number): number {
  return (index - (count - 1) / 2) * gap;
}

function placeholderCardId(): CardId {
  return 'AS';
}

function targetForDraw(
  actingUserId: string,
  myUserId: string | null,
  myHandEl: HTMLDivElement | null,
  opponentHandEls: Record<string, HTMLDivElement | null>,
): HTMLDivElement | null {
  if (actingUserId === myUserId) {
    return myHandEl;
  }
  return opponentHandEls[actingUserId] ?? null;
}

function sourceForDiscard(
  actingUserId: string,
  myUserId: string | null,
  myHandEl: HTMLDivElement | null,
  opponentHandEls: Record<string, HTMLDivElement | null>,
): HTMLDivElement | null {
  if (actingUserId === myUserId) {
    return myHandEl;
  }
  return opponentHandEls[actingUserId] ?? null;
}

function buildDiscardFlights(
  seq: number,
  actingUserId: string,
  myUserId: string | null,
  myHandEl: HTMLDivElement | null,
  discardEl: HTMLDivElement | null,
  opponentHandEls: Record<string, HTMLDivElement | null>,
  discardedCards: CardId[] | null,
): FlightCard[] {
  if (!discardedCards || discardedCards.length === 0) return [];

  const source = centerPoint(
    sourceForDiscard(actingUserId, myUserId, myHandEl, opponentHandEls),
  );
  const target = centerPoint(discardEl);
  if (!source || !target) return [];

  return discardedCards.map((cardId, index) => ({
    id: `discard-${seq}-${cardId}-${index}`,
    cardId,
    faceDown: false,
    from: {
      x: source.x + spreadOffset(index, discardedCards.length, 22),
      y: source.y + Math.abs(spreadOffset(index, discardedCards.length, 9)) * 0.25,
    },
    to: {
      x: target.x + spreadOffset(index, discardedCards.length, 18),
      y: target.y + Math.abs(spreadOffset(index, discardedCards.length, 8)) * 0.2,
    },
    startRotate: spreadOffset(index, discardedCards.length, 7),
    endRotate: spreadOffset(index, discardedCards.length, 6),
    delay: index * 0.045,
    duration: 0.58,
  }));
}

function buildDrawFlights(
  seq: number,
  actingUserId: string,
  myUserId: string | null,
  deckEl: HTMLDivElement | null,
  discardEl: HTMLDivElement | null,
  myHandEl: HTMLDivElement | null,
  opponentHandEls: Record<string, HTMLDivElement | null>,
  drawnSource: DrawSource | null,
  myNewCard: CardId | null,
): FlightCard[] {
  if (!drawnSource) return [];

  const source = centerPoint(drawnSource === 'deck' ? deckEl : discardEl);
  const target = centerPoint(targetForDraw(actingUserId, myUserId, myHandEl, opponentHandEls));
  if (!source || !target) return [];

  const faceDown = actingUserId !== myUserId || !myNewCard;

  return [{
    id: `draw-${seq}-${actingUserId}`,
    cardId: myNewCard ?? placeholderCardId(),
    faceDown,
    from: source,
    to: target,
    startRotate: drawnSource === 'deck' ? -14 : 10,
    endRotate: actingUserId === myUserId ? 0 : -4,
    delay: 0,
    duration: 0.54,
  }];
}

export function CardFlightLayer({
  myUserId,
  deckEl,
  discardEl,
  myHandEl,
  opponentHandEls,
}: Props) {
  const lastTurnAnimation = useGameStore((s) => s.lastTurnAnimation);
  const [flights, setFlights] = useState<FlightCard[]>([]);

  useEffect(() => {
    if (!lastTurnAnimation) return;

    const frame = window.requestAnimationFrame(() => {
      const nextFlights =
        lastTurnAnimation.action === 'discard'
          ? buildDiscardFlights(
              lastTurnAnimation.seq,
              lastTurnAnimation.actingUserId,
              myUserId,
              myHandEl,
              discardEl,
              opponentHandEls,
              lastTurnAnimation.discardedCards,
            )
          : buildDrawFlights(
              lastTurnAnimation.seq,
              lastTurnAnimation.actingUserId,
              myUserId,
              deckEl,
              discardEl,
              myHandEl,
              opponentHandEls,
              lastTurnAnimation.drawnSource,
              lastTurnAnimation.myNewCard,
            );

      if (nextFlights.length === 0) return;

      const ids = new Set(nextFlights.map((flight) => flight.id));
      setFlights((current) => [...current, ...nextFlights]);

      const longestFlight = Math.max(
        ...nextFlights.map((flight) => (flight.delay + flight.duration) * 1000),
      );

      window.setTimeout(() => {
        setFlights((current) => current.filter((flight) => !ids.has(flight.id)));
      }, longestFlight + 120);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    discardEl,
    deckEl,
    lastTurnAnimation,
    myHandEl,
    myUserId,
    opponentHandEls,
  ]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <AnimatePresence>
        {flights.map((flight) => (
          <motion.div
            key={flight.id}
            className="absolute"
            style={{
              left: flight.from.x - FLIGHT_CARD_WIDTH / 2,
              top: flight.from.y - FLIGHT_CARD_HEIGHT / 2,
            }}
            initial={{
              x: 0,
              y: 0,
              rotate: flight.startRotate,
              scale: 0.9,
              opacity: 0,
            }}
            animate={{
              x: flight.to.x - flight.from.x,
              y: flight.to.y - flight.from.y,
              rotate: flight.endRotate,
              scale: [0.9, 1.04, 1],
              opacity: [0, 1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: flight.duration,
              delay: flight.delay,
              ease: 'easeInOut',
              times: [0, 0.14, 0.82, 1],
            }}
          >
            <CardView
              cardId={flight.cardId}
              faceDown={flight.faceDown}
              size="lg"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
