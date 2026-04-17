import { motion, AnimatePresence } from 'framer-motion';
import { useLangStore } from '../../store/langStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="font-bold mb-1" style={{ color: '#0C4A6E', fontFamily: 'Syne, sans-serif' }}>
        {title}
      </h3>
      <div className="text-sm leading-relaxed" style={{ color: '#3D2B1F' }}>
        {children}
      </div>
    </div>
  );
}

export function PrivacyModal({ open, onClose }: Props) {
  const lang = useLangStore((s) => s.lang);
  const isEn = lang === 'en';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            style={{ background: '#FFFBF0', border: '1px solid rgba(226,201,154,0.7)', maxHeight: '88vh' }}
            initial={{ scale: 0.9, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 24 }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between shrink-0"
              style={{ background: 'linear-gradient(135deg, #0891B2, #0C4A6E)' }}
            >
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {isEn ? 'Privacy Policy 🔒' : 'מדיניות פרטיות 🔒'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="overflow-y-auto px-5 py-5"
              dir={isEn ? 'ltr' : 'rtl'}
              style={{ textAlign: isEn ? 'left' : 'right' }}
            >
              <p className="text-xs mb-4" style={{ color: '#7C6A50' }}>
                {isEn ? 'Last updated: January 2025' : 'עודכן לאחרונה: ינואר 2025'}
              </p>

              {isEn ? (
                <>
                  <Block title="1. Information We Collect">
                    <p>
                      We collect only the information necessary to operate the game:
                    </p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><strong>Display name</strong> — chosen by you at sign-in.</li>
                      <li><strong>Session token</strong> — a temporary token stored locally to keep you signed in.</li>
                      <li><strong>Game activity</strong> — moves, scores, and chat messages within active game sessions.</li>
                    </ul>
                  </Block>

                  <Block title="2. How We Use Your Information">
                    <p>Your information is used solely to:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Identify you within a game session.</li>
                      <li>Display your name and score to other players at the same table.</li>
                      <li>Deliver chat messages you choose to send.</li>
                    </ul>
                    <p className="mt-2">We do <strong>not</strong> sell, share, or use your data for advertising.</p>
                  </Block>

                  <Block title="3. Data Retention">
                    <p>
                      Session tokens expire after 24 hours. Game session data (scores, hands, chat) is held in memory only for the duration of the game and is not persisted long-term.
                    </p>
                  </Block>

                  <Block title="4. Third-Party Services">
                    <p>
                      The game is hosted on Cloudflare infrastructure. Cloudflare may process traffic metadata (IP addresses, request logs) in accordance with{' '}
                      <span style={{ color: '#0891B2' }}>Cloudflare's Privacy Policy</span>.
                      We use PostHog for product analytics to understand gameplay flows and improve the experience.
                      We do not use advertising SDKs or sell your data.
                    </p>
                  </Block>

                  <Block title="5. Children">
                    <p>
                      This service is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
                    </p>
                  </Block>

                  <Block title="6. Your Rights">
                    <p>
                      You may request deletion of your account and associated data at any time by contacting us. Since we store minimal data, deletion is straightforward and immediate.
                    </p>
                  </Block>

                  <Block title="7. Contact">
                    <p>
                      Questions? Reach us at <span style={{ color: '#0891B2' }}>support@yaniv.games</span>.
                    </p>
                  </Block>
                </>
              ) : (
                <>
                  <Block title="1. מידע שאנו אוספים">
                    <p>
                      אנו אוספים רק את המידע הדרוש להפעלת המשחק:
                    </p>
                    <ul className="list-disc list-inside mt-1 space-y-1 mr-2">
                      <li><strong>שם תצוגה</strong> — הנבחר על ידך בעת הכניסה.</li>
                      <li><strong>טוקן סשן</strong> — טוקן זמני המאוחסן מקומית לשמירת הכניסה.</li>
                      <li><strong>פעילות משחק</strong> — מהלכים, ניקוד והודעות צ'אט בתוך סשן המשחק.</li>
                    </ul>
                  </Block>

                  <Block title="2. שימוש במידע">
                    <p>המידע שלך משמש אך ורק כדי:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1 mr-2">
                      <li>לזהות אותך בתוך סשן המשחק.</li>
                      <li>להציג את שמך וניקודך לשחקנים אחרים באותו שולחן.</li>
                      <li>להעביר הודעות צ'אט שתבחר לשלוח.</li>
                    </ul>
                    <p className="mt-2">אנו <strong>לא</strong> מוכרים, משתפים או משתמשים בנתונים שלך לפרסום.</p>
                  </Block>

                  <Block title="3. שמירת נתונים">
                    <p>
                      טוקני סשן פגים לאחר 24 שעות. נתוני סשן משחק (ניקוד, קלפים, צ'אט) מוחזקים בזיכרון בלבד למשך המשחק ואינם נשמרים לטווח ארוך.
                    </p>
                  </Block>

                  <Block title="4. שירותי צד שלישי">
                    <p>
                      המשחק מתארח על תשתית Cloudflare. Cloudflare עשויה לעבד מטא-דאטה של תנועה בהתאם למדיניות הפרטיות שלה. אנו משתמשים ב-PostHog לצורכי אנליטיקת מוצר כדי להבין את זרימות המשחק ולשפר את החוויה. איננו משתמשים ב-SDK לפרסום ואיננו מוכרים את הנתונים שלך.
                    </p>
                  </Block>

                  <Block title="5. קטינים">
                    <p>
                      שירות זה אינו מיועד לילדים מתחת לגיל 13. אם אתה מאמין שילד סיפק לנו מידע אישי, צור עמנו קשר ונמחקו אותו מיד.
                    </p>
                  </Block>

                  <Block title="6. הזכויות שלך">
                    <p>
                      תוכל לבקש מחיקת חשבונך ונתוניך בכל עת על ידי פנייה אלינו. מאחר שאנו שומרים מינימום נתונים, המחיקה מהירה ופשוטה.
                    </p>
                  </Block>

                  <Block title="7. יצירת קשר">
                    <p>
                      שאלות? פנה אלינו בכתובת <span style={{ color: '#0891B2' }}>support@yaniv.games</span>.
                    </p>
                  </Block>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
