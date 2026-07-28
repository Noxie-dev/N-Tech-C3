import { expect, test } from '@playwright/test';

test('creates a project and finds captured evidence globally', async ({ page }) => {
  const suffix = Date.now();
  const projectName = `Browser Project ${suffix}`;
  const evidenceTitle = `Browser Evidence ${suffix}`;

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await page.getByRole('button', { name: /add project/i }).click();
  await page.getByPlaceholder('e.g. Core Service API').fill(projectName);
  await page.getByPlaceholder('Short description...').fill('Created by the browser workflow test');
  await page.getByPlaceholder('Short description...').press('Enter');
  await expect(page.getByText(projectName)).toBeVisible();
  await page.getByText(projectName).click();
  await expect(page.getByRole('heading', { name: 'Repository snapshot timeline' })).toBeVisible();

  const response = await page.request.post('/api/evidence', {
    data: {
      title: evidenceTitle,
      type: 'TerminalOutput',
      content: 'playwright-verification-token',
    },
  });
  expect(response.ok()).toBeTruthy();

  await page.goto('/search');
  await page.getByPlaceholder('Search engineering intelligence…').fill('playwright verification');
  await page.getByLabel('Entity type').selectOption('evidence');
  await expect(page.getByText(evidenceTitle)).toBeVisible();
});

test('authors rich text and imports a file through the evidence UI', async ({ page }) => {
  const suffix = Date.now();
  const story = await page.request.post('/api/stories', {
    data: {
      title: `Editor Story ${suffix}`,
      status: 'Draft',
      content: '',
    },
  });
  expect(story.ok()).toBeTruthy();
  const storyRecord = await story.json();

  await page.goto(`/stories/${storyRecord.id}`);
  const editor = page.locator('.ProseMirror');
  await editor.fill('Browser-authored engineering narrative');
  await page.getByRole('button', { name: /sync changes/i }).click();
  await expect(page.getByRole('button', { name: /synced/i })).toBeDisabled();
  const persisted = await page.request.get(`/api/stories/${storyRecord.id}`);
  expect((await persisted.json()).content).toContain('Browser-authored engineering narrative');

  await page.goto('/evidence');
  await page.getByLabel('Import evidence files').setInputFiles({
    name: `browser-artifact-${suffix}.txt`,
    mimeType: 'text/plain',
    buffer: Buffer.from('browser file ingestion'),
  });
  await expect(page.getByRole('heading', { name: `browser-artifact-${suffix}.txt`, exact: true })).toBeVisible();
});
