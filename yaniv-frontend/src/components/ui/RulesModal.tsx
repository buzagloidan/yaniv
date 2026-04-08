import { motion, AnimatePresence } from 'framer-motion';

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

function CardTable() {
  const rows = [
    { card: "ג'וקר", value: '0' },
    { card: 'אס', value: '1' },
    { card: 'קלף מספרי (2–10)', value: 'ערך הקלף' },
    { card: 'נסיך (J)', value: '11' },
    { card: "מלכה (Q)", value: '12' },
    { card: 'מלך (K)', value: '13' },
  ];
  return (
    <table className="w-full text-sm rounded-xl overflow-hidden mb-1" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'linear-gradient(90deg,#0891B2,#0E7490)', color: 'white' }}>
          <th className="py-1.5 px-3 text-right font-semibold">קלף</th>
          <th className="py-1.5 px-3 text-right font-semibold">ערך</th>
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

export function RulesModal({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Panel */}
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
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ background: 'linear-gradient(135deg,#0891B2,#0C4A6E)' }}
            >
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                חוקי המשחק 🌴
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-5 py-4 text-right" dir="rtl">

              <Section title="הקלפים">
                <p className="mb-2">
                  המשחק משוחק עם 54 קלפים — חבילה מלאה כולל 2 ג'וקרים.
                  כאשר ישנם מעל 4 שחקנים, נעשה שימוש בשתי חבילות קלפים.
                </p>
                <CardTable />
              </Section>

              <Section title="מטרת המשחק">
                <p>
                  לצבור את מספר הנקודות <strong>הנמוך ביותר</strong>.
                  כל סיבוב מסתיים כשאחד השחקנים מכריז <strong>&quot;יניב&quot;</strong> — כלומר נשארו בידיו קלפים בערך של <strong>7 ומטה</strong> (גרסה מחמירה: 5 ומטה).
                  לשחקן המנצח לא מתווספות נקודות; לשאר מוסיפים את ערך הקלפים שנותרו בידם.
                </p>
              </Section>

              <Section title="מהלך הסיבוב">
                <p className="mb-2">
                  בתחילת כל סיבוב מקבל כל שחקן <strong>7 קלפים</strong>. שאר הקלפים הם הקופה; הקלף הראשון מונח גלוי.
                  המשחק מתקדם בכיוון השעון.
                </p>
                <p className="mb-2">
                  בכל תור השחקן יכול:
                </p>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>להכריז <strong>יניב</strong> אם סכום ידו ≤ 7.</li>
                  <li>להשליך קלף אחד או יותר ולקחת קלף מהקופה הסגורה או מהערימה הגלויה.</li>
                </ul>
              </Section>

              <Section title="השלכת מספר קלפים">
                <p className="mb-2">מותר להשליך יותר מקלף אחד במקרים הבאים:</p>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li><strong>סדרה עולה</strong> של 3+ קלפים מאותה צורה — למשל ♥6, ♥7, ♥8. ג'וקר יכול להשלים סדרה.</li>
                  <li><strong>זוג / שלישייה / ריבעייה</strong> — קלפים זהים, למשל 9♠ 9♥ 9♦.</li>
                  <li><strong>סדרה של 5</strong> בסדר עולה גם משתי צורות שונות (בגרסת 7 קלפים).</li>
                </ul>
                <p className="mt-2">
                  בכל מקרה, לאחר ההשלכה לוקחים <strong>קלף אחד בלבד</strong>.
                  כאשר ניתן לקחת מהערימה הגלויה, מותר לקחת רק את הקלפים הקיצוניים שהושלכו (למשל מסדרה 7‑8‑9 ניתן לקחת 7 או 9 בלבד).
                </p>
              </Section>

              <Section title="הכרזת יניב ואסף">
                <p className="mb-2">
                  כאשר שחקן מכריז <strong>יניב</strong>, כולם חושפים את ידיהם.
                </p>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>אם סכומו של המכריז הוא <strong>הנמוך ביותר</strong> — הוא מנצח ואינו מקבל נקודות.</li>
                  <li>
                    אם לשחקן אחר יש סכום <strong>קטן או שווה</strong> למכריז, הוא מכריז <strong>אסף</strong>:
                    מכריז היניב מקבל <strong>30 נקודות עונשין</strong>, ומנצח הסיבוב הוא בעל הסכום הנמוך ביותר.
                  </li>
                </ul>
              </Section>

              <Section title="ניקוד מיוחד">
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>
                    <strong>כפולות של 50 (100, 150, 200…)</strong> — מנכים <strong>50 נקודות</strong> מניקוד השחקן. מהלך זה נקרא לעיתים ״ויקטור״ כשמגיעים אליו בכוונה.
                  </li>
                  <li>
                    <strong>דאבל אסף (עופר)</strong> — שחקן שמוכרז נגדו אסף פעמיים מודח מיידית.
                  </li>
                </ul>
              </Section>

              <Section title="ניצחון במשחק">
                <p className="mb-2">הגרסה הנפוצה: קובעים ערך סף. כשחקן עובר אותו — המשחק מסתיים, והמנצח הוא בעל הניקוד <strong>הנמוך ביותר</strong>.</p>
                <p>
                  גרסאות נוספות: שחקן שעובר את הסף יוצא, ממשיכים עד שנשאר אחד; קובעים מספר סיבובים קבוע; או קובעים שעת סיום.
                </p>
              </Section>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
