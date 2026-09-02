const fs = require('fs');
const path = require('path');

const menuData = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu.json'), 'utf8'));
const productsPath = path.join(__dirname, '..', 'products.html');
let products = fs.readFileSync(productsPath, 'utf8');

const CORRECT_ORDER = [
  'CAKES (SLICE & WHOLE)',
  'BREAKFAST PASTRIES',
  'SIGNATURE DESSERT CUPS & MINI TREATS',
  'CHEESECAKES',
  'BEVERAGES',
  'CUPCAKES',
  'COOKIES',
  'SPECIAL DAY ORDERS',
  'BAKLAVA',
  'DEALS',
  'WEDDING ORDERS',
  'CUSTOM ORDERS',
  'SEASONAL SPECIALS',
  'MINI COLLECTIONS',
  'MORE FAVORITES',
];

// Fallback bucket: items whose name matches no rule land here instead of being
// silently dropped from the site (which used to hide real, priced products).
const FALLBACK_CATEGORY = 'MORE FAVORITES';

const CATEGORY_ICONS = {
  'CAKES (SLICE & WHOLE)': '🎂',
  'BREAKFAST PASTRIES': '🥐',
  'SIGNATURE DESSERT CUPS & MINI TREATS': '🍮',
  'CHEESECAKES': '🧀',
  'BEVERAGES': '☕',
  'CUPCAKES': '🧁',
  'COOKIES': '🍪',
  'SPECIAL DAY ORDERS': '🎉',
  'BAKLAVA': '🌙',
  'DEALS': '🏷️',
  'WEDDING ORDERS': '💍',
  'CUSTOM ORDERS': '✨',
  'SEASONAL SPECIALS': '🍂',
  'MINI COLLECTIONS': '🎀',
  'MORE FAVORITES': '⭐',
};

// Strip accents so "Éclair"/"Trileçe" match the same rules as "Eclair"/"Trilece".
function normalizeName(name) {
  return (name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function correctCategory(name) {
  const n = normalizeName(name);
  if (/cheesecake/.test(n)) return 'CHEESECAKES';
  // Combo deals must be checked before the single-item rules they contain.
  if (/bagel.*cream cheese.*coffee|\bcombo\b|\bdeal\b/.test(n)) return 'DEALS';
  if (/croissant|danish|banana bread|bagel|puff|cinnamon roll|ham & swiss|spinach/.test(n)) return 'BREAKFAST PASTRIES';
  if (/profiterol|eclair|tart|chocolate.covered.straw|dubai|macaron|pudding/.test(n)) return 'SIGNATURE DESSERT CUPS & MINI TREATS';
  if (/anniversary cake|engagement cake|baby shower cake|gender reveal|graduation cake|office celebr/.test(n)) return 'SPECIAL DAY ORDERS';
  if (/wedding cake/.test(n)) return 'WEDDING ORDERS';
  if (/cupcake/.test(n)) return 'CUPCAKES';
  // "shortcake", "pancake" etc. have no word boundary before "cake", so match
  // the suffix too — this is what used to drop every Strawberry Shortcake row.
  if (/cake\b/.test(n)) return 'CAKES (SLICE & WHOLE)';
  if (/brownie|trilece|mozaik|fraise|biscoff/.test(n)) return 'CAKES (SLICE & WHOLE)';
  if (/coke|sprite|\bwater\b|turkish tea|turkish coffee|hot chocolate|dr pepper|canary dry|iced latte|cafe latte|americano|mountain dew|cappuc/.test(n)) return 'BEVERAGES';
  if (/\bcookies?\b/.test(n)) return 'COOKIES';
  if (/baklava|carrot slice|cold pist/.test(n)) return 'BAKLAVA';
  if (/fruit basket|stuffed dates|filled dates|custom gift/.test(n)) return 'CUSTOM ORDERS';
  if (/pumpkin/.test(n)) return 'SEASONAL SPECIALS';
  if (/bundt/.test(n)) return 'MINI COLLECTIONS';
  return null;
}

// Tum itemlari topla ve yeniden kategorize et.
// Dedupe is case/whitespace-insensitive: GrubHub lists the same product with
// different capitalisation ("Strawberry Shortcake" vs "Strawberry shortcake"),
// which used to publish the item twice.
const allItems = {};
Object.values(menuData.categories).forEach(catItems => {
  catItems.forEach(item => {
    const key = normalizeName(item.name).replace(/\s+/g, ' ').trim();
    if (!key) return;
    if (!allItems[key]) allItems[key] = item;
    else {
      if (!allItems[key].img && item.img) allItems[key].img = item.img;
      if (!allItems[key].desc && item.desc) allItems[key].desc = item.desc;
    }
  });
});

const categorized = {};
const uncategorized = [];
Object.values(allItems).forEach(item => {
  const cat = correctCategory(item.name) || FALLBACK_CATEGORY;
  if (cat === FALLBACK_CATEGORY) uncategorized.push(item.name);
  if (!categorized[cat]) categorized[cat] = [];
  categorized[cat].push(item);
});

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// "CAKES (SLICE & WHOLE)" -> "Cakes (Slice & Whole)"
function titleCase(str) {
  return str.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
}

// Cart items are keyed by this id, so two products must never collapse to one.
const usedIds = new Set();
function itemId(name) {
  let base = normalizeName(name).replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').substring(0, 60) || 'item';
  let id = base, n = 2;
  while (usedIds.has(id)) id = `${base}-${n++}`;
  usedIds.add(id);
  return id;
}

function parsePrice(raw) {
  // Take the FIRST money figure only — "$10.00 $8.00" (struck-through discounts)
  // used to parse as 10.008.
  const m = String(raw || '').match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function itemHtml(item) {
  const img = item.img
    ? `<img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="menu-card-no-img">&#127856;</div>`;
  const desc = item.desc ? `<p>${escapeHtml(item.desc)}</p>` : '';
  const price = item.price ? `<span class="menu-card-price">${escapeHtml(item.price)}</span>` : '';
  const priceNum = parsePrice(item.price);
  const id = itemId(item.name);

  // cart.js drives the card UI through .card-action + data-* attributes
  // (cardAdd/cardStep, updateCardUI). The old .add-to-cart-btn markup called
  // deraCart.add directly, so items went into the cart but the card never
  // switched to the +/- stepper and never showed a quantity.
  const bottomRow = priceNum > 0
    ? `
            <div class="card-bottom-row">
              ${price}
              <div class="card-action" data-id="${escapeHtml(id)}" data-name="${escapeHtml(item.name)}" data-price="${priceNum}" data-img="${escapeHtml(item.img || '')}">
                <button class="add-btn" type="button" onclick="cardAdd(this)">Add</button>
                <div class="card-stepper hidden">
                  <button class="stepper-btn" type="button" onclick="cardStep(this,-1)" aria-label="Remove one ${escapeHtml(item.name)}">&#x2212;</button>
                  <span class="card-qty">0</span>
                  <button class="stepper-btn" type="button" onclick="cardStep(this,1)" aria-label="Add one more ${escapeHtml(item.name)}">&#x2B;</button>
                </div>
              </div>
            </div>`
    : (price ? `\n            <div class="card-bottom-row">${price}</div>` : '');

  return `        <div class="menu-card">
          ${img}
          <div class="menu-card-body">
            <h3>${escapeHtml(item.name)}</h3>
            ${desc}${bottomRow}
          </div>
        </div>`;
}

let menuHtml = '\n';
CORRECT_ORDER.forEach(cat => {
  const items = categorized[cat];
  if (!items || items.length === 0) return;
  const icon = CATEGORY_ICONS[cat] || '';
  const title = escapeHtml(titleCase(cat));
  menuHtml += `    <div class="menu-category">
      <h2>${icon} ${title}</h2>
      <div class="menu-grid">
${items.map(itemHtml).join('\n')}
      </div>
    </div>\n\n`;
});

function fail(msg) {
  console.error('inject-menu: ' + msg + ' — products.html DEGISTIRILMEDI.');
  process.exit(1);
}

if (!menuHtml.includes('menu-category')) fail('Uretilen menu bos');

// Tolerate extra attributes/whitespace on the markers. The old exact-string
// match silently stopped matching when id="main-content" was added, and the
// broken -1 guard below then truncated the whole <head> off the page.
const START_RE = /<main\b[^>]*\bclass="[^"]*\bmenu-page\b[^"]*"[^>]*>/i;
const END_RE = /<div\b[^>]*\bclass="[^"]*\bmenu-order-cta\b[^"]*"[^>]*>/i;

const startMatch = products.match(START_RE);
const endMatch = products.match(END_RE);

if (!startMatch) fail('Baslangic marker bulunamadi (<main class="menu-page" ...>)');
if (!endMatch) fail('Bitis marker bulunamadi (<div class="menu-order-cta" ...>)');

const startIdx = startMatch.index + startMatch[0].length;
const endIdx = endMatch.index;
if (endIdx <= startIdx) fail('Marker sirasi hatali (bitis, baslangictan once)');

const newProducts = products.substring(0, startIdx) + '\n' + menuHtml + '    ' + products.substring(endIdx);

// Sanity-check the result before overwriting a live page.
const REQUIRED = ['<!DOCTYPE html>', '<html lang="en">', '<head>', '</head>', '<title>', '</html>', 'styles.min.css'];
const missing = REQUIRED.filter(t => !newProducts.includes(t));
if (missing.length) fail('Cikti bozuk, eksik: ' + missing.join(', '));
if (newProducts.length < 5000) fail('Cikti sasirtici derecede kucuk: ' + newProducts.length + ' byte');

fs.writeFileSync(productsPath, newProducts, 'utf8');

// Keep the menu page's sitemap entry in step with the scrape date instead of
// letting it drift months behind the content.
try {
  const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
  const scrapedOn = String(menuData.scraped_at || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(scrapedOn) && fs.existsSync(sitemapPath)) {
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const updated = sitemap.replace(
      /(<loc>https:\/\/derapastryhouse\.com\/products<\/loc>\s*<lastmod>)[^<]*(<\/lastmod>)/,
      '$1' + scrapedOn + '$2'
    );
    if (updated !== sitemap) {
      fs.writeFileSync(sitemapPath, updated, 'utf8');
      console.log('sitemap.xml /products lastmod -> ' + scrapedOn);
    }
  }
} catch (e) {
  console.warn('sitemap guncellenemedi (kritik degil): ' + e.message);
}

const total = Object.values(categorized).reduce((s, a) => s + a.length, 0);
const withPhotos = Object.values(categorized).flat().filter(i => i.img).length;
console.log(`${total} item (${withPhotos} fotograf) eklendi.`);
if (uncategorized.length) {
  console.log(`UYARI: ${uncategorized.length} item kural eslesmedi, "${FALLBACK_CATEGORY}" altina alindi:`);
  uncategorized.forEach(n => console.log('  - ' + n));
}
