import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('desktop and mobile: PDF identity, category navigation, search, quantities, persistence, checkout errors', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Cardápio', exact: true })).toBeVisible();
  await expect(page.locator('.product-row')).toHaveCount(27);
  await expect(page.locator('.category-banner')).toContainText('Cervejas');
  const addCorona = page
    .locator('.product-row')
    .filter({ hasText: 'Corona Extra Long Neck 330 ml' })
    .getByRole('button', { name: 'Adicionar Corona Extra Long Neck 330 ml', exact: true });
  await addCorona.dblclick();
  await expect(page.locator('.order-panel .cart-total')).toContainText('17,00');
  await page.reload();
  await expect(page.locator('.order-panel .cart-total')).toContainText('17,00');
  await page.getByRole('button', { name: /02 Destilados/ }).click();
  await expect(page.locator('.product-row')).toHaveCount(46);
  await page.getByRole('searchbox').fill('gelo agua de coco');
  await expect(page.locator('.product-row')).toHaveCount(1);
  await page.getByRole('searchbox').fill('produto inexistente abc');
  await expect(page.getByText('Nenhum produto por aqui')).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: /01 Cervejas/ }).click();
  await page.evaluate(() => document.fonts.ready);
  await mkdir('tmp/qa', { recursive: true });
  await page.screenshot({ path: 'tmp/qa/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mobile-cart')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tmp/qa/mobile.png', fullPage: true });
  await page.getByRole('button', { name: /Ver pedido/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Seu nome', { exact: true }).fill('Cliente Teste');
  await page.getByLabel('WhatsApp com DDD', { exact: true }).fill('(31) 99999-0000');
  await page.getByLabel('Vou retirar').check();
  await page.getByLabel('Confirmo que tenho 18 anos ou mais.').check();
  // Intercept checkout: the browser test never reaches the real order endpoint.
  await page.route('**/api/orders', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Atendimento indisponível no teste. Seus itens continuam no carrinho.',
      }),
    }),
  );
  await page.getByRole('button', { name: 'Concluir pedido', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('carrinho');
  await expect(page.getByRole('dialog').locator('.cart-total')).toContainText('17,00');
  await page.screenshot({ path: 'tmp/qa/checkout.png', fullPage: true });
  await page.getByRole('button', { name: 'Fechar pedido' }).click();
  await page.locator('.mobile-category-toggle').click();
  await page
    .locator('.mobile-categories')
    .getByRole('button', { name: /09 Tabacaria/ })
    .click();
  await expect(page.locator('.product-row')).toHaveCount(10);
  await page.setViewportSize({ width: 320, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of [
    'Cervejas',
    'Destilados',
    'Vinhos e espumantes',
    'Bebidas não alcoólicas',
    'Drinks e bebidas prontas',
    'Combos',
    'Petiscos e conveniência',
    'Gelos e acessórios',
    'Tabacaria',
  ]) {
    await page.locator('.mobile-category-toggle').click();
    await page
      .locator('.mobile-categories .category-link')
      .filter({ has: page.getByText(name, { exact: true }) })
      .click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      name,
    ).toBe(true);
  }
  await page.unroute('**/api/orders');
  await page.route('**/api/orders', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        order: {
          id: 'e95c710e-10e5-4db6-93bd-d0594b6fe78a',
          reference: 'GB-E95C710E',
          total_cents: 1700,
          delivery_status: 'delivered',
        },
      }),
    }),
  );
  await page.getByRole('button', { name: /Ver pedido/ }).click();
  await page.getByRole('button', { name: 'Concluir pedido', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido enviado!' })).toBeVisible();
  await expect(page.locator('.receipt')).toContainText('GB-E95C710E');
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'Falar com a loja' }),
  ).toBeFocused();
  await expect(page.locator('.mobile-cart')).toHaveCount(0);
  await page.screenshot({ path: 'tmp/qa/success.png', fullPage: true });
  expect(errors).toEqual([]);
  const invalid = await request.post('/api/orders', { data: { items: [] } });
  expect(invalid.status()).toBe(400);
  const crossOrigin = await request.post('/api/orders', {
    headers: { Origin: 'https://untrusted.example' },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
});
