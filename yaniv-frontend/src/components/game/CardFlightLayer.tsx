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
  arcLift: number;
  delay: number;
  duration: number;
  action: 'discard' | 'draw';
}

interface Props {
  myUserId: string | null;
  deckEl: HTMLDivElement | null;
  discardEl: HTMLDivElement | null;
  myHandEl: HTMLDivElement | null;
  myCardEls: Record<string, HTMLDivElement | null>;
  opponentHandEls: Record<string, HTMLDivElement | null>;
  pendingMyDiscardAnchorsRef: { current: Record<CardId, Point> };
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

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

function fallbackArcLift(from: Point, to: Point): number {
  return Math.min(110, Math.max(56, Math.abs(to.y - from.y) * 0.18 + 34));
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
  myCardEls: Record<string, HTMLDivElement | null>,
  opponentHandEls: Record<string, HTMLDivElement | null>,
  pendingMyDiscardAnchors: Record<CardId, Point>,
  discardedCards: CardId[] | null,
): FlightCard[] {
  if (!discardedCards || discardedCards.length === 0) return [];

  const source = centerPoint(
    sourceForDiscard(actingUserId, myUserId, myHandEl, opponentHandEls),
  );
  const target = centerPoint(discardEl);
  if (!source || !target) return [];

  return discardedCards.map((cardId, index) => {
    const fallbackFrom = {
      x: source.x + spreadOffset(index, discardedCards.length, 22),
      y: source.y + Math.abs(spreadOffset(index, discardedCards.length, 9)) * 0.25,
    };
    const from = pendingMyDiscardAnchors[cardId]
      ? clonePoint(pendingMyDiscardAnchors[cardId])
      : clonePoint(centerPoint(myCardEls[cardId]) ?? fallbackFrom);
    const to = {
      x: target.x + spreadOffset(index, discardedCards.length, 18),
      y: target.y + Math.abs(spreadOffset(index, discardedCards.length, 8)) * 0.2,
    };

    return {
      id: `discard-${seq}-${cardId}-${index}`,
      cardId,
      faceDown: false,
      from,
      to,
      startRotate: spreadOffset(index, discardedCards.length, 7),
      endRotate: spreadOffset(index, discardedCards.length, 6),
      arcLift: fallbackArcLift(from, to),
      delay: index * 0.06,
      duration: 0.58,
      action: 'discard' as const,
    };
  });
}

function buildDrawFlights(
  seq: number,
  actingUserId: string,
  myUserId: string | null,
  deckEl: HTMLDivElement | null,
  discardEl: HTMLDivElement | null,
  myHandEl: HTMLDivElement | null,
  myCardEls: Record<string, HTMLDivElement | null>,
  opponentHandEls: Record<string, HTMLDivElement | null>,
  drawnSource: DrawSource | null,
  myNewCard: CardId | null,
): FlightCard[] {
  if (!drawnSource) return [];

  const source = centerPoint(drawnSource === 'deck' ? deckEl : discardEl);
  const target =
    (actingUserId === myUserId && myNewCard ? centerPoint(myCardEls[myNewCard]) : null) ??
    centerPoint(targetForDraw(actingUserId, myUserId, myHandEl, opponentHandEls));
  if (!source || !target) return [];

  const faceDown = actingUserId !== myUserId || !myNewCard;

  return [{
    id: `draw-${seq}-${actingUserId}`,
    cardId: myNewCard ?? placeholderCardId(),
    faceDown,
    from: clonePoint(source),
    to: clonePoint(target),
    startRotate: drawnSource === 'deck' ? -8 : 6,
    endRotate: actingUserId === myUserId ? 0 : -3,
    arcLift: 0,
    delay: 0,
    duration: 0.42,
    action: 'draw' as const,
  }];
}

export function CardFlightLayer({
  myUserId,
  deckEl,
  discardEl,
  myHandEl,
  myCardEls,
  opponentHandEls,
  pendingMyDiscardAnchorsRef,
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
              myCardEls,
              opponentHandEls,
              pendingMyDiscardAnchorsRef.current,
              lastTurnAnimation.discardedCards,
            )
          : buildDrawFlights(
              lastTurnAnimation.seq,
              lastTurnAnimation.actingUserId,
              myUserId,
              deckEl,
              discardEl,
              myHandEl,
              myCardEls,
              opponentHandEls,
              lastTurnAnimation.drawnSource,
              lastTurnAnimation.myNewCard,
            );

      if (nextFlights.length === 0) return;

      if (
        lastTurnAnimation.action === 'discard' &&
        lastTurnAnimation.actingUserId === myUserId
      ) {
        pendingMyDiscardAnchorsRef.current = {};
      }

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
    myCardEls,
    myUserId,
    opponentHandEls,
    pendingMyDiscardAnchorsRef,
  ]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <AnimatePresence>
        {flights.map((flight) => {
          const dx = flight.to.x - flight.from.x;
          const dy = flight.to.y - flight.from.y;
          const isDraw = flight.action === 'draw';

          return (
            <motion.div
              key={flight.id}
              className="absolute"
              style={{
                left: flight.from.x - FLIGHT_CARD_WIDTH / 2,
                top: flight.from.y - FLIGHT_CARD_HEIGHT / 2,
                willChange: 'transform, opacity',
              }}
              initial={isDraw ? {
                x: 0,
                y: 0,
                rotate: flight.startRotate,
                scale: 1.08,
                opacity: 1,
              } : {
                x: 0,
                y: 0,
                rotate: flight.startRotate,
                scale: 0.96,
                opacity: 0,
              }}
              animate={isDraw ? {
                x: [0, dx * 0.6, dx],
                y: [0, dy * 0.6, dy],
                rotate: [flight.startRotate, (flight.startRotate + flight.endRotate) / 2, flight.endRotate],
                scale: [1.08, 1.02, 1],
                opacity: [1, 1, 0],
              } : {
                x: [0, dx * 0.28, dx * 0.80, dx],
                y: [0, -flight.arcLift, dy * 0.70, dy],
                rotate: [
                  flight.startRotate,
                  (flight.startRotate + flight.endRotate) / 2 + Math.sign(dx || 1) * 5,
                  flight.endRotate + Math.sign(dx || 1) * 1,
                  flight.endRotate,
                ],
                scale: [0.96, 1.04, 1.01, 1],
                opacity: [0, 1, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={isDraw ? {
                duration: flight.duration,
                delay: flight.delay,
                ease: [0.22, 0.68, 0.36, 1.0],
                times: [0, 0.55, 1],
              } : {
                duration: flight.duration,
                delay: flight.delay,
                ease: 'easeInOut',
                times: [0, 0.06, 0.86, 1],
              }}
            >
              <CardView
                cardId={flight.cardId}
                faceDown={flight.faceDown}
                size="lg"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
