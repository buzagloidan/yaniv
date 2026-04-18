interface RouteMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  canonical: string;
}

const LOBBY_META: RouteMeta = {
  title: 'יניב | משחק קלפים ישראלי אונליין — חינמי ומולטיפלייר',
  description:
    'שחקו יניב אונליין עם חברים או מול בוטים — חינמי, ישר מהדפדפן, ללא הורדה. משחק הקלפים הישראלי האהוב עם מולטיפלייר בזמן אמת.',
  ogTitle: 'יניב | משחק קלפים ישראלי אונליין — חינמי ומולטיפלייר',
  ogDescription:
    'שחקו יניב אונליין עם חברים או מול בוטים — חינמי, ישר מהדפדפן, ללא הורדה. משחק הקלפים הישראלי האהוב עם מולטיפלייר בזמן אמת.',
  canonical: 'https://yaniv.games/',
};

const GAME_META: RouteMeta = {
  title: 'הצטרף למשחק יניב! | יניב אונליין',
  description: 'הוזמנת למשחק יניב! לחץ כדי להצטרף ולשחק בזמן אמת מהדפדפן — ללא הורדה, חינמי לחלוטין.',
  ogTitle: 'הצטרף למשחק יניב! 🌴',
  ogDescription: 'הוזמנת למשחק יניב! לחץ כדי להצטרף ולשחק בזמן אמת מהדפדפן — ללא הורדה, חינמי לחלוטין.',
  // Canonicalize game rooms to the homepage — they're ephemeral
  canonical: 'https://yaniv.games/',
};

function getRouteMeta(pathname: string): RouteMeta {
  if (pathname.startsWith('/game/')) return GAME_META;
  return LOBBY_META;
}

function rewriteHead(response: Response, meta: RouteMeta): Response {
  return new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute('content', meta.description);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute('content', meta.ogTitle);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute('content', meta.ogDescription);
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute('content', meta.canonical);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute('href', meta.canonical);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        el.setAttribute('content', meta.ogTitle);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(el) {
        el.setAttribute('content', meta.ogDescription);
      },
    })
    .transform(response);
}

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const response = await context.next();

  // Only rewrite HTML responses — skip assets (JS, CSS, images, etc.)
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return response;

  // Lobby meta is already baked into index.html; only override for other routes
  const pathname = url.pathname;
  if (pathname === '/' || pathname === '') return response;

  const meta = getRouteMeta(pathname);
  return rewriteHead(response, meta);
};
