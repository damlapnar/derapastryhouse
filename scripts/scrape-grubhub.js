const { chromium } = require('playwright-chromium');
const fs = require('fs');
const path = require('path');

const URL = 'https://www.grubhub.com/restaurant/dera-pastry-house-1076-main-ave-clifton/12091408';
const OUT = path.join(__dirname, '..', 'scripts', 'menu.json');

const IS_CI = process.env.CI === 'true';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  console.log('GrubHub yukleniyor...');
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.log('Warn:', e.message));
  await page.waitForTimeout(IS_CI ? 12000 : 8000);

  // GrubHub serves the restaurant page with NO menu at all when the listing is
  // unavailable (paused, or outside opening hours) — header and "similar
  // options nearby" only. That is not a scraper bug and no selector will find
  // anything, so say so plainly instead of reporting an empty menu.
  const listing = await page.evaluate(() => ({
    unavailable: /Not available on Grubhub right now|currently unavailable/i.test(document.body.innerText),
    closed: /(^|\n)\s*Closed\s*(\n|$)/.test(document.body.innerText),
    hasRestaurantPage: !!document.querySelector('[data-testid="restaurant-page"], [data-testid="restaurant-header"]'),
    title: document.title,
  }));

  if (listing.unavailable) {
    console.error('GrubHub "Not available on Grubhub right now" diyor — sayfada hic menu yok.');
    console.error('Bu bir scraper hatasi DEGIL: isletmenin GrubHub listelemesi su an kapali/duraklatilmis.');
    console.error('GrubHub merchant hesabini kontrol et. menu.json GUNCELLENMEDI.');
    await browser.close();
    process.exit(2);
  }
  if (!listing.hasRestaurantPage) {
    console.error('Restoran sayfasi yuklenemedi (bot engeli veya yonlendirme olabilir). Baslik:', listing.title);
    console.error('menu.json GUNCELLENMEDI.');
    await browser.close();
    process.exit(3);
  }
  if (listing.closed) console.log('Not: sayfa "Closed" gosteriyor, menu yine de okunmaya calisilacak.');

  const allItems = {};

  async function collectVisible() {
    const items = await page.evaluate(() => {
      const result = [];
      // GrubHub has renamed these classes before. Try the known ones first,
      // then data-testid, then any element whose class merely contains
      // "menuitem" — first selector that matches anything wins.
      const CANDIDATES = [
        '.menuItem, .restaurant-menu-item',
        '[data-testid="menu-item"], [data-testid^="menuItem"], [data-testid*="menu-item"]',
        '[class*="menuItem"], [class*="MenuItem"]',
      ];
      let nodes = [];
      for (const sel of CANDIDATES) {
        try { nodes = [...document.querySelectorAll(sel)]; } catch (e) { nodes = []; }
        if (nodes.length) break;
      }

      nodes.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -300 || rect.top > window.innerHeight + 300) return;

        const name = (el.querySelector('.menuItem-name, [data-testid*="item-name"], h6, h5, h4, h3, [class*="name"]')?.innerText || '').trim();
        if (!name) return;

        const desc = (el.querySelector('.menuItem-description, [data-testid*="description"], p, [class*="desc"]')?.innerText || '').trim();
        const price = (el.querySelector('.menuItem-priceAmount, [data-testid*="price"], [class*="price"]')?.innerText || '').trim();

        const imgEl = el.querySelector('img');
        let img = imgEl?.src || '';
        if (img.startsWith('data:')) img = '';
        img = img.replace(/w_\d+,q_auto:[^,]+,fl_lossy,dpr_[\d.]+,c_fill,f_auto,h_\d+/, 'w_600,q_auto:best,f_auto,c_fill,h_600');

        let category = 'OTHER';
        let p = el.parentElement;
        for (let i = 0; i < 15; i++) {
          if (!p) break;
          const h = p.querySelector('.menuSection-title, .menuSection-headerTitle, [data-testid*="section-title"], [class*="menuSection"] h2, [class*="MenuSection"] h2');
          if (h && h.innerText.trim()) { category = h.innerText.trim().toUpperCase(); break; }
          p = p.parentElement;
        }

        result.push({ name, desc, price, img, category });
      });
      return result;
    });

    items.forEach(item => {
      if (!allItems[item.name]) allItems[item.name] = item;
      else if (!allItems[item.name].img && item.img) allItems[item.name].img = item.img;
    });
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
  await collectVisible();

  console.log('Scrolling...');
  for (let i = 0; i < 80; i++) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(IS_CI ? 500 : 350);
    if (i % 3 === 0) await collectVisible();
  }

  await page.waitForTimeout(2000);
  await collectVisible();

  const items = Object.values(allItems);
  console.log(`Toplam: ${items.length} benzersiz item`);

  // If GrubHub changes its markup or blocks the bot we get a near-empty scrape.
  // Overwriting menu.json with that would wipe the live menu, so bail out and
  // let the workflow fail loudly instead.
  const MIN_ITEMS = 20;
  if (items.length < MIN_ITEMS) {
    console.error(`Sadece ${items.length} item bulundu (en az ${MIN_ITEMS} bekleniyor). menu.json GUNCELLENMEDI.`);
    await browser.close();
    process.exit(1);
  }

  // Kategorilere gore grupla
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ name: item.name, desc: item.desc, price: item.price, img: item.img });
  });

  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), total: items.length, categories: byCategory }, null, 2));
  console.log('menu.json kaydedildi:', OUT);

  await browser.close();
})();
