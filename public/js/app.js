/* ═══════════════════════════════════════════════════════════
   미·이란 전쟁위기 대시보드 — Frontend App
   ═══════════════════════════════════════════════════════════ */

const REFRESH_INTERVAL = 60; // seconds between auto-refresh
let countdownVal = REFRESH_INTERVAL;
let countdownTimer = null;
let currentFilter = 'all';
let allNewsData = [];

// ─── 시계 ──────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateStr = `${now.getFullYear()}·${pad(now.getMonth() + 1)}·${pad(now.getDate())}`;
  document.getElementById('current-time').textContent = timeStr;
  document.getElementById('current-date').textContent = dateStr;
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
    if (countdownVal <= 0) {
      clearInterval(countdownTimer);
      loadAll();
    }
  }, 1000);
}

// ─── 시간 포맷 ─────────────────────────────────────────────
function timeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (mins > 0) return `${mins}분 전`;
  return '방금 전';
}

// ─── 숫자 포맷 ─────────────────────────────────────────────
function formatPrice(price, currency = 'USD', compact = false) {
  if (price == null || isNaN(price)) return 'N/A';
  const opts = { minimumFractionDigits: price > 1000 ? 0 : price > 10 ? 2 : 4 };
  if (compact && price > 1000000) return `$${(price / 1000000).toFixed(2)}M`;
  const formatted = price.toLocaleString('en-US', opts);
  return currency === 'USD' ? `$${formatted}` : `${formatted} ${currency}`;
}

function formatChange(change, changePct) {
  if (change == null || isNaN(change)) return { html: '<span class="card-change neutral">N/A</span>', direction: 0 };
  const sign = change >= 0 ? '+' : '';
  const arrow = change >= 0 ? '▲' : '▼';
  const cls = change >= 0 ? 'up' : 'down';
  const pct = changePct != null ? ` (${sign}${changePct.toFixed(2)}%)` : '';
  return {
    html: `<span class="card-change ${cls}">${arrow} ${sign}${Math.abs(change).toFixed(change > 100 ? 0 : 2)}${pct}</span>`,
    direction: change >= 0 ? 1 : -1,
  };
}

// ─── 뉴스 피드 렌더링 ──────────────────────────────────────
function renderNews(data) {
  const feed = document.getElementById('news-feed');
  allNewsData = data;

  const filtered = currentFilter === 'all'
    ? data
    : data.filter((n) => n.source.toLowerCase().replace(/\s/g, '').includes(currentFilter));

  if (!filtered.length) {
    feed.innerHTML = '<div class="no-news">해당 소스의 관련 뉴스가 없습니다.</div>';
    return;
  }

  feed.innerHTML = filtered.map((item) => {
    const ago = timeAgo(item.timestamp);
    const urgentTag = item.urgent ? '<span class="urgent-tag">⚡ 긴급</span>' : '';
    const desc = item.description ? `<p class="news-card-desc">${item.description}</p>` : '';
    const link = item.link
      ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>`
      : item.title;

    return `
      <div class="news-card ${item.urgent ? 'urgent' : ''}">
        <div class="news-card-meta">
          <span class="news-source-badge">${item.icon} ${item.source}</span>
          ${urgentTag}
          <span class="news-time">${ago}</span>
        </div>
        <div class="news-card-title">${link}</div>
        ${desc}
      </div>`;
  }).join('');

  document.getElementById('news-count').textContent = filtered.length;

  // 티커 업데이트
  updateTicker(filtered);
}

// ─── 뉴스 티커 업데이트 ────────────────────────────────────
function updateTicker(news) {
  const ticker = document.getElementById('news-ticker');
  if (!news.length) return;

  const items = news.slice(0, 20).map((n) => {
    const cls = n.urgent ? 'ticker-urgent' : '';
    return `<span class="${cls}">${n.urgent ? '⚡ ' : ''}[${n.source}] ${n.title}</span>`;
  });
  // Double up for infinite scroll
  const content = [...items, ...items].join('<span style="color:#1a2535;margin:0 20px">◆</span>');
  ticker.innerHTML = content;

  // Restart animation
  ticker.style.animation = 'none';
  void ticker.offsetWidth;
  const duration = Math.max(40, items.length * 5);
  ticker.style.animation = `ticker-scroll ${duration}s linear infinite`;
}

// ─── 마켓 카드 HTML 생성 ────────────────────────────────────
function buildMarketCard(symbol, name, price, change, changePct, currency = 'USD', cls = 'market-card') {
  if (!price && price !== 0) {
    return `<div class="${cls} error-card">⚠ ${symbol}<br><small>데이터 없음</small></div>`;
  }
  const { html: changeHtml, direction } = formatChange(change, changePct);
  const borderColor = direction > 0 ? 'var(--green)' : direction < 0 ? 'var(--red)' : 'var(--border)';
  return `
    <div class="${cls} flash-update" style="border-left:3px solid ${borderColor}">
      <div class="card-symbol">${symbol}</div>
      <div class="card-name">${name}</div>
      <div class="card-price">${formatPrice(price, currency)}</div>
      ${changeHtml}
    </div>`;
}

// ─── 암호화폐 렌더링 ───────────────────────────────────────
function renderCrypto(data) {
  const grid = document.getElementById('crypto-grid');
  if (!data) { grid.innerHTML = '<div class="error-card">암호화폐 데이터 오류</div>'; return; }

  const btc = data.bitcoin || {};
  const eth = data.ethereum || {};

  grid.innerHTML = [
    buildMarketCard(
      'BTC/USD', 'Bitcoin',
      btc.usd, btc.usd - btc.usd / (1 + btc.usd_24h_change / 100), btc.usd_24h_change
    ),
    buildMarketCard(
      'ETH/USD', 'Ethereum',
      eth.usd, eth.usd - eth.usd / (1 + eth.usd_24h_change / 100), eth.usd_24h_change
    ),
  ].join('');
}

// ─── 방산주 렌더링 ─────────────────────────────────────────
function renderDefense(data) {
  const DEFENSE_STOCKS = [
    { sym: 'LMT', name: '록히드마틴' },
    { sym: 'RTX', name: '레이시온' },
    { sym: 'NOC', name: '노스럽그루먼' },
    { sym: 'GD', name: '제너럴다이나믹스' },
  ];

  const defGrid = document.getElementById('defense-grid');
  const itaCard = document.getElementById('ita-card');

  defGrid.innerHTML = DEFENSE_STOCKS.map(({ sym, name }) => {
    const d = data[sym] || {};
    return buildMarketCard(sym, name, d.price, d.change, d.changePct, 'USD', 'defense-card');
  }).join('');

  const ita = data['ITA'] || {};
  itaCard.outerHTML = buildMarketCard('ITA', 'iShares 방산 ETF', ita.price, ita.change, ita.changePct, 'USD', 'market-card wide');
}

// ─── 원자재 렌더링 ─────────────────────────────────────────
function renderCommodities(data) {
  const grid = document.getElementById('commodity-grid');
  const gold = data['GC=F'] || {};
  const wti = data['CL=F'] || {};
  const brent = data['BZ=F'] || {};

  grid.innerHTML = [
    buildMarketCard('GOLD', '금 선물 (온스)', gold.price, gold.change, gold.changePct),
    buildMarketCard('WTI', 'WTI 원유 (배럴)', wti.price, wti.change, wti.changePct),
    buildMarketCard('BRENT', '브렌트유 (배럴)', brent.price, brent.change, brent.changePct),
  ].join('');

  // 3-column for commodities
  grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
}

// ─── 지수 렌더링 ───────────────────────────────────────────
function renderIndices(data) {
  const grid = document.getElementById('index-grid');
  const sp = data['^GSPC'] || {};
  const vix = data['^VIX'] || {};

  grid.innerHTML = [
    buildMarketCard('S&P 500', '미국 주식시장', sp.price, sp.change, sp.changePct),
    buildMarketCard('VIX', '공포 지수', vix.price, vix.change, vix.changePct),
  ].join('');
}

// ─── 환율 렌더링 ───────────────────────────────────────────
function renderFX(data) {
  const grid = document.getElementById('fx-grid');
  const jpy = data['JPY=X'] || {};
  const eur = data['EURUSD=X'] || {};

  grid.innerHTML = [
    buildMarketCard('USD/JPY', '엔화 (안전자산)', jpy.price, jpy.change, jpy.changePct, 'JPY'),
    buildMarketCard('EUR/USD', '유로/달러', eur.price, eur.change, eur.changePct, 'USD'),
  ].join('');
}

// ─── 시장 분석 생성 ────────────────────────────────────────
function renderAnalysis(crypto, markets) {
  const list = document.getElementById('analysis-list');
  const points = [];

  const btcChange = crypto?.bitcoin?.usd_24h_change || 0;
  const vixPrice = markets?.['^VIX']?.price || 0;
  const goldChange = markets?.['GC=F']?.changePct || 0;
  const oilChange = markets?.['CL=F']?.changePct || 0;
  const ltmChange = markets?.['LMT']?.changePct || 0;

  if (vixPrice > 30) {
    points.push({ text: `VIX ${vixPrice.toFixed(1)} — 시장 극도의 공포 상태`, cls: 'alert' });
  } else if (vixPrice > 20) {
    points.push({ text: `VIX ${vixPrice.toFixed(1)} — 시장 불안 확대`, cls: 'warn' });
  } else if (vixPrice > 0) {
    points.push({ text: `VIX ${vixPrice.toFixed(1)} — 시장 비교적 안정`, cls: '' });
  }

  if (goldChange > 1) {
    points.push({ text: `금 ${goldChange > 0 ? '+' : ''}${goldChange.toFixed(2)}% — 안전자산 수요 급증`, cls: 'warn' });
  }

  if (oilChange > 2) {
    points.push({ text: `원유 +${oilChange.toFixed(2)}% — 호르무즈 해협 리스크 반영`, cls: 'warn' });
  } else if (oilChange > 0) {
    points.push({ text: `원유 +${oilChange.toFixed(2)}% — 지정학적 긴장 소폭 반영`, cls: '' });
  }

  if (ltmChange > 1) {
    points.push({ text: `방산주(LMT) +${ltmChange.toFixed(2)}% — 전쟁 기대감 강세`, cls: 'warn' });
  }

  if (btcChange > 3) {
    points.push({ text: `BTC +${btcChange.toFixed(2)}% — 달러 불신·안전자산 수요`, cls: '' });
  } else if (btcChange < -3) {
    points.push({ text: `BTC ${btcChange.toFixed(2)}% — 리스크오프 매도세`, cls: 'warn' });
  }

  points.push({ text: '이란 핵시설 공격 시 원유 즉각 급등 예상', cls: 'alert' });
  points.push({ text: '호르무즈 봉쇄 시 글로벌 원유 공급 20% 위협', cls: 'alert' });
  points.push({ text: '분쟁 격화 → 금·달러·엔화·비트코인 동반 강세', cls: '' });
  points.push({ text: '방산ETF(ITA) 전쟁 프리미엄 내포 중', cls: 'warn' });

  list.innerHTML = points.slice(0, 7).map((p) =>
    `<li class="${p.cls}">${p.text}</li>`
  ).join('');
}

// ─── 데모 모드 배너 ────────────────────────────────────────
function showDemoBanner(show) {
  let banner = document.getElementById('demo-banner');
  if (show && !banner) {
    banner = document.createElement('div');
    banner.id = 'demo-banner';
    banner.innerHTML = `
      <span style="font-size:0.9rem">⚠</span>
      <span><strong>데모 모드</strong> — 뉴스는 시나리오 데이터입니다.
      실시간 뉴스를 받으려면 <a href="https://newsapi.org" target="_blank" style="color:#06b6d4">newsapi.org</a>에서 무료 키를 발급 후
      <code>NEWS_API_KEY=xxxx node server.js</code> 로 실행하세요.</span>
    `;
    banner.style.cssText = `
      display:flex;align-items:center;gap:10px;
      background:rgba(234,88,12,0.12);border-bottom:1px solid rgba(234,88,12,0.4);
      padding:7px 16px;font-family:monospace;font-size:0.72rem;color:#fb923c;
    `;
    document.querySelector('.news-panel').insertBefore(
      banner,
      document.querySelector('.filter-bar')
    );
  } else if (!show && banner) {
    banner.remove();
  }
}

// ─── 뉴스 로드 ─────────────────────────────────────────────
async function loadNews(force = false) {
  const btn = document.getElementById('news-refresh-btn');
  if (btn) btn.textContent = '⟳ 로딩...';

  try {
    const res = await fetch('/api/news');
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      showDemoBanner(json.demoMode === true);
      renderNews(json.data);
    } else {
      document.getElementById('news-feed').innerHTML =
        '<div class="no-news">관련 뉴스를 찾을 수 없습니다.<br><small>잠시 후 다시 시도해 주세요.</small></div>';
    }
  } catch (e) {
    document.getElementById('news-feed').innerHTML =
      `<div class="no-news">뉴스 서버 연결 오류<br><small>${e.message}</small></div>`;
  } finally {
    if (btn) btn.textContent = '↻ 새로고침';
  }
}

// ─── 마켓 데모 배너 ────────────────────────────────────────
function showMarketDemoBanner(show) {
  let banner = document.getElementById('market-demo-banner');
  const target = document.querySelector('.markets-panel');
  if (show && !banner) {
    banner = document.createElement('div');
    banner.id = 'market-demo-banner';
    banner.innerHTML = `⚠ <strong>시장 데이터 데모</strong> — 전쟁 시나리오 기반 예시값`;
    banner.style.cssText = `
      background:rgba(234,88,12,0.1);border-bottom:1px solid rgba(234,88,12,0.3);
      padding:5px 12px;font-family:monospace;font-size:0.68rem;color:#fb923c;text-align:center;
    `;
    target.insertBefore(banner, target.firstChild);
  } else if (!show && banner) {
    banner.remove();
  }
}

// ─── 마켓 데이터 로드 ──────────────────────────────────────
async function loadMarkets() {
  try {
    const [cryptoRes, marketsRes] = await Promise.allSettled([
      fetch('/api/crypto').then((r) => r.json()),
      fetch('/api/markets').then((r) => r.json()),
    ]);

    const crypto = cryptoRes.status === 'fulfilled' && cryptoRes.value.success
      ? cryptoRes.value.data : null;
    const marketsJson = marketsRes.status === 'fulfilled' && marketsRes.value.success
      ? marketsRes.value : null;
    const markets = marketsJson?.data || null;

    if (marketsJson?.demoMode) showMarketDemoBanner(true);
    else showMarketDemoBanner(false);

    if (crypto) renderCrypto(crypto);
    if (markets) {
      renderDefense(markets);
      renderCommodities(markets);
      renderIndices(markets);
      renderFX(markets);
    }
    if (crypto || markets) {
      renderAnalysis(crypto, markets);
    }
  } catch (e) {
    console.error('마켓 데이터 오류:', e);
  }
}

// ─── 전체 로드 ─────────────────────────────────────────────
async function loadAll() {
  const lastUpdateEl = document.getElementById('last-update');
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  await Promise.allSettled([loadNews(), loadMarkets()]);

  if (lastUpdateEl) lastUpdateEl.textContent = timeStr;
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
loadAll();
