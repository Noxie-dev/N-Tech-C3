import { expect, test } from '@playwright/test';

test('creates a workspace and finds its captured evidence globally', async ({ page }) => {
  const suffix = Date.now();
  const workspaceName = `Browser Workspace ${suffix}`;
  const evidenceTitle = `Browser Evidence ${suffix}`;

  await page.goto('/workspaces');
  await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
  await page.getByRole('button', { name: /new workspace/i }).first().click();
  await page.getByPlaceholder('Workspace name').fill(workspaceName);
  await page.getByPlaceholder('What is this initiative?').fill('Created by the browser workflow test');
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await expect(page.getByText(workspaceName)).toBeVisible();
  await page.getByText(workspaceName).click();
  await expect(page.getByRole('heading', { name: workspaceName })).toBeVisible();
  const workspaceId = Number(new URL(page.url()).pathname.split('/').pop());

  const response = await page.request.post('/api/evidence', {
    data: {
      title: evidenceTitle,
      type: 'TerminalOutput',
      content: 'playwright-verification-token',
      projectId: workspaceId,
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
  const workspace = await page.request.post('/api/workspaces', {
    data: { name: `Editor Workspace ${suffix}`, purpose: 'Product' },
  });
  expect(workspace.ok()).toBeTruthy();
  const workspaceRecord = await workspace.json();
  const story = await page.request.post('/api/stories', {
    data: {
      title: `Editor Story ${suffix}`,
      status: 'Draft',
      content: '',
      workspaceId: workspaceRecord.id,
    },
  });
  expect(story.ok()).toBeTruthy();
  const storyRecord = await story.json();

  await page.goto(`/stories/${storyRecord.id}`);
  await page.getByRole('button', { name: 'Editor' }).click();
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
