const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const cache = new NodeCache({ stdTTL: 60 });
const xmlParser = new xml2js.Parser({ explicitArray: true, ignoreAttrs: false });

app.use(cors());
// GitHub Pages에서는 루트의 index.html을 서빙; 로컬도 동일하게 루트 서빙
app.use(express.static('.', { index: 'index.html' }));

const NEWS_API_KEY = process.env.NEWS_API_KEY || '4412f8e73cea40a18e35d76cb09cb176';
const PORT = process.env.PORT || 3000;

// ─── 뉴스 관련 키워드 ───────────────────────────────────────────────────────
const WAR_KEYWORDS = [
  'iran', 'iranian', 'tehran', 'khamenei', 'irgc', 'persian',
  'pentagon', 'u.s. military', 'us military', 'american forces',
  'missile', 'nuclear', 'airstrike', 'air strike', 'drone strike',
  'war', 'conflict', 'escalat', 'sanction', 'oil embargo',
  'strait of hormuz', 'hormuz', 'middle east', 'gulf',
  'israel', 'hamas', 'hezbollah', 'proxy',
  'trump', 'rubio', 'austin', 'blinken',
  'weapon', 'military strike', 'retaliat',
];

// ─── RSS 뉴스 소스 ───────────────────────────────────────────────────────────
const NEWS_SOURCES = [
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/worldNews', icon: '📡' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', icon: '🌐' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', icon: '📺' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', icon: '🗞️' },
  { name: 'AP News', url: 'https://feeds.apnews.com/rss/apf-topnews', icon: '📰' },
  { name: 'Middle East Eye', url: 'https://www.middleeasteye.net/rss', icon: '🌙' },
];

// ─── 데모 뉴스 데이터 (API 키 미설정 또는 RSS 실패 시) ─────────────────────
const DEMO_NEWS = [
  {
    title: 'Trump Issues 48-Hour Ultimatum to Iran Over Nuclear Program Expansion',
    description: 'President Trump gave Iran 48 hours to halt uranium enrichment above 60% purity, warning of "unprecedented military consequences" if demands are not met. National Security Advisor confirmed all military assets in the region are on standby.',
    link: '#', source: 'Reuters', icon: '📡', urgent: true,
    timestamp: Date.now() - 1000 * 60 * 15, pubDate: new Date(Date.now() - 1000 * 60 * 15).toUTCString(),
  },
  {
    title: 'US Carrier Strike Group USS Gerald R. Ford Moves Into Persian Gulf',
    description: 'The Pentagon confirmed deployment of the USS Gerald R. Ford carrier strike group to the Persian Gulf, joining the USS Eisenhower already stationed there. The unprecedented dual-carrier presence signals heightened military readiness.',
    link: '#', source: 'AP News', icon: '📰', urgent: true,
    timestamp: Date.now() - 1000 * 60 * 32, pubDate: new Date(Date.now() - 1000 * 60 * 32).toUTCString(),
  },
  {
    title: 'Iran\'s Supreme Leader Khamenei: "America Will Face Consequences It Cannot Imagine"',
    description: 'Supreme Leader Ayatollah Khamenei issued his strongest warning yet against the United States, vowing that Iran would retaliate against any military action with "all means available." IRGC forces placed on highest alert status.',
    link: '#', source: 'Al Jazeera', icon: '📺', urgent: true,
    timestamp: Date.now() - 1000 * 60 * 45, pubDate: new Date(Date.now() - 1000 * 60 * 45).toUTCString(),
  },
  {
    title: 'IAEA Reports Iran Has Enriched Enough Uranium for Multiple Nuclear Warheads',
    description: 'The International Atomic Energy Agency\'s latest report indicates Iran has accumulated sufficient enriched uranium for at least four nuclear warheads. Inspectors have been denied access to key facilities for over three months.',
    link: '#', source: 'BBC World', icon: '🌐', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 60, pubDate: new Date(Date.now() - 1000 * 60 * 60).toUTCString(),
  },
  {
    title: 'Oil Prices Surge 8% as Strait of Hormuz Closure Risk Rises',
    description: 'Crude oil prices jumped 8% in early trading as Iran\'s Revolutionary Guard threatened to close the Strait of Hormuz, through which 20% of global oil supply passes. Energy analysts warn of $180 per barrel if closure materializes.',
    link: '#', source: 'Reuters', icon: '📡', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 80, pubDate: new Date(Date.now() - 1000 * 60 * 80).toUTCString(),
  },
  {
    title: 'Israel Signals Readiness to Join US Military Operations Against Iran',
    description: 'Israeli Prime Minister signaled that Israel stands ready to coordinate military operations with the United States targeting Iranian nuclear infrastructure. Israel has conducted preparatory strikes against Iranian air defense positions in Syria.',
    link: '#', source: 'The Guardian', icon: '🗞️', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 95, pubDate: new Date(Date.now() - 1000 * 60 * 95).toUTCString(),
  },
  {
    title: 'Iran Proxy Forces Launch Coordinated Drone Attacks on US Bases in Iraq',
    description: 'Iran-backed militia groups launched a coordinated drone attack on three US military installations in Iraq, injuring seven service members. US military intercepted 14 of 17 drones using Patriot and Iron Dome systems.',
    link: '#', source: 'AP News', icon: '📰', urgent: true,
    timestamp: Date.now() - 1000 * 60 * 110, pubDate: new Date(Date.now() - 1000 * 60 * 110).toUTCString(),
  },
  {
    title: 'Pentagon Activates Emergency War Powers, Deploys B-2 Bombers to Diego Garcia',
    description: 'The Department of Defense has quietly activated emergency war powers protocols and deployed B-2 Spirit stealth bombers capable of penetrating Iran\'s air defenses to the Diego Garcia base in the Indian Ocean.',
    link: '#', source: 'Reuters', icon: '📡', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 130, pubDate: new Date(Date.now() - 1000 * 60 * 130).toUTCString(),
  },
  {
    title: 'Russia and China Warn Against Military Action, Emergency UN Security Council Session Called',
    description: 'Russia and China jointly issued a statement warning the US against military action against Iran, calling it a violation of international law. An emergency session of the UN Security Council has been called for tomorrow.',
    link: '#', source: 'BBC World', icon: '🌐', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 150, pubDate: new Date(Date.now() - 1000 * 60 * 150).toUTCString(),
  },
  {
    title: 'Gold Hits All-Time High $3,200/oz as Investors Seek Safe Haven Assets',
    description: 'Gold prices reached a historic high of $3,200 per troy ounce as institutional investors rushed to safe haven assets amid the escalating US-Iran crisis. Bitcoin also rose 12% as digital gold narrative strengthens.',
    link: '#', source: 'The Guardian', icon: '🗞️', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 165, pubDate: new Date(Date.now() - 1000 * 60 * 165).toUTCString(),
  },
  {
    title: 'Hezbollah Declares Full Readiness for War, Massing Troops on Lebanon-Israel Border',
    description: 'Hezbollah\'s Secretary-General declared the organization is on full war footing and has mobilized elite Radwan Forces to the Lebanese-Israeli border. Israeli IDF has responded by calling up additional reserve units.',
    link: '#', source: 'Middle East Eye', icon: '🌙', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 180, pubDate: new Date(Date.now() - 1000 * 60 * 180).toUTCString(),
  },
  {
    title: 'Iran Suspends All Nuclear Inspections, IAEA Access Fully Blocked',
    description: 'Iran has formally suspended all IAEA nuclear inspections and expelled remaining inspectors, marking a complete breakdown of the 2015 nuclear framework. This action has been interpreted as final preparations before any potential military confrontation.',
    link: '#', source: 'Reuters', icon: '📡', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 200, pubDate: new Date(Date.now() - 1000 * 60 * 200).toUTCString(),
  },
  {
    title: 'Defense Stocks Soar: Lockheed Martin +12%, Raytheon +9% on War Premium',
    description: 'Defense contractor stocks surged to record highs as markets priced in a potential US military campaign. Lockheed Martin gained 12%, Raytheon 9%, Northrop Grumman 11%. The iShares Defense ETF (ITA) hit its highest level ever.',
    link: '#', source: 'Reuters', icon: '📡', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 220, pubDate: new Date(Date.now() - 1000 * 60 * 220).toUTCString(),
  },
  {
    title: 'European Allies Refuse to Join US Coalition, Urge Diplomatic Solution',
    description: 'Germany, France, and the UK jointly announced they will not join any US military coalition against Iran and urged continued diplomatic engagement. NATO Secretary General called for "maximum restraint from all sides."',
    link: '#', source: 'The Guardian', icon: '🗞️', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 240, pubDate: new Date(Date.now() - 1000 * 60 * 240).toUTCString(),
  },
  {
    title: 'Bitcoin Breaks $105,000 as Geopolitical Crisis Drives Safe Haven Buying',
    description: 'Bitcoin surged past $105,000 for the first time in months as geopolitical crisis fears drove institutional and retail investors to alternative assets. On-chain data shows significant accumulation by large wallet addresses.',
    link: '#', source: 'AP News', icon: '📰', urgent: false,
    timestamp: Date.now() - 1000 * 60 * 260, pubDate: new Date(Date.now() - 1000 * 60 * 260).toUTCString(),
  },
];

// ─── NewsAPI.org 사용 ────────────────────────────────────────────────────────
async function fetchFromNewsAPI() {
  const url = `https://newsapi.org/v2/everything?q=iran+usa+war+military&language=en&sortBy=publishedAt&pageSize=30&apiKey=${NEWS_API_KEY}`;
  const resp = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  return (resp.data.articles || []).map((a) => ({
    title: a.title || '',
    description: (a.description || '').replace(/<[^>]*>/g, '').slice(0, 300),
    link: a.url || '#',
    source: a.source?.name || 'NewsAPI',
    icon: '📡',
    pubDate: a.publishedAt,
    timestamp: a.publishedAt ? new Date(a.publishedAt).getTime() : Date.now(),
    urgent: isUrgentTitle(a.title || ''),
  }));
}

// ─── RSS 피드 파싱 ────────────────────────────────────────────────────────────
async function fetchRSS(source) {
  const response = await axios.get(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml,text/xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 10000,
  });
  const result = await xmlParser.parseStringPromise(response.data);
  return result?.rss?.channel?.[0]?.item || [];
}

function isRelevant(item) {
  const title = (item.title?.[0] || '').toLowerCase();
  const desc = (item.description?.[0] || '').toLowerCase();
  return WAR_KEYWORDS.some((kw) => (title + desc).includes(kw));
}

function isUrgentTitle(title) {
  const t = title.toLowerCase();
  return ['attack', 'strike', 'breaking', 'urgent', 'war declared', 'missile', 'nuclear', 'explosion'].some((w) => t.includes(w));
}

function parseRSSItem(item, source) {
  const title = Array.isArray(item.title) ? item.title[0] : item.title || '';
  const desc = Array.isArray(item.description) ? item.description[0] : item.description || '';
  const link = Array.isArray(item.link) ? item.link[0] : item.link || '';
  const pubDate = Array.isArray(item.pubDate) ? item.pubDate[0] : item.pubDate || '';
  const titleStr = typeof title === 'object' ? (title._ || '') : title;
  return {
    title: titleStr,
    description: (typeof desc === 'object' ? (desc._ || '') : desc).replace(/<[^>]*>/g, '').slice(0, 300),
    link: typeof link === 'object' ? (link._ || '') : link,
    pubDate,
    timestamp: pubDate ? new Date(pubDate).getTime() : 0,
    source: source.name,
    icon: source.icon,
    urgent: isUrgentTitle(titleStr),
  };
}

// ─── 뉴스 API ─────────────────────────────────────────────────────────────────
app.get('/api/news', async (req, res) => {
  const cached = cache.get('news');
  if (cached) return res.json({ success: true, data: cached, cached: true, source: cache.get('news_source') || 'cache' });

  // 1) NewsAPI.org (API 키가 있을 때)
  if (NEWS_API_KEY) {
    try {
      const articles = await fetchFromNewsAPI();
      if (articles.length > 0) {
        cache.set('news', articles);
        cache.set('news_source', 'newsapi');
        return res.json({ success: true, data: articles, source: 'newsapi' });
      }
    } catch (e) {
      console.warn('NewsAPI 실패:', e.message);
    }
  }

  // 2) RSS 피드 시도
  const allNews = [];
  await Promise.allSettled(
    NEWS_SOURCES.map(async (source) => {
      try {
        const items = await fetchRSS(source);
        items.filter(isRelevant).slice(0, 15).forEach((item) => allNews.push(parseRSSItem(item, source)));
      } catch (e) {
        // 개별 소스 실패는 무시
      }
    })
  );

  if (allNews.length > 0) {
    allNews.sort((a, b) => b.timestamp - a.timestamp);
    const unique = allNews.filter((item, idx, arr) => arr.findIndex((i) => i.title === item.title) === idx);
    cache.set('news', unique);
    cache.set('news_source', 'rss');
    return res.json({ success: true, data: unique, source: 'rss' });
  }

  // 3) 데모 데이터 (RSS/API 모두 실패 시)
  const refreshedDemo = DEMO_NEWS.map((n, i) => ({
    ...n,
    timestamp: Date.now() - 1000 * 60 * (i * 15 + Math.floor(Math.random() * 10)),
    pubDate: new Date(Date.now() - 1000 * 60 * (i * 15)).toUTCString(),
  }));
  cache.set('news', refreshedDemo, 300);
  cache.set('news_source', 'demo');
  res.json({ success: true, data: refreshedDemo, source: 'demo', demoMode: true });
});

// ─── 데모 암호화폐 데이터 ────────────────────────────────────────────────────
const DEMO_CRYPTO = {
  bitcoin:  { usd: 104820, usd_24h_change: +11.42, usd_market_cap: 2074000000000, usd_24h_vol: 98000000000, demo: true },
  ethereum: { usd: 3842,   usd_24h_change: +8.37,  usd_market_cap: 461000000000,  usd_24h_vol: 32000000000, demo: true },
};

// ─── 암호화폐 API (CoinGecko + 데모 폴백) ────────────────────────────────────
app.get('/api/crypto', async (req, res) => {
  const cached = cache.get('crypto');
  if (cached) return res.json({ success: true, data: cached, cached: true });

  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true',
      { timeout: 8000, headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } }
    );
    if (response.data && (response.data.bitcoin || response.data.ethereum)) {
      cache.set('crypto', response.data);
      return res.json({ success: true, data: response.data });
    }
    throw new Error('Empty response');
  } catch (e) {
    // 폴백: 데모 데이터
    cache.set('crypto', DEMO_CRYPTO, 300);
    res.json({ success: true, data: DEMO_CRYPTO, demoMode: true });
  }
});

// ─── 데모 시장 데이터 (전쟁 위기 시나리오 반영) ──────────────────────────────
const DEMO_MARKETS = {
  'LMT':      { symbol: 'LMT',      shortName: 'Lockheed Martin',    price: 612.45, change: +67.81, changePct: +12.45, currency: 'USD', demo: true },
  'RTX':      { symbol: 'RTX',      shortName: 'Raytheon Tech',      price: 138.92, change: +11.65, changePct: +9.16,  currency: 'USD', demo: true },
  'NOC':      { symbol: 'NOC',      shortName: 'Northrop Grumman',   price: 548.30, change: +53.21, changePct: +10.74, currency: 'USD', demo: true },
  'GD':       { symbol: 'GD',       shortName: 'General Dynamics',   price: 310.70, change: +24.60, changePct: +8.60,  currency: 'USD', demo: true },
  'ITA':      { symbol: 'ITA',      shortName: 'iShares Defense ETF',price: 158.45, change: +17.20, changePct: +12.18, currency: 'USD', demo: true },
  '^GSPC':    { symbol: '^GSPC',    shortName: 'S&P 500',            price: 5632.10,change: -187.40, changePct: -3.22, currency: 'USD', demo: true },
  '^VIX':     { symbol: '^VIX',     shortName: 'VIX 공포지수',       price: 38.72,  change: +12.41, changePct: +47.18, currency: 'USD', demo: true },
  'GC=F':     { symbol: 'GC=F',     shortName: '금 선물',            price: 3148.60,change: +189.30, changePct: +6.40, currency: 'USD', demo: true },
  'CL=F':     { symbol: 'CL=F',     shortName: 'WTI 원유',           price: 96.42,  change: +7.84,  changePct: +8.85,  currency: 'USD', demo: true },
  'BZ=F':     { symbol: 'BZ=F',     shortName: '브렌트유',           price: 99.18,  change: +8.12,  changePct: +8.92,  currency: 'USD', demo: true },
  'JPY=X':    { symbol: 'JPY=X',    shortName: 'USD/JPY 엔화',       price: 142.35, change: -4.21,  changePct: -2.87,  currency: 'JPY', demo: true },
  'EURUSD=X': { symbol: 'EURUSD=X', shortName: 'EUR/USD',            price: 1.0842, change: -0.0158, changePct: -1.43, currency: 'USD', demo: true },
};

// ─── 주식/원자재 API (Yahoo Finance + 데모 폴백) ───────────────────────────────
app.get('/api/markets', async (req, res) => {
  const cached = cache.get('markets');
  if (cached) return res.json({ success: true, data: cached, cached: true });

  const allSymbols = ['LMT', 'RTX', 'NOC', 'GD', 'ITA', '^GSPC', '^VIX', 'GC=F', 'CL=F', 'BZ=F', 'JPY=X', 'EURUSD=X'];
  const marketData = {};
  let liveCount = 0;

  const YF_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://finance.yahoo.com/',
  };

  await Promise.allSettled(
    allSymbols.map(async (symbol) => {
      for (const host of ['query1', 'query2']) {
        try {
          const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
          const resp = await axios.get(url, { timeout: 6000, headers: YF_HEADERS });
          const meta = resp.data?.chart?.result?.[0]?.meta;
          if (meta) {
            const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPreviousClose;
            const price = meta.regularMarketPrice;
            const change = price - prev;
            const changePct = prev ? (change / prev) * 100 : 0;
            marketData[symbol] = { symbol, price, previousClose: prev, change, changePct, currency: meta.currency || 'USD', shortName: meta.shortName || symbol };
            liveCount++;
            return; // success, stop retrying
          }
        } catch (_) {
          // try next host
        }
      }
      // All hosts failed — use demo fallback
      marketData[symbol] = DEMO_MARKETS[symbol] || { symbol, error: 'data unavailable' };
    })
  );

  const isDemoMode = liveCount === 0;
  if (isDemoMode) {
    cache.set('markets', DEMO_MARKETS, 300);
    return res.json({ success: true, data: DEMO_MARKETS, demoMode: true });
  }

  cache.set('markets', marketData);
  res.json({ success: true, data: marketData, liveCount });
});

// ─── 서버 상태 API ────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    newsApiConfigured: !!NEWS_API_KEY,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`\n🔴 전쟁 위기 대시보드 실행 중`);
  console.log(`📡 http://localhost:${PORT}`);
  if (!NEWS_API_KEY) {
    console.log(`⚠️  NEWS_API_KEY 미설정 — 데모 모드로 동작합니다.`);
    console.log(`   newsapi.org 에서 무료 키를 받아 NEWS_API_KEY=xxxx npm start 로 실행하세요.\n`);
  } else {
    console.log(`✅ NewsAPI.org 키 설정됨 — 실시간 뉴스 사용\n`);
  }
});
