import { motion, AnimatePresence } from 'framer-motion';
import { useLangStore } from '../../store/langStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-bold mb-2" style={{ color: '#0C4A6E', fontFamily: 'Syne, sans-serif' }}>
        {title}
      </h3>
      <div className="text-sm leading-relaxed" style={{ color: '#3D2B1F' }}>
        {children}
      </div>
    </div>
  );
}

function CardTable({ rows }: { rows: { card: string; value: string }[] }) {
  return (
    <table className="w-full text-sm rounded-xl overflow-hidden mb-1" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'linear-gradient(90deg,#0891B2,#0E7490)', color: 'white' }}>
          <th className="py-1.5 px-3 text-right font-semibold">קלף / Card</th>
          <th className="py-1.5 px-3 text-right font-semibold">ערך / Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.card} style={{ background: i % 2 === 0 ? '#F0F9FF' : '#E0F2FE' }}>
            <td className="py-1 px-3" style={{ color: '#0C4A6E' }}>{r.card}</td>
            <td className="py-1 px-3 font-bold" style={{ color: '#0891B2' }}>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const CARD_ROWS = [
  { card: "ג'וקר / Joker", value: '0' },
  { card: 'אס / Ace', value: '1' },
  { card: 'קלף מספרי / Number card (2–10)', value: 'face value' },
  { card: 'נסיך, מלכה, מלך / Jack, Queen, King (J, Q, K)', value: '10' },
];

function HebrewContent() {
  return (
    <>
      <Section title="הקלפים">
        <p className="mb-2">
          המשחק משוחק עם 54 קלפים — חבילה מלאה כולל 2 ג'וקרים.
        </p>
        <CardTable rows={CARD_ROWS} />
      </Section>

      <Section title="מטרת המשחק">
        <p>
          לצבור את מספר הנקודות <strong>הנמוך ביותר</strong>.
          כל סיבוב מסתיים כשאחד השחקנים מכריז <strong>&quot;יניב&quot;</strong> — כלומר נשארו בידיו קלפים בסכום של <strong>ספף המשחק ומטה</strong> (ברירת מחדל: 7).
          לשחקן המנצח לא מתווספות נקודות; לשאר מוסיפים את ערך הקלפים שנותרו בידם.
        </p>
      </Section>

      <Section title="מהלך הסיבוב">
        <p className="mb-2">
          בתחילת כל סיבוב מקבל כל שחקן <strong>5 קלפים</strong>. שאר הקלפים הם הקופה; הקלף הראשון מונח גלוי.
          המשחק מתקדם בכיוון השעון.
        </p>
        <ul className="list-disc list-inside space-y-1 mr-2">
          <li>להכריז <strong>יניב</strong> אם סכום ידו ≤ לספף.</li>
          <li>להשליך קלף אחד או יותר ולקחת קלף מהקופה הסגורה או מהערימה הגלויה.</li>
        </ul>
      </Section>

      <Section title="השלכת מספר קלפים">
        <p className="mb-2">מותר להשליך יותר מקלף אחד:</p>
        <ul className="list-disc list-inside space-y-1 mr-2">
          <li><strong>סדרה עולה</strong> של 3+ קלפים מאותה צורה — למשל ♥6‑♥7‑♥8. ג'וקר יכול להשלים סדרה.</li>
          <li><strong>זוג / שלישייה / ריבעייה</strong> — קלפים זהים (ערך זהה), למשל 9♠ 9♥ 9♦.</li>
        </ul>
        <p className="mt-2">
          לאחר ההשלכה לוקחים <strong>קלף אחד בלבד</strong>.
          מהערימה הגלויה ניתן לקחת רק את הקלפים הקיצוניים (ראשון או אחרון בסדרה).
        </p>
      </Section>

      <Section title="הכרזת יניב ואסף">
        <ul className="list-disc list-inside space-y-1 mr-2">
          <li>אם סכום המכריז הוא הנמוך — הוא מנצח ואינו מקבל נקודות.</li>
          <li>
            אם לשחקן אחר יש סכום <strong>קטן או שווה</strong> למכריז — <strong>אסף!</strong>
            המכריז מקבל <strong>30 נקודות עונשין</strong>.
          </li>
        </ul>
      </Section>

      <Section title="ניקוד מיוחד">
        <ul className="list-disc list-inside space-y-1 mr-2">
          <li>
            <strong>הגעה לסף הניקוד בדיוק</strong> — הניקוד מאופס לחצי מהסף.
          </li>
          <li>
            <strong>מעבר לסף</strong> — השחקן מודח מהמשחק.
          </li>
        </ul>
      </Section>

      <Section title="ניצחון">
        <p>
          המשחק מסתיים כשנשאר שחקן אחד בלבד — הוא המנצח. הסף נקבע בעת יצירת השולחן (50 / 100 / 200 נקודות).
        </p>
      </Section>
    </>
  );
}

function EnglishContent() {
  return (
    <>
      <Section title="The Cards">
        <p className="mb-2">
          The game is played with a standard 54-card deck including 2 Jokers.
        </p>
        <CardTable rows={CARD_ROWS} />
      </Section>

      <Section title="Objective">
        <p>
          Have the <strong>lowest score</strong> when the game ends.
          Each round ends when a player calls <strong>&quot;Yaniv&quot;</strong> — they must hold cards totalling no more than the <strong>Yaniv threshold</strong> (default: 7).
          The caller scores 0; all other players add their remaining card values to their total.
        </p>
      </Section>

      <Section title="Taking a Turn">
        <p className="mb-2">
          Each player starts with <strong>5 cards</strong>. The rest form the draw pile; the top card is placed face-up.
          Play proceeds clockwise.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Call <strong>Yaniv</strong> if your hand total ≤ the threshold.</li>
          <li>Discard one or more valid cards, then draw one card from the deck or discard pile.</li>
        </ul>
      </Section>

      <Section title="Valid Discards">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Run</strong> — 3 or more consecutive cards of the same suit (e.g. ♥6‑♥7‑♥8). A Joker can complete a run.</li>
          <li><strong>Pair / Three / Four of a Kind</strong> — 2–4 cards of the same rank (e.g. 9♠ 9♥ 9♦).</li>
        </ul>
        <p className="mt-2">
          After discarding you draw <strong>exactly one card</strong>.
          From the discard pile you may only take the top or bottom card of the last set played.
        </p>
      </Section>

      <Section title="Yaniv & Assaf">
        <ul className="list-disc list-inside space-y-1">
          <li>If the caller has the lowest total — they win the round and score 0.</li>
          <li>
            If another player has a total <strong>equal to or lower</strong> than the caller — <strong>Assaf!</strong>
            The caller receives a <strong>+30 point penalty</strong> instead.
          </li>
        </ul>
      </Section>

      <Section title="Special Scoring">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Hitting the limit exactly</strong> — your score resets to half the limit.</li>
          <li><strong>Exceeding the limit</strong> — you are eliminated from the game.</li>
        </ul>
      </Section>

      <Section title="Winning">
        <p>
          The last player standing wins. The points limit is set when creating the table (50 / 100 / 200 points).
        </p>
      </Section>
    </>
  );
}

export function RulesModal({ open, onClose }: Props) {
  const lang = useLangStore((s) => s.lang);
  const isEn = lang === 'en';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full mx-4 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              maxWidth: 480,
              maxHeight: '88vh',
              background: '#FFFBF0',
              border: '1px solid rgba(226,201,154,0.7)',
            }}
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 24 }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ background: 'linear-gradient(135deg,#0891B2,#0C4A6E)' }}
            >
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {isEn ? 'Game Rules 🌴' : 'חוקי המשחק 🌴'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                ✕
              </button>
            </div>

            <div
              className="overflow-y-auto px-5 py-4"
              dir={isEn ? 'ltr' : 'rtl'}
              style={{ textAlign: isEn ? 'left' : 'right' }}
            >
              {isEn ? <EnglishContent /> : <HebrewContent />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
