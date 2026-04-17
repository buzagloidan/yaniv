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
  sourceKind?: 'deck' | 'discard';
}

function discardPreviewCardPoint(
  discardCenter: Point,
  sourceCards: CardId[],
  cardId: CardId,
): Point {
  const index = sourceCards.findIndex((candidate) => candidate === cardId);
  const safeIndex = index === -1 ? sourceCards.length - 1 : index;
  const centerOffset = safeIndex - (sourceCards.length - 1) / 2;

  return {
    x: discardCenter.x + spreadOffset(safeIndex, sourceCards.length, 26),
    y: discardCenter.y + Math.abs(centerOffset) * 3 - 8,
  };
}

interface Props {
  myUserId: string | null;
  deckRef: { current: HTMLDivElement | null };
  discardRef: { current: HTMLDivElement | null };
  myHandRef: { current: HTMLDivElement | null };
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
  publicDrawnCard: CardId | null,
  discardSourceSetBeforeDraw: CardId[] | null,
): FlightCard[] {
  if (!drawnSource) return [];

  const discardCenter = centerPoint(discardEl);
  const source =
    drawnSource === 'deck'
      ? centerPoint(deckEl)
      : discardCenter && publicDrawnCard && discardSourceSetBeforeDraw && discardSourceSetBeforeDraw.length > 0
        ? discardPreviewCardPoint(discardCenter, discardSourceSetBeforeDraw, publicDrawnCard)
        : discardCenter;
  const target =
    (actingUserId === myUserId && myNewCard ? centerPoint(myCardEls[myNewCard]) : null) ??
    centerPoint(targetForDraw(actingUserId, myUserId, myHandEl, opponentHandEls));
  if (!source || !target) return [];

  const faceDown = !(actingUserId === myUserId && myNewCard) && !publicDrawnCard;
  const sourceKind = drawnSource === 'deck' ? 'deck' : 'discard';

  return [{
    id: `draw-${seq}-${actingUserId}`,
    cardId: myNewCard ?? publicDrawnCard ?? placeholderCardId(),
    faceDown,
    from: clonePoint(source),
    to: clonePoint(target),
    startRotate: drawnSource === 'deck' ? -8 : 6,
    endRotate: actingUserId === myUserId ? 0 : -3,
    arcLift: 0,
    delay: 0,
    duration: 0.42,
    action: 'draw' as const,
    sourceKind,
  }];
}

export function CardFlightLayer({
  myUserId,
  deckRef,
  discardRef,
  myHandRef,
  myCardEls,
  opponentHandEls,
  pendingMyDiscardAnchorsRef,
}: Props) {
  const lastTurnAnimation = useGameStore((s) => s.lastTurnAnimation);
  const [flights, setFlights] = useState<FlightCard[]>([]);

  useEffect(() => {
    if (!lastTurnAnimation) return;

    const frame = window.requestAnimationFrame(() => {
      // Read .current inside RAF so we get the post-commit DOM elements,
      // not stale values that may have been captured during render.
      const deckEl = deckRef.current;
      const discardEl = discardRef.current;
      const myHandEl = myHandRef.current;

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
              lastTurnAnimation.publicDrawnCard,
              lastTurnAnimation.discardSourceSetBeforeDraw,
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
    discardRef,
    deckRef,
    lastTurnAnimation,
    myHandRef,
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
          const isDiscardDraw = isDraw && flight.sourceKind === 'discard';

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
                scale: isDiscardDraw ? 1.02 : 1.08,
                opacity: 1,
              } : {
                x: 0,
                y: 0,
                rotate: flight.startRotate,
                scale: 0.96,
                opacity: 0,
              }}
              animate={isDraw ? {
                x: isDiscardDraw ? [0, dx * 0.16, dx * 0.64, dx] : [0, dx * 0.6, dx],
                y: isDiscardDraw ? [0, -28, dy * 0.52, dy] : [0, dy * 0.6, dy],
                rotate: isDiscardDraw
                  ? [
                      flight.startRotate,
                      flight.startRotate - Math.sign(dx || 1) * 8,
                      (flight.startRotate + flight.endRotate) / 2,
                      flight.endRotate,
                    ]
                  : [flight.startRotate, (flight.startRotate + flight.endRotate) / 2, flight.endRotate],
                scale: isDiscardDraw ? [1.02, 1.1, 1.04, 1] : [1.08, 1.02, 1],
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
                times: isDiscardDraw ? [0, 0.18, 0.72, 1] : [0, 0.55, 1],
              } : {
                duration: flight.duration,
                delay: flight.delay,
                ease: 'easeInOut',
                times: [0, 0.06, 0.86, 1],
              }}
            >
              <div
                style={{
                  filter: isDiscardDraw ? 'drop-shadow(0 0 18px rgba(242,100,25,0.42))' : 'none',
                }}
              >
                <CardView
                  cardId={flight.cardId}
                  faceDown={flight.faceDown}
                  size="lg"
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
