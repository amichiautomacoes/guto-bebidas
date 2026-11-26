import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('refinement: keyboard, 44px targets, responsive widths, field recovery, and an empty checkout', async ({
  page,
}) => {
  let submissions = 0;
  await page.route('**/api/orders', (route) => {
    submissions++;
    const body = route.request().postDataJSON();
    expect(typeof body.items[0].product_id).toBe('number');
    expect(body.items[0].quantity).toBe(1);
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Atendimento indisponível no teste. Seus itens continuam no carrinho.',
      }),
    });
  });
  await page.goto('/cardapio');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir para os produtos' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#produtos')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('searchbox')).toBeFocused();
  expect(
    await page.getByRole('searchbox').evaluate((element) => getComputedStyle(element).outlineWidth),
  ).toBe('2px');
  for (const width of [1440, 1024, 820, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `overflow at ${width}`,
    ).toBe(true);
    const box = await page.locator('.product-row .quantity button').first().boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page
        .locator('.product-name')
        .first()
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeGreaterThanOrEqual(16);
    await expect(page.getByRole('link', { name: 'Fale com a gente no WhatsApp' })).toBeVisible();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Adicionar Corona Extra Long Neck 330 ml', exact: true })
    .click();
  await page.getByRole('button', { name: /Ver pedido/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Concluir pedido', exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await dialog.getByRole('button', { name: 'Concluir pedido', exact: true }).click();
  await expect(page.getByLabel('Seu nome', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Seu nome', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByText('Informe seu nome.', { exact: true })).toBeVisible();
  expect(submissions).toBe(0);
  await page.getByLabel('Seu nome', { exact: true }).fill('Cliente Teste');
  await page.getByLabel('WhatsApp com DDD', { exact: true }).fill('123');
  await page.getByLabel('Endereço de entrega', { exact: true }).fill('Rua de Teste, 10, Centro');
  await page.getByLabel('Confirmo que tenho 18 anos ou mais.').check();
  await dialog.getByRole('button', { name: 'Concluir pedido', exact: true }).click();
  await expect(page.getByLabel('WhatsApp com DDD', { exact: true })).toBeFocused();
  await expect(
    page.getByText('Informe um WhatsApp válido com DDD.', { exact: true }),
  ).toBeVisible();
  expect(submissions).toBe(0);
  await mkdir('tmp/qa', { recursive: true });
  await page.screenshot({ path: 'tmp/qa/refinement-validation.png' });
  await page.getByLabel('WhatsApp com DDD', { exact: true }).fill('(31) 99999-0000');
  await dialog.getByRole('button', { name: 'Concluir pedido', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('carrinho');
  expect(submissions).toBe(1);
  await expect(page.getByLabel('Seu nome', { exact: true })).toHaveValue('Cliente Teste');
  await expect(page.getByLabel('Endereço de entrega', { exact: true })).toHaveValue(
    'Rua de Teste, 10, Centro',
  );
  const action = await dialog.locator('.dialog-actions').boundingBox();
  expect(action!.y).toBeGreaterThanOrEqual(0);
  expect(action!.y + action!.height).toBeLessThanOrEqual(845);
  await dialog
    .getByRole('button', { name: 'Remover Corona Extra Long Neck 330 ml', exact: true })
    .click();
  await expect(dialog.getByRole('heading', { name: 'Seu pedido está vazio' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Continuar escolhendo' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Continuar escolhendo' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('searchbox')).toBeFocused();
});
