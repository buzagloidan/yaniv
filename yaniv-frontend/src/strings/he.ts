// Single source of truth for all Hebrew UI strings.
// No user-facing string should be hardcoded in components.

export const he = {
  // ── Auth ──────────────────────────────────────────────────
  auth: {
    title: 'יניב',
    subtitle: 'משחק קלפים מרובה שחקנים',
    nicknamePrompt: 'בחר כינוי כדי להמשיך ללובי',
    signInWithApple: 'התחבר עם Apple',
    signingIn: 'מתחבר...',
    devMode: 'כניסה מהירה (פיתוח)',
    devName: 'שם תצוגה',
    devEnter: 'כניסה',
    error: 'ההתחברות נכשלה. נסה שוב.',
  },

  // ── Lobby ─────────────────────────────────────────────────
  lobby: {
    title: 'לובי',
    greeting: (name: string) => `שלום, ${name}!`,
    createTable: 'צור שולחן',
    quickStartBots: 'משחק מהיר נגד בוטים',
    joinWithCode: 'הצטרף עם קוד',
    settings: 'הגדרות',
    noTables: 'אין שולחנות פתוחים כרגע',
    loading: 'טוען...',
    players: (n: number, max: number) => `${n}/${max} שחקנים`,
    waiting: 'ממתין',
    inProgress: 'משחק בעיצומו',
    ranked: 'מדורג',
    casual: 'חופשי',
    join: 'הצטרף',
    signOut: 'התנתק',
  },

  // ── Create table modal ────────────────────────────────────
  createTable: {
    title: 'צור שולחן',
    maxPlayers: 'שחקנים',
    threshold: 'סף יניב',
    pointsLimit: 'מגבלת נקודות',
    create: 'שחק',
    cancel: 'ביטול',
  },

  // ── Join table modal ──────────────────────────────────────
  joinTable: {
    title: 'הצטרף לשולחן',
    codePlaceholder: 'קוד חדר (4 ספרות)',
    join: 'הצטרף',
    cancel: 'ביטול',
    invalidCode: 'יש להזין קוד בן 4 ספרות',
    notFound: 'לא מצאנו שולחן עם הקוד הזה. אפשר ליצור אחד חדש בעצמך.',
    full: 'השולחן מלא',
    started: 'המשחק כבר התחיל',
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
    startGame: 'התחל משחק',
    roomReady: 'החדר מוכן',
    waitingForPlayers: 'ממתין לשחקנים...',
    waitingForMorePlayers: 'ממתינים לעוד שחקנים שיצטרפו.',
    waitingForHostStart: (name: string) => `מחכים ש-${name} יתחיל את המשחק.`,
    hostCanStart: 'אתה המארח. התחל מתי שנוח לך.',
    playersInRoom: (count: number, max: number) => `${count}/${max} שחקנים בחדר`,
    roomCodeLabel: 'קוד חדר',
    openSeat: 'מקום פנוי',
    handOnStart: 'הקלפים יחולקו ברגע שהמארח יתחיל',
    hostLabel: 'המארח',
    loadingRoom: 'מכינים את השולחן... 🌴',
    leaveConfirm: 'בטוח שברצונך לעזוב את השולחן?',
    leaveYes: 'כן, עזוב',
    leaveCancel: 'ביטול',
    leaving: 'עוזב...',
    roomCode: (code: string) => `קוד: ${code}`,
    copyCode: 'העתק קוד',
    copied: 'הועתק!',
    shareOnWhatsApp: 'שתף ב-WhatsApp',
    shareInvite: (code: string, url: string) => `בואו לשחק יניב איתי! קוד החדר: ${code}\n${url}`,
    turnTimer: (n: number) => `עוד ${n} שנ׳`,
    eliminated: 'הודח',
    spectating: 'צופה',
    disconnected: 'מנותק',
    reconnecting: 'מתחבר מחדש...',
    pausedTitle: 'המשחק הושהה',
    pauseAfterDisconnect: 'הבוטים מחכים שתחזור. לחץ על המשך כדי להמשיך את המשחק.',
    pauseAfterTimeout: 'המשחק הושהה אחרי חוסר פעילות. לחץ על המשך כדי לחזור לשולחן.',
    continueGame: 'המשך משחק',
  },

  // ── Round result overlay ──────────────────────────────────
  round: {
    yanivCalled: (name: string) => `${name} קרא יניב!`,
    assaf: (caller: string, assafer: string) => `אסף! ${assafer} הפיל את ${caller}`,
    penalty: '+30 קנס',
    scoreReset: '🎉 ניקוד אופס לאפס!',
    eliminated: (name: string) => `${name} הודח`,
    nextRound: 'הסיבוב הבא מתחיל...',
    nextRoundIn: (n: number) => `הסיבוב הבא מתחיל בעוד ${n} שנ׳`,
    pointsAdded: (n: number) => `+${n}`,
  },

  // ── Game over overlay ─────────────────────────────────────
  gameOver: {
    title: 'המשחק הסתיים',
    winner: (name: string) => `${name} ניצח!`,
    youWon: 'ניצחת!',
    youLost: 'הפסדת',
    finalScores: 'תוצאות סופיות',
    playAgain: 'שחק שוב',
    lobby: 'חזור ללובי',
  },

  // ── הדבקה ────────────────────────────────────────────────
  hadabaka: {
    title: 'הדבקה!',
    prompt: (card: string) => `קיבלת ${card} — זרוק בחזרה?`,
    accept: 'זרוק בחזרה!',
    waiting: (name: string) => `${name} מחליט על הדבקה...`,
  },

  // ── Errors ────────────────────────────────────────────────
  errors: {
    INVALID_MOVE: 'שילוב קלפים לא חוקי',
    NOT_YOUR_TURN: 'לא התורך שלך',
    WRONG_PHASE: 'פעולה לא חוקית כרגע',
    HAND_TOO_HIGH: 'הסכום גבוה מדי ליניב',
    INVALID_DRAW_SOURCE: 'לא ניתן לשלוף ממקור זה',
    CARDS_NOT_IN_HAND: 'הקלפים לא ביד שלך',
    SESSION_EXPIRED: 'פג תוקף הכניסה',
    TABLE_FULL: 'השולחן מלא',
    TABLE_NOT_FOUND: 'שולחן לא נמצא',
    GAME_ALREADY_STARTED: 'המשחק כבר התחיל',
    GAME_PAUSED: 'המשחק מושהה עד ששחקן אנושי ימשיך',
    NOT_HOST: 'רק המארח יכול להתחיל',
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
