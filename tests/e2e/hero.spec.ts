import { expect, test } from '@playwright/test';

async function runTrace(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForFunction(() => Array.isArray(window.__RECALL_RADAR_TOOLS__));
  await page.getByRole('button', { name: /run guided trace/i }).click();
  await expect(page.getByText('Evidence-based', { exact: true })).toBeVisible();
}

test('hero trace resolves the exact 312 / 271 / 41 impact split', async ({ page }) => {
  await runTrace(page);
  await expect(page.getByText('312', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('271', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('41', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('CAP-77D', { exact: true }).first()).toBeVisible();
});

test('latest corrected record version is visible', async ({ page }) => {
  await runTrace(page);
  await expect(page.getByText('Correction applied')).toBeVisible();
  await expect(page.getByText(/version 3: 111 units/i)).toBeVisible();
});

test('malicious supplier note stays visibly untrusted and inert', async ({ page }) => {
  await runTrace(page);
  await expect(page.getByText('Untrusted supplier content')).toBeVisible();
  await expect(page.getByText(/rendered as inert evidence/i)).toBeVisible();
});

test('visible approval, commit, and undo restore all holds', async ({ page }) => {
  await runTrace(page);
  await page.getByRole('button', { name: /stage 271 holds/i }).click();
  await page.getByRole('button', { name: /approve 271 inventory holds/i }).click();
  await page.getByRole('button', { name: /commit 271 approved holds/i }).click();
  await expect(page.getByText('Committed hold')).toBeVisible();
  await page.getByRole('button', { name: /undo 271 inventory holds/i }).click();
  await expect(page.getByText('All prior states restored')).toBeVisible();
});
