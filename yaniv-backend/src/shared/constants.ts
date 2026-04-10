export const DEFAULTS = {
  YANIV_THRESHOLD: 7,
  MAX_PLAYERS: 4,
  MIN_PLAYERS: 2,
  // Players are eliminated if they exceed this score; multiples of RESET_SCORE_AT reset to 0
  SCORE_LIMIT: 200,
  // Every multiple of this value triggers a score reset to 0 (e.g. 50, 100, 150, 200 → 0)
  RESET_SCORE_AT: 50,
  PENALTY_ASSAF: 30,
  TURN_TIMEOUT_SECONDS: 15,
  INITIAL_CARD_COUNT: 5,
  RECONNECT_WINDOW_MS: 30_000,
  BETWEEN_ROUNDS_DELAY_MS: 6_000,
  GAME_OVER_LINGER_MS: 60_000,
  MAX_CHAT_LENGTH: 200,
  // After this many turn timeouts in a single round, the player is eliminated
  MAX_TIMEOUT_COUNT: 2,
  // Room codes
  ROOM_CODE_MIN: 1000,
  ROOM_CODE_MAX: 9999,
  // Session KV
  SESSION_TTL_SECONDS: 86_400,
  WS_TICKET_TTL_SECONDS: 60,
  // Bot players
  BOT_THINK_MS: 1_400,           // delay before bot acts (feels natural)
  // Window (ms) for a player to accept a הדבקה (same-rank deck draw) before auto-decline
  HADABAKA_WINDOW_MS: 2_000,
  BOT_NAMES: [
    'נועם 🤖', 'יעל 🤖', 'עידו 🤖', 'תמר 🤖', 'איתן 🤖', 'שירה 🤖', 'דניאל 🤖', 'מאיה 🤖',
    'עומר 🤖', 'ליאור 🤖', 'רון 🤖', 'נועה 🤖', 'יונתן 🤖', 'מיכל 🤖', 'אלון 🤖', 'רותם 🤖',
    'אריאל 🤖', 'גל 🤖', 'שקד 🤖', 'תום 🤖', 'אביגיל 🤖', 'דביר 🤖', 'עדן 🤖', 'רועי 🤖',
    'סיון 🤖', 'עומרי 🤖', 'ליה 🤖', 'עדי 🤖', 'אופיר 🤖', 'לירון 🤖', 'נטע 🤖', 'עמית 🤖',
    'יובל 🤖', 'טל 🤖', 'הדר 🤖', 'אלמוג 🤖', 'בר 🤖', 'גיא 🤖', 'נעמה 🤖', 'דפנה 🤖',
    'אלעד 🤖', 'שי 🤖', 'קורל 🤖', 'יפתח 🤖', 'זיו 🤖', 'אייל 🤖', 'רז 🤖', 'תהל 🤖', 'מור 🤖',
  ] as readonly string[],
  // How long after game_over before the table auto-resets for a new game
  TABLE_RESET_DELAY_MS: 15_000,
} as const;
