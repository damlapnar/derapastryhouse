// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES_TO_CHECK = [
  { name: 'Home', path: '/' },
  { name: 'Menu', path: '/products.html' },
  { name: 'Gallery', path: '/gallery.html' },
  { name: 'About', path: '/about.html' },
  { name: 'Contact', path: '/contact.html' },
  { name: 'Custom Order', path: '/custom-order.html' },
];

async function runAxe(page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('#dera-cart-sidebar')
    // SnapWidget's Instagram embed renders its own thumbnail <a> tags with no
    // accessible text (axe: link-name). That markup is vendor-controlled and
    // cannot be fixed from this repo, so it is out of scope for the gate —
    // see the audit notes for the "replace or chase the vendor" follow-up.
    .exclude('iframe.snapwidget-widget')
    .analyze();
}

for (const p of PAGES_TO_CHECK) {
  test(`Axe: ${p.name} has no critical WCAG violations`, async ({ page }) => {
    // The scroll-reveal animation starts elements at opacity 0 and fades them
    // in. Running axe mid-fade measures the blended colour and reports bogus
    // contrast failures, so audit the settled page the way a reduced-motion
    // user sees it (animations.min.css already reveals everything in that mode).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(p.path);
    await page.evaluate(() => document.querySelectorAll('.reveal-ready').forEach(el => el.classList.add('revealed')));
    const results = await runAxe(page);
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      critical,
      `${p.name}:\n${critical.map(v => `  [${v.impact}] ${v.id}: ${v.description}\n    ${v.nodes[0]?.html || ''}`).join('\n')}`
    ).toHaveLength(0);
  });
}

test('Axe: Cart sidebar passes after opening', async ({ page }) => {
  await page.goto('/products.html');
  await page.evaluate(() => localStorage.removeItem('dera-cart'));
  await page.reload();
  await page.locator('.cart-nav-btn').first().click();
  await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);

  const results = await new AxeBuilder({ page })
    .include('#dera-cart-sidebar')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  expect(
    critical,
    critical.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
  ).toHaveLength(0);
});

test.describe('Accessibility — Manual Checks', () => {
  test('Gallery images are not missing alt attribute', async ({ page }) => {
    await page.goto('/gallery.html');
    // Every img must HAVE an alt attribute (even if empty for decorative).
    // Missing alt entirely is the WCAG violation.
    const imgsWithoutAlt = page.locator('img:not([alt])');
    await expect(imgsWithoutAlt).toHaveCount(0);
  });

  test('All menu card images have alt text', async ({ page }) => {
    await page.goto('/products.html');
    const imgs = page.locator('.menu-card img');
    const count = await imgs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute('alt');
      expect(alt, `menu card img[${i}] missing alt`).toBeTruthy();
    }
  });

  test('Cart nav button has aria-label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cart-nav-btn').first()).toHaveAttribute('aria-label');
  });

  test('Cart sidebar close button (.cart-close-btn) has aria-label', async ({ page }) => {
    await page.goto('/products.html');
    await page.locator('.cart-nav-btn').first().click();
    await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);
    await expect(page.locator('.cart-close-btn')).toHaveAttribute('aria-label');
  });

  test('Checkout form labels are linked to inputs via for/id', async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();
    await page.locator('.card-action').first().locator('.add-btn').click();
    await page.locator('#cart-checkout-btn').click();

    const modal = page.locator('#dera-checkout-modal');
    await expect(modal).toBeVisible();

    // Check that the name input has a linked label
    await expect(modal.locator('#co-name')).toBeAttached();
    await expect(modal.locator('label[for="co-name"]')).toBeAttached();
    await expect(modal.locator('#co-email')).toBeAttached();
    await expect(modal.locator('label[for="co-email"]')).toBeAttached();
    await expect(modal.locator('#co-pickup')).toBeAttached();
    await expect(modal.locator('label[for="co-pickup"]')).toBeAttached();
  });

  test('Heading hierarchy is correct on home page', async ({ page }) => {
    await page.goto('/');
    const h1 = await page.locator('h1').count();
    expect(h1, 'should have exactly one h1').toBe(1);
  });

  test('Touch targets (stepper buttons) are at least 36px', async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();

    const firstAction = page.locator('.card-action').first();
    await firstAction.locator('.add-btn').click();

    // Wait for stepper to become visible
    const stepperBtn = firstAction.locator('.stepper-btn').first();
    await expect(stepperBtn).toBeVisible();

    const box = await stepperBtn.boundingBox();
    expect(box, 'stepper button not found in DOM').not.toBeNull();
    expect(box.width, 'stepper width should be ≥36px').toBeGreaterThanOrEqual(36);
    expect(box.height, 'stepper height should be ≥36px').toBeGreaterThanOrEqual(36);
  });
});

test.describe('Accessibility — Keyboard Navigation', () => {
  test('Cart sidebar can be closed with Escape key', async ({ page }) => {
    await page.goto('/products.html');
    await page.locator('.cart-nav-btn').first().click();
    await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#dera-cart-sidebar')).not.toHaveClass(/open/);
  });

  test('Checkout modal can be closed with Escape key', async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();
    await page.locator('.card-action').first().locator('.add-btn').click();
    await page.locator('#cart-checkout-btn').click();
    await expect(page.locator('#dera-checkout-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#dera-checkout-modal')).not.toHaveClass(/open/);
  });

  test('Cart button is in the keyboard tab order', async ({ page }) => {
    await page.goto('/');
    const cartBtn = page.locator('.cart-nav-btn').first();
    await expect(cartBtn).toBeVisible();

    // Assert the property the site controls: the control is a real focusable
    // element that is not removed from the tab order. Driving Tab from the
    // keyboard is not portable — WebKit on macOS skips buttons and links
    // unless the OS "Full Keyboard Access" setting is on, so a Tab-walk here
    // fails on a correctly built page.
    const state = await cartBtn.evaluate(el => {
      el.focus();
      return {
        tagName: el.tagName,
        tabIndex: el.tabIndex,
        disabled: !!el.disabled,
        isFocused: document.activeElement === el,
      };
    });
    expect(state.disabled, 'cart button should not be disabled').toBe(false);
    expect(state.tabIndex, 'cart button should not be removed from tab order').toBeGreaterThanOrEqual(0);
    expect(state.isFocused, 'cart button should be focusable').toBe(true);
  });

  test('Add button is keyboard accessible (Enter key)', async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();
    await page.locator('.add-btn').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);
  });
});
