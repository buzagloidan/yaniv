// Single source of truth for all Hebrew UI strings.
// No user-facing string should be hardcoded in components.

export const he = {
  // ── Auth ──────────────────────────────────────────────────
  auth: {
    title: 'יניב',
    subtitle: 'משחק קלפים מרובה שחקנים',
    nicknamePrompt: 'בחר כינוי כדי להמשיך ללובי',
    signingIn: 'מתחברים...',
    devMode: 'כניסה מהירה (פיתוח)',
    devName: 'שם תצוגה',
    devEnter: 'כניסה',
    error: 'ההתחברות נכשלה. אפשר לנסות שוב.',
  },

  // ── Lobby ─────────────────────────────────────────────────
  lobby: {
    title: 'לובי',
    greeting: (name: string) => `שלום, ${name}!`,
    createTable: 'יצירת שולחן',
    quickStartBots: 'משחק מהיר נגד בוטים',
    joinWithCode: 'הצטרפות עם קוד',
    settings: 'הגדרות',
    noTables: 'אין שולחנות פתוחים כרגע',
    loading: 'טוען...',
    players: (n: number, max: number) => `${n}/${max} שחקנים`,
    waiting: 'ממתין',
    inProgress: 'משחק בעיצומו',
    ranked: 'מדורג',
    casual: 'חופשי',
    join: 'הצטרפות',
    signOut: 'התנתקות',
  },

  // ── Create table modal ────────────────────────────────────
  createTable: {
    title: 'יצירת שולחן',
    threshold: 'סף יניב',
    pointsLimit: 'מגבלת נקודות',
    create: 'שחק',
    cancel: 'ביטול',
  },

  // ── Join table modal ──────────────────────────────────────
  joinTable: {
    title: 'הצטרפות לשולחן',
    codePlaceholder: 'קוד חדר (4 ספרות)',
    join: 'הצטרפות',
    cancel: 'ביטול',
    invalidCode: 'יש להזין קוד בן 4 ספרות',
    notFound: 'לא מצאנו שולחן עם הקוד הזה. אפשר ליצור אחד חדש בעצמך.',
    full: 'השולחן מלא',
    started: 'המשחק כבר התחיל',
    ended: 'השולחן הסתיים',
  },

  // ── Game ──────────────────────────────────────────────────
  game: {
    yourTurn: 'תורך!',
    waitingFor: (name: string) => `מחכה ל${name}...`,
    handTotal: (n: number) => `יד: ${n}`,
    cardsLeft: (n: number) => `${n} קלפים`,
    discard: 'השלך',
    drawFromDeck: 'שלוף מהחפיסה',
    drawFirst: 'שלוף ראשון',
    drawLast: 'שלוף אחרון',
    callYaniv: 'יניב!',
    yanivConfirm: 'לקרוא יניב?',
    yanivYes: 'כן, יניב!',
    yanivCancel: 'ביטול',
    chat: 'צ\'אט',
    chatPlaceholder: 'הודעה...',
    send: 'שלח',
    score: 'ניקוד',
    round: (n: number) => `סיבוב ${n}`,
    startGame: 'התחלת משחק',
    roomReady: 'החדר מוכן',
    waitingForPlayers: 'ממתין לשחקנים...',
    waitingForMorePlayers: 'ממתינים לעוד שחקנים שיצטרפו.',
    waitingForHostStart: (name: string) => `ממתינים ל${name} להתחיל את המשחק.`,
    hostCanStart: 'הינך המארח. אפשר להתחיל מתי שנוח.',
    playersInRoom: (count: number, max: number) => `${count}/${max} שחקנים בחדר`,
    roomCodeLabel: 'קוד חדר',
    openSeat: 'מקום פנוי',
    handOnStart: 'הקלפים יחולקו עם תחילת המשחק',
    hostLabel: 'המארח',
    loadingRoom: 'מכינים את השולחן... 🌴',
    leaveConfirm: 'לעזוב את השולחן?',
    leaveYes: 'עזיבת שולחן',
    leaveCancel: 'ביטול',
    leaving: 'עוזבים...',
    roomCode: (code: string) => `קוד: ${code}`,
    copyCode: 'העתק קוד',
    copied: 'הועתק!',
    shareOnWhatsApp: 'שתף ב-WhatsApp',
    shareInvite: (code: string, url: string) => `בואו לשחק יניב איתי! קוד החדר: ${code}\n${url}`,
    deckReshuffled: 'החפיסה הסתיימה — ערבוב מחדש!',
    turnTimer: (n: number) => `עוד ${n} שנ׳`,
    eliminated: 'הודח',
    spectating: 'צופה',
    disconnected: 'מנותק',
    reconnecting: 'מתחברים מחדש...',
    pausedTitle: 'המשחק הושהה',
    pauseAfterDisconnect: 'הבוטים ממתינים. לחיצה על המשך כדי להמשיך את המשחק.',
    pauseAfterTimeout: 'המשחק הושהה אחרי חוסר פעילות. לחיצה על המשך כדי לחזור לשולחן.',
    continueGame: 'המשך משחק',
  },

  // ── Round result overlay ──────────────────────────────────
  round: {
    yanivCalled: (name: string) => `${name} קרא יניב!`,
    assaf: (caller: string, assafer: string) => `אסף! ${assafer} הפיל את ${caller}`,
    yanivTag: 'יניב',
    assafTag: 'אסף',
    penalty: '+30 קנס',
    scoreReset: '🎉 ניקוד אופס לאפס!',
    eliminated: (name: string) => `${name} הודח/ה`,
    nextRound: 'הסיבוב הבא מתחיל...',
    nextRoundIn: (n: number) => `הסיבוב הבא מתחיל בעוד ${n} שנ׳`,
    pointsAdded: (n: number) => `+${n}`,
  },

  // ── Game over overlay ─────────────────────────────────────
  gameOver: {
    title: 'המשחק הסתיים',
    winner: (name: string) => `${name} ניצח/ה!`,
    youWon: 'ניצחת!',
    youLost: 'הפסדת',
    finalScores: 'תוצאות סופיות',
    playAgain: 'משחק נוסף',
    lobby: 'חזרה ללובי',
  },

  // ── הדבקה ────────────────────────────────────────────────
  hadabaka: {
    title: 'הדבקה!',
    prompt: (card: string) => `קיבלת ${card} — זרוק בחזרה?`,
    accept: 'זרוק בחזרה!',
    waiting: (name: string) => `ממתינים ל${name}...`,
  },

  // ── Errors ────────────────────────────────────────────────
  errors: {
    INVALID_MOVE: 'שילוב קלפים לא חוקי',
    NOT_YOUR_TURN: 'לא התורך שלך',
    WRONG_PHASE: 'פעולה לא חוקית כרגע',
    HAND_TOO_HIGH: 'הסכום גבוה מדי ליניב',
    INVALID_DRAW_SOURCE: 'לא ניתן לשלוף ממקור זה',
    CARDS_NOT_IN_HAND: 'הקלפים לא ביד שלך',
    SESSION_EXPIRED: 'פג תוקף הכניסה. צריך להתחבר שוב.',
    TABLE_FULL: 'השולחן מלא',
    TABLE_NOT_FOUND: 'שולחן לא נמצא',
    GAME_ALREADY_STARTED: 'המשחק כבר התחיל',
    GAME_PAUSED: 'המשחק מושהה בהמתנה לשחקן אנושי',
    NOT_HOST: 'רק למארח מותר להתחיל',
    requestFailed: 'לא הצלחנו להתחבר לשרת. אפשר לנסות שוב בעוד רגע.',
    connection: 'החיבור נותק. מנסה להתחבר מחדש...',
    unknown: 'שגיאה לא ידועה',
  } as Record<string, string>,

  // ── Card suits/ranks for accessibility ────────────────────
  suits: { S: 'עלה', H: 'לב', D: 'יהלום', C: 'תלתן' } as Record<string, string>,
  ranks: {
    A: 'אס', J: 'נסיך', Q: 'מלכה', K: 'מלך',
    joker: 'ג\'וקר',
  } as Record<string, string>,
} as const;
