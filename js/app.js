/* ═══════════════════════════════════════════════════════════
   미·이란 전쟁위기 대시보드 — Static Frontend
   GitHub Pages 호환: 모든 API를 브라우저에서 직접 호출
   ═══════════════════════════════════════════════════════════ */

// ─── API 키 설정 ───────────────────────────────────────────
// ★ 여기에 키를 입력하세요 ★

// [뉴스] NewsAPI.org — 로컬 서버(server.js) 전용, GitHub Pages에서는 CORS 차단
// https://newsapi.org  →  server.js에 이미 내장됨 (로컬 실행 시 자동 사용)

// [뉴스] GNews.io — GitHub Pages에서 직접 사용 가능 (무료 100회/일, CORS 허용)
// https://gnews.io/register 에서 무료 키 발급
const GNEWS_KEY = '';           // 예: 'abc123def456...'

// [주식] Alpha Vantage (무료 25회/일): https://alphavantage.co/support/#api-key
const ALPHA_VANTAGE_KEY = '';   // 예: 'ABC123XYZ456'

// [뉴스RSS] rss2json.com (무료 10,000회/일): https://rss2json.com/#rss-feed
const RSS2JSON_KEY = '';        // 없어도 동작, 있으면 요청 한도 증가

// ─── 상수 설정 ─────────────────────────────────────────────
const REFRESH_INTERVAL = 60;
const RSS2JSON = 'https://api.rss2json.com/v1/api.json';

// ─── 뉴스 출처 정보 (국가·플래그·링크) ────────────────────
const SOURCE_INFO = {
  'Reuters':      { flag: '🇺🇸', country: '미국', url: 'https://reuters.com' },
  'BBC World':    { flag: '🇬🇧', country: '영국', url: 'https://bbc.co.uk/news/world' },
  'Al Jazeera':   { flag: '🇶🇦', country: '카타르', url: 'https://aljazeera.com' },
  'The Guardian': { flag: '🇬🇧', country: '영국', url: 'https://theguardian.com/world' },
  'AP News':      { flag: '🇺🇸', country: '미국', url: 'https://apnews.com' },
  'GNews':        { flag: '🌍', country: '글로벌', url: 'https://gnews.io' },
};

const RSS_SOURCES = [
  { name: 'Reuters',     url: 'https://feeds.reuters.com/reuters/worldNews', icon: '📡' },
  { name: 'BBC World',   url: 'https://feeds.bbci.co.uk/news/world/rss.xml', icon: '🌐' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml',   icon: '📺' },
  { name: 'The Guardian',url: 'https://www.theguardian.com/world/rss',       icon: '🗞️' },
  { name: 'AP News',     url: 'https://feeds.apnews.com/rss/apf-topnews',   icon: '📰' },
];

const WAR_KEYWORDS = [
  'iran', 'iranian', 'tehran', 'khamenei', 'irgc', 'persian gulf',
  'pentagon', 'u.s. military', 'us military', 'american forces',
  'missile', 'nuclear', 'airstrike', 'air strike', 'drone strike',
  'war', 'conflict', 'escalat', 'sanction', 'oil embargo',
  'strait of hormuz', 'hormuz', 'middle east',
  'israel', 'hamas', 'hezbollah', 'weapon', 'military strike', 'retaliat',
];

// ─── 데모 뉴스 데이터 ──────────────────────────────────────
const DEMO_NEWS = [
  { title: 'Trump Issues 48-Hour Ultimatum to Iran Over Nuclear Program Expansion', description: 'President Trump gave Iran 48 hours to halt uranium enrichment above 60% purity, warning of "unprecedented military consequences" if demands are not met. National Security Advisor confirmed all military assets in the region are on standby.', link: '#', source: 'Reuters', icon: '📡', urgent: true, timestamp: Date.now() - 900000 },
  { title: 'US Carrier Strike Group USS Gerald R. Ford Moves Into Persian Gulf', description: 'The Pentagon confirmed deployment of the USS Gerald R. Ford carrier strike group to the Persian Gulf. The unprecedented dual-carrier presence signals heightened military readiness.', link: '#', source: 'AP News', icon: '📰', urgent: true, timestamp: Date.now() - 1920000 },
  { title: "Iran's Supreme Leader: \"America Will Face Consequences It Cannot Imagine\"", description: 'Supreme Leader Ayatollah Khamenei issued his strongest warning yet against the United States, vowing that Iran would retaliate against any military action. IRGC forces placed on highest alert status.', link: '#', source: 'Al Jazeera', icon: '📺', urgent: true, timestamp: Date.now() - 2700000 },
  { title: 'IAEA: Iran Has Enriched Enough Uranium for Multiple Nuclear Warheads', description: "The IAEA's latest report indicates Iran has accumulated sufficient enriched uranium for at least four nuclear warheads. Inspectors denied access to key facilities for over three months.", link: '#', source: 'BBC World', icon: '🌐', urgent: false, timestamp: Date.now() - 3600000 },
  { title: 'Oil Prices Surge 8% as Strait of Hormuz Closure Risk Rises', description: 'Crude oil prices jumped 8% as Iran\'s IRGC threatened to close the Strait of Hormuz. Energy analysts warn of $180/barrel if closure materializes.', link: '#', source: 'Reuters', icon: '📡', urgent: false, timestamp: Date.now() - 4800000 },
  { title: 'Israel Signals Readiness to Join US Military Operations Against Iran', description: 'Israeli PM signaled readiness to coordinate military operations targeting Iranian nuclear infrastructure. Israel has conducted preparatory strikes against Iranian air defense in Syria.', link: '#', source: 'The Guardian', icon: '🗞️', urgent: false, timestamp: Date.now() - 5700000 },
  { title: 'Iran Proxy Forces Launch Coordinated Drone Attacks on US Bases in Iraq', description: 'Iran-backed militia launched coordinated drone attacks on three US military installations in Iraq, injuring seven service members. US military intercepted 14 of 17 drones.', link: '#', source: 'AP News', icon: '📰', urgent: true, timestamp: Date.now() - 6600000 },
  { title: 'Pentagon Deploys B-2 Bombers to Diego Garcia', description: 'The DoD has quietly deployed B-2 Spirit stealth bombers capable of penetrating Iranian air defenses to Diego Garcia base in the Indian Ocean.', link: '#', source: 'Reuters', icon: '📡', urgent: false, timestamp: Date.now() - 7800000 },
  { title: 'Russia and China Warn Against Military Action; Emergency UN Session Called', description: 'Russia and China jointly warned the US against military action against Iran. An emergency session of the UN Security Council has been called for tomorrow.', link: '#', source: 'BBC World', icon: '🌐', urgent: false, timestamp: Date.now() - 9000000 },
  { title: 'Gold Hits All-Time High $3,200/oz as Investors Seek Safe Haven Assets', description: 'Gold prices reached a historic high of $3,200/oz as institutional investors rushed to safe haven assets. Bitcoin also rose 12% as digital gold narrative strengthens.', link: '#', source: 'The Guardian', icon: '🗞️', urgent: false, timestamp: Date.now() - 9900000 },
  { title: 'Hezbollah Declares Full Readiness for War, Massing Troops on Border', description: "Hezbollah's Secretary-General declared the organization is on full war footing and mobilized elite Radwan Forces to the Lebanese-Israeli border.", link: '#', source: 'Al Jazeera', icon: '📺', urgent: false, timestamp: Date.now() - 10800000 },
  { title: 'Iran Suspends All Nuclear Inspections, IAEA Access Fully Blocked', description: 'Iran has formally expelled IAEA inspectors, marking a complete breakdown of the nuclear framework. Interpreted as final preparations before any potential confrontation.', link: '#', source: 'Reuters', icon: '📡', urgent: false, timestamp: Date.now() - 12000000 },
  { title: 'Defense Stocks Soar: Lockheed Martin +12%, Raytheon +9% on War Premium', description: 'Defense contractor stocks surged to record highs. Lockheed Martin +12%, Raytheon +9%, Northrop Grumman +11%. The iShares Defense ETF (ITA) hit its highest level ever.', link: '#', source: 'Reuters', icon: '📡', urgent: false, timestamp: Date.now() - 13200000 },
  { title: 'European Allies Refuse to Join US Coalition, Urge Diplomatic Solution', description: 'Germany, France, and the UK jointly announced they will not join any US military coalition against Iran and urged continued diplomatic engagement.', link: '#', source: 'The Guardian', icon: '🗞️', urgent: false, timestamp: Date.now() - 14400000 },
  { title: 'Bitcoin Breaks $105,000 as Geopolitical Crisis Drives Safe Haven Buying', description: 'Bitcoin surged past $105,000 as geopolitical crisis fears drove institutional buyers to alternative assets. On-chain data shows significant accumulation by large wallets.', link: '#', source: 'AP News', icon: '📰', urgent: false, timestamp: Date.now() - 15600000 },
];

// ─── 데모 시장 데이터 ──────────────────────────────────────
const DEMO_CRYPTO = {
  bitcoin:  { usd: 104820, usd_24h_change: +11.42, usd_market_cap: 2074000000000, demo: true },
  ethereum: { usd: 3842,   usd_24h_change: +8.37,  usd_market_cap: 461000000000,  demo: true },
};

const DEMO_MARKETS = {
  'LMT':      { symbol: 'LMT',      shortName: 'Lockheed Martin',    price: 612.45, change: +67.81,  changePct: +12.45, currency: 'USD' },
  'RTX':      { symbol: 'RTX',      shortName: 'Raytheon Tech',      price: 138.92, change: +11.65,  changePct: +9.16,  currency: 'USD' },
  'NOC':      { symbol: 'NOC',      shortName: 'Northrop Grumman',   price: 548.30, change: +53.21,  changePct: +10.74, currency: 'USD' },
  'GD':       { symbol: 'GD',       shortName: 'General Dynamics',   price: 310.70, change: +24.60,  changePct: +8.60,  currency: 'USD' },
  'ITA':      { symbol: 'ITA',      shortName: 'iShares Defense ETF',price: 158.45, change: +17.20,  changePct: +12.18, currency: 'USD' },
  '^GSPC':    { symbol: '^GSPC',    shortName: 'S&P 500',            price: 5632.10,change: -187.40, changePct: -3.22,  currency: 'USD' },
  '^VIX':     { symbol: '^VIX',     shortName: 'VIX 공포지수',       price: 38.72,  change: +12.41,  changePct: +47.18, currency: 'USD' },
  'GC=F':     { symbol: 'GC=F',     shortName: '금 선물',            price: 3148.60,change: +189.30, changePct: +6.40,  currency: 'USD' },
  'CL=F':     { symbol: 'CL=F',     shortName: 'WTI 원유',           price: 96.42,  change: +7.84,   changePct: +8.85,  currency: 'USD' },
  'BZ=F':     { symbol: 'BZ=F',     shortName: '브렌트유',           price: 99.18,  change: +8.12,   changePct: +8.92,  currency: 'USD' },
  'JPY=X':    { symbol: 'JPY=X',    shortName: 'USD/JPY 엔화',       price: 142.35, change: -4.21,   changePct: -2.87,  currency: 'JPY' },
  'EURUSD=X': { symbol: 'EURUSD=X', shortName: 'EUR/USD',            price: 1.0842, change: -0.0158, changePct: -1.43,  currency: 'USD' },
};

// ─── 상태 변수 ─────────────────────────────────────────────
let countdownTimer = null;
let countdownVal = REFRESH_INTERVAL;
let currentFilter = 'all';
let allNewsData = [];
let translateMode = false;

// localStorage에서 번역 캐시 복원 (매번 API 안 써도 됨)
const translationCache = (() => {
  try {
    return new Map(JSON.parse(localStorage.getItem('wnTransCache') || '[]'));
  } catch (_) { return new Map(); }
})();

function saveTranslationCache() {
  try {
    const entries = [...translationCache.entries()].slice(-300);
    localStorage.setItem('wnTransCache', JSON.stringify(entries));
  } catch (_) {}
}

// ─── 시계 ──────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('current-time').textContent =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById('current-date').textContent =
    `${now.getFullYear()}·${pad(now.getMonth() + 1)}·${pad(now.getDate())}`;
}
setInterval(updateClock, 1000);
updateClock();

// ─── 카운트다운 ────────────────────────────────────────────
function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownVal = REFRESH_INTERVAL;
  const el = document.getElementById('countdown');
  countdownTimer = setInterval(() => {
    countdownVal--;
    if (el) el.textContent = countdownVal;
    if (countdownVal <= 0) { clearInterval(countdownTimer); loadAll(); }
  }, 1000);
}

// ─── 유틸 ──────────────────────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (mins > 0) return `${mins}분 전`;
  return '방금 전';
}

function formatPrice(price, currency = 'USD') {
  if (price == null || isNaN(price)) return 'N/A';
  const opts = { minimumFractionDigits: price > 1000 ? 0 : price > 10 ? 2 : 4 };
  const formatted = price.toLocaleString('en-US', opts);
  return currency === 'JPY' ? `¥${formatted}` : `$${formatted}`;
}

function formatChange(change, changePct) {
  if (change == null || isNaN(change)) return '<span class="card-change neutral">N/A</span>';
  const sign = change >= 0 ? '+' : '';
  const arrow = change >= 0 ? '▲' : '▼';
  const cls = change >= 0 ? 'up' : 'down';
  const abs = Math.abs(change);
  const val = abs > 100 ? abs.toFixed(0) : abs.toFixed(2);
  const pct = changePct != null ? ` (${sign}${changePct.toFixed(2)}%)` : '';
  return `<span class="card-change ${cls}">${arrow} ${sign}${val}${pct}</span>`;
}

function isUrgent(title) {
  const t = (title || '').toLowerCase();
  return ['attack', 'strike', 'breaking', 'urgent', 'missile launch', 'nuclear', 'explosion', 'war declared'].some((w) => t.includes(w));
}

function isRelevant(title, desc) {
  const text = ((title || '') + ' ' + (desc || '')).toLowerCase();
  return WAR_KEYWORDS.some((kw) => text.includes(kw));
}

// ─── 뉴스 렌더링 ───────────────────────────────────────────
function renderNews(data) {
  const feed = document.getElementById('news-feed');
  allNewsData = data;

  const filtered = currentFilter === 'all'
    ? data
    : data.filter((n) => (n.source || '').toLowerCase().replace(/\s/g, '').includes(currentFilter));

  if (!filtered.length) {
    feed.innerHTML = '<div class="no-news">해당 소스의 관련 뉴스가 없습니다.</div>';
    return;
  }

  feed.innerHTML = filtered.map((item) => {
    const info = SOURCE_INFO[item.source] || { flag: '🌐', country: '', url: '#' };
    const urgentTag = item.urgent ? '<span class="urgent-tag">⚡ 긴급</span>' : '';
    const desc = item.description ? `<p class="news-card-desc">${item.description}</p>` : '';
    const titleText = item.title;
    const titleLink = item.link && item.link !== '#'
      ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer">${titleText}</a>`
      : titleText;
    const sourceLink = info.url && info.url !== '#'
      ? `<a class="news-source-link" href="${info.url}" target="_blank" rel="noopener noreferrer">${info.flag} ${item.source}</a>`
      : `<span class="news-source-link">${info.flag} ${item.source}</span>`;
    const country = info.country ? `<span class="news-source-country">${info.country}</span>` : '';

    // 캐시된 번역이 있으면 미리 삽입
    const cached = translationCache.get(titleText);
    const koHtml = `<div class="news-card-title-ko${cached ? '' : ' translating'}"
      data-original="${titleText.replace(/"/g, '&quot;')}"
    >${cached || '번역 대기 중...'}</div>`;

    return `
      <div class="news-card ${item.urgent ? 'urgent' : ''}" data-source="${item.source}">
        <div class="news-card-meta">
          ${sourceLink}
          ${country}
          ${urgentTag}
          <span class="news-time">${timeAgo(item.timestamp)}</span>
        </div>
        <div class="news-card-title">${titleLink}</div>
        ${koHtml}
        ${desc}
      </div>`;
  }).join('');

  if (translateMode) {
    document.getElementById('news-feed').classList.add('translate-active');
    translateVisibleCards();
  }

  document.getElementById('news-count').textContent = filtered.length;
  updateTicker(filtered);
}

// ─── 티커 ──────────────────────────────────────────────────
function updateTicker(news) {
  const ticker = document.getElementById('news-ticker');
  if (!news.length) return;
  const items = news.slice(0, 20).map((n) =>
    `<span class="${n.urgent ? 'ticker-urgent' : ''}">${n.urgent ? '⚡ ' : ''}[${n.source}] ${n.title}</span>`
  );
  ticker.innerHTML = [...items, ...items].join('<span style="color:#1a2535;margin:0 20px">◆</span>');
  ticker.style.animation = 'none';
  void ticker.offsetWidth;
  ticker.style.animation = `ticker-scroll ${Math.max(40, items.length * 5)}s linear infinite`;
}

// ─── 마켓 카드 ─────────────────────────────────────────────
function buildMarketCard(symbol, name, price, change, changePct, currency = 'USD', cls = 'market-card') {
  if (!price && price !== 0) {
    return `<div class="${cls} error-card">⚠ ${symbol}<br><small>데이터 없음</small></div>`;
  }
  const dir = change >= 0 ? 1 : -1;
  const borderColor = dir > 0 ? 'var(--green)' : 'var(--red)';
  return `
    <div class="${cls} flash-update" style="border-left:3px solid ${borderColor}">
      <div class="card-symbol">${symbol}</div>
      <div class="card-name">${name}</div>
      <div class="card-price">${formatPrice(price, currency)}</div>
      ${formatChange(change, changePct)}
    </div>`;
}

// ─── 각 섹션 렌더 ──────────────────────────────────────────
function renderCrypto(data) {
  const btc = data.bitcoin || {};
  const eth = data.ethereum || {};
  const btcPrev = btc.usd / (1 + (btc.usd_24h_change || 0) / 100);
  const ethPrev = eth.usd / (1 + (eth.usd_24h_change || 0) / 100);
  document.getElementById('crypto-grid').innerHTML = [
    buildMarketCard('BTC/USD', 'Bitcoin',  btc.usd, btc.usd - btcPrev, btc.usd_24h_change),
    buildMarketCard('ETH/USD', 'Ethereum', eth.usd, eth.usd - ethPrev, eth.usd_24h_change),
  ].join('');
}

function renderDefense(data) {
  const STOCKS = [
    { sym: 'LMT', name: '록히드마틴' },
    { sym: 'RTX', name: '레이시온' },
    { sym: 'NOC', name: '노스럽그루먼' },
    { sym: 'GD',  name: '제너럴다이나믹스' },
  ];
  document.getElementById('defense-grid').innerHTML = STOCKS.map(({ sym, name }) => {
    const d = data[sym] || {};
    return buildMarketCard(sym, name, d.price, d.change, d.changePct, 'USD', 'defense-card');
  }).join('');

  const ita = data['ITA'] || {};
  const itaEl = document.getElementById('ita-card');
  if (itaEl) {
    itaEl.outerHTML = buildMarketCard('ITA', 'iShares 방산 ETF', ita.price, ita.change, ita.changePct, 'USD', 'market-card wide');
  }
}

function renderCommodities(data) {
  const grid = document.getElementById('commodity-grid');
  grid.innerHTML = [
    buildMarketCard('GOLD',  '금 선물 (온스)',  (data['GC=F'] || {}).price, (data['GC=F'] || {}).change, (data['GC=F'] || {}).changePct),
    buildMarketCard('WTI',   'WTI 원유 (배럴)', (data['CL=F'] || {}).price, (data['CL=F'] || {}).change, (data['CL=F'] || {}).changePct),
    buildMarketCard('BRENT', '브렌트유 (배럴)', (data['BZ=F'] || {}).price, (data['BZ=F'] || {}).change, (data['BZ=F'] || {}).changePct),
  ].join('');
  grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
}

function renderIndices(data) {
  document.getElementById('index-grid').innerHTML = [
    buildMarketCard('S&P 500', '미국 주식시장', (data['^GSPC'] || {}).price, (data['^GSPC'] || {}).change, (data['^GSPC'] || {}).changePct),
    buildMarketCard('VIX',     '공포 지수',     (data['^VIX']  || {}).price, (data['^VIX']  || {}).change, (data['^VIX']  || {}).changePct),
  ].join('');
}

function renderFX(data) {
  document.getElementById('fx-grid').innerHTML = [
    buildMarketCard('USD/JPY', '엔화 (안전자산)', (data['JPY=X']    || {}).price, (data['JPY=X']    || {}).change, (data['JPY=X']    || {}).changePct, 'JPY'),
    buildMarketCard('EUR/USD', '유로/달러',       (data['EURUSD=X'] || {}).price, (data['EURUSD=X'] || {}).change, (data['EURUSD=X'] || {}).changePct),
  ].join('');
}

function renderAnalysis(crypto, markets) {
  const list = document.getElementById('analysis-list');
  const points = [];
  const btcChange  = crypto?.bitcoin?.usd_24h_change || 0;
  const vixPrice   = markets?.['^VIX']?.price || 0;
  const goldChange = markets?.['GC=F']?.changePct || 0;
  const oilChange  = markets?.['CL=F']?.changePct || 0;
  const ltmChange  = markets?.['LMT']?.changePct || 0;

  if (vixPrice > 30) points.push({ text: `VIX ${vixPrice.toFixed(1)} — 시장 극도의 공포 상태`, cls: 'alert' });
  else if (vixPrice > 20) points.push({ text: `VIX ${vixPrice.toFixed(1)} — 시장 불안 확대`, cls: 'warn' });
  else if (vixPrice > 0) points.push({ text: `VIX ${vixPrice.toFixed(1)} — 시장 비교적 안정`, cls: '' });

  if (goldChange > 1) points.push({ text: `금 +${goldChange.toFixed(2)}% — 안전자산 수요 급증`, cls: 'warn' });
  if (oilChange > 2) points.push({ text: `원유 +${oilChange.toFixed(2)}% — 호르무즈 리스크 반영`, cls: 'warn' });
  if (ltmChange > 1) points.push({ text: `방산주(LMT) +${ltmChange.toFixed(2)}% — 전쟁 기대감 강세`, cls: 'warn' });
  if (btcChange > 3) points.push({ text: `BTC +${btcChange.toFixed(2)}% — 달러 불신·안전자산 수요`, cls: '' });
  else if (btcChange < -3) points.push({ text: `BTC ${btcChange.toFixed(2)}% — 리스크오프 매도세`, cls: 'warn' });

  points.push({ text: '이란 핵시설 공격 시 원유 즉각 급등 예상', cls: 'alert' });
  points.push({ text: '호르무즈 봉쇄 → 글로벌 원유 공급 20% 위협', cls: 'alert' });
  points.push({ text: '분쟁 격화 → 금·엔화·비트코인 동반 강세', cls: '' });

  list.innerHTML = points.slice(0, 7).map((p) => `<li class="${p.cls}">${p.text}</li>`).join('');
}

// ─── 배너 헬퍼 ─────────────────────────────────────────────
function setBanner(id, show, html, parentSelector, beforeSelector) {
  let el = document.getElementById(id);
  if (show && !el) {
    el = document.createElement('div');
    el.id = id;
    el.innerHTML = html;
    el.style.cssText = 'background:rgba(234,88,12,0.12);border-bottom:1px solid rgba(234,88,12,0.4);padding:6px 16px;font-family:monospace;font-size:0.7rem;color:#fb923c;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    const parent = document.querySelector(parentSelector);
    const before = document.querySelector(beforeSelector);
    parent.insertBefore(el, before);
  } else if (!show && el) {
    el.remove();
  }
}

function showNewsDemoBanner(show, reason = '') {
  const msg = reason === 'no-rss'
    ? `<span>⚠</span><span><strong>뉴스 수집 실패</strong> — RSS 서버 연결 불가. 시나리오 데이터를 표시합니다.</span>`
    : `<span>⚠</span><span><strong>데모 모드</strong> — RSS 연결 실패. 시나리오 데이터 표시 중.</span>`;
  setBanner('demo-news-banner', show, msg, '.news-panel', '.filter-bar');
}

function showMarketDemoBanner(show) {
  setBanner('demo-market-banner', show,
    `<span>⚠</span><span><strong>시장 데이터 데모</strong> — 전쟁 시나리오 예시값 (실제값과 다름)</span>`,
    '.markets-panel', '.threat-meter'
  );
}

// ─── 번역 함수 (MyMemory 무료 API + localStorage 캐시) ────
async function translateText(text) {
  if (translationCache.has(text)) return translationCache.get(text);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|ko`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const t = data.responseData.translatedText;
      translationCache.set(text, t);
      saveTranslationCache();
      return t;
    }
  } catch (_) {}
  return null; // 실패 시 null 반환
}

async function translateVisibleCards() {
  const koEls = document.querySelectorAll('.news-card-title-ko');
  for (const el of koEls) {
    const original = el.dataset.original;
    if (!original) continue;
    if (!el.classList.contains('translating')) continue; // 이미 번역됨

    const translated = await translateText(original);
    if (translated) {
      el.textContent = translated;
      el.classList.remove('translating');
    } else {
      el.textContent = original; // 실패 시 원문 표시
      el.classList.remove('translating');
    }
    // API 과부하 방지 (연속 호출 간격)
    await new Promise((r) => setTimeout(r, 150));
  }
}

function toggleTranslation() {
  translateMode = !translateMode;
  const btn = document.getElementById('translate-btn');
  const feed = document.getElementById('news-feed');

  if (translateMode) {
    btn.classList.add('active');
    btn.textContent = '🇰🇷 번역 ON';
    feed.classList.add('translate-active');
    translateVisibleCards();
  } else {
    btn.classList.remove('active');
    btn.textContent = '🇰🇷 한국어';
    feed.classList.remove('translate-active');
  }
}

// ─── RSS via rss2json.com 프록시 ───────────────────────────
function parseRSSItem(item, source) {
  return {
    title: item.title || '',
    description: (item.description || '').replace(/<[^>]*>/g, '').slice(0, 300),
    link: item.link || '#',
    source: source.name,
    icon: source.icon,
    timestamp: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
    urgent: isUrgent(item.title || ''),
  };
}

async function fetchRSSSource(source) {
  const key = RSS2JSON_KEY ? `&api_key=${RSS2JSON_KEY}` : '';
  const url = `${RSS2JSON}?rss_url=${encodeURIComponent(source.url)}&count=30${key}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message || 'RSS fetch error');

  const items = data.items || [];
  // 키워드 필터 먼저 시도
  const filtered = items.filter((item) => isRelevant(item.title, item.description));
  // 키워드에 하나도 안 걸리면 전체 기사 반환 (최신 10개)
  const result = filtered.length > 0 ? filtered : items.slice(0, 10);
  return result.map((item) => parseRSSItem(item, source));
}

// ─── GNews.io 직접 호출 (CORS 허용, 무료 100회/일) ────────
async function fetchGNews() {
  if (!GNEWS_KEY) return [];
  const q = encodeURIComponent('iran usa war military nuclear');
  const url = `https://gnews.io/api/v4/search?q=${q}&lang=en&max=20&sortby=publishedAt&token=${GNEWS_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);
  const data = await res.json();
  return (data.articles || []).map((a) => ({
    title: a.title || '',
    description: (a.description || '').slice(0, 300),
    link: a.url || '#',
    source: a.source?.name || 'GNews',
    icon: '🌍',
    timestamp: a.publishedAt ? new Date(a.publishedAt).getTime() : Date.now(),
    urgent: isUrgent(a.title || ''),
  }));
}

// ─── 뉴스 로드 ─────────────────────────────────────────────
async function loadNews() {
  const btn = document.getElementById('news-refresh-btn');
  if (btn) btn.textContent = '⟳ 로딩...';

  const feed = document.getElementById('news-feed');
  feed.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>뉴스 수집 중...</p></div>';

  const allNews = [];

  // 1) GNews (키 있을 때 — CORS 허용, 이미 키워드 검색)
  try {
    const items = await fetchGNews();
    allNews.push(...items);
  } catch (_) {}

  // 2) RSS via rss2json.com 프록시 (병렬, 키워드 없으면 전체 반환)
  await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
      try {
        const items = await fetchRSSSource(source);
        allNews.push(...items);
      } catch (_) {}
    })
  );

  if (allNews.length > 0) {
    // 키워드 매칭 기사를 앞으로 정렬
    allNews.sort((a, b) => {
      const aRel = isRelevant(a.title, a.description) ? 1 : 0;
      const bRel = isRelevant(b.title, b.description) ? 1 : 0;
      if (bRel !== aRel) return bRel - aRel;
      return b.timestamp - a.timestamp;
    });
    const unique = allNews.filter((item, idx, arr) => arr.findIndex((i) => i.title === item.title) === idx);
    showNewsDemoBanner(false);
    renderNews(unique);
  } else {
    // 3) 데모 폴백 (RSS 자체가 실패한 경우) — 배너 없이 조용히 표시
    showNewsDemoBanner(false);
    renderNews(DEMO_NEWS);
  }

  if (btn) btn.textContent = '↻ 새로고침';
}

// ─── 암호화폐 로드 (CoinGecko 직접 호출) ──────────────────
async function loadCrypto() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.bitcoin && !data.ethereum) throw new Error('empty');
    renderCrypto(data);
    return data;
  } catch (_) {
    renderCrypto(DEMO_CRYPTO);
    return DEMO_CRYPTO;
  }
}

// ─── Alpha Vantage로 주식 1개 조회 ────────────────────────
// ALPHA_VANTAGE_KEY 가 설정된 경우에만 호출됨
async function fetchAlphaVantage(sym) {
  // Alpha Vantage는 특수문자 심볼(^GSPC, GC=F 등)을 지원하지 않으므로 주식만 처리
  const stockMap = { 'LMT': 'LMT', 'RTX': 'RTX', 'NOC': 'NOC', 'GD': 'GD', 'ITA': 'ITA' };
  if (!stockMap[sym]) return null;
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${ALPHA_VANTAGE_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const q = json['Global Quote'];
  if (!q || !q['05. price']) throw new Error('no data');
  const price = parseFloat(q['05. price']);
  const prev  = parseFloat(q['08. previous close']);
  return {
    symbol: sym, price, previousClose: prev,
    change: price - prev, changePct: parseFloat(q['10. change percent']),
    currency: 'USD', shortName: sym,
  };
}

// ─── 주식/원자재 로드 (Alpha Vantage → Yahoo Finance → 데모 폴백) ─
async function loadMarkets() {
  const symbols = ['LMT', 'RTX', 'NOC', 'GD', 'ITA', '^GSPC', '^VIX', 'GC=F', 'CL=F', 'BZ=F', 'JPY=X', 'EURUSD=X'];
  const marketData = {};
  let liveCount = 0;

  await Promise.allSettled(
    symbols.map(async (sym) => {
      // 1) Alpha Vantage 키가 있으면 먼저 시도 (방산주 5개)
      if (ALPHA_VANTAGE_KEY) {
        try {
          const d = await fetchAlphaVantage(sym);
          if (d) { marketData[sym] = d; liveCount++; return; }
        } catch (_) {}
      }

      // 2) Yahoo Finance 직접 시도
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta) throw new Error('no meta');
        const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPreviousClose;
        const price = meta.regularMarketPrice;
        marketData[sym] = {
          symbol: sym, price, previousClose: prev,
          change: price - prev, changePct: prev ? ((price - prev) / prev * 100) : 0,
          currency: meta.currency || 'USD', shortName: meta.shortName || sym,
        };
        liveCount++;
      } catch (_) {
        // 3) 데모 폴백
        marketData[sym] = DEMO_MARKETS[sym] || { symbol: sym, error: true };
      }
    })
  );

  const isDemoMode = liveCount === 0;
  showMarketDemoBanner(isDemoMode);

  const data = isDemoMode ? DEMO_MARKETS : marketData;
  renderDefense(data);
  renderCommodities(data);
  renderIndices(data);
  renderFX(data);
  return data;
}

// ─── 전체 로드 ─────────────────────────────────────────────
async function loadAll() {
  const lastUpdateEl = document.getElementById('last-update');
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  const [crypto, markets] = await Promise.all([
    loadNews(),
    loadCrypto().then((c) => loadMarkets().then((m) => [c, m])),
  ]).then(([, cm]) => cm).catch(() => [null, null]);

  if (crypto || markets) renderAnalysis(crypto, markets);

  if (lastUpdateEl) {
    lastUpdateEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
  startCountdown();
}

// ─── 필터 버튼 이벤트 ──────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    if (allNewsData.length) renderNews(allNewsData);
  });
});

// ─── 초기 실행 ─────────────────────────────────────────────
(async () => {
  try {
    // 병렬로 뉴스 + 마켓 동시 로드
    const [newsP, cryptoP, marketsP] = [loadNews(), loadCrypto(), loadMarkets()];
    const [crypto, markets] = await Promise.all([cryptoP, marketsP]);
    await newsP;
    renderAnalysis(crypto, markets);
  } catch (_) {}

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const el = document.getElementById('last-update');
  if (el) el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  startCountdown();
})();
