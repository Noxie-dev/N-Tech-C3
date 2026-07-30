import { expect, test } from "@playwright/test";

test("creates a workspace and finds its captured evidence globally", async ({
  page,
}) => {
  const suffix = Date.now();
  const workspaceName = `Browser Workspace ${suffix}`;
  const evidenceTitle = `Browser Evidence ${suffix}`;

  await page.goto("/workspaces");
  await expect(page.getByRole("heading", { name: "Workspaces" })).toBeVisible();
  await page
    .getByRole("button", { name: /new workspace/i })
    .first()
    .click();
  await page.getByPlaceholder("Workspace name").fill(workspaceName);
  await page
    .getByPlaceholder("What is this initiative?")
    .fill("Created by the browser workflow test");
  await page.getByRole("button", { name: "Create Workspace" }).click();
  await expect(page.getByText(workspaceName)).toBeVisible();
  await page.getByText(workspaceName).click();
  await expect(
    page.getByRole("heading", { name: workspaceName }),
  ).toBeVisible();
  const workspaceId = Number(new URL(page.url()).pathname.split("/").pop());

  const response = await page.request.post("/api/evidence", {
    data: {
      title: evidenceTitle,
      type: "TerminalOutput",
      content: "playwright-verification-token",
      workspaceId,
    },
  });
  expect(response.ok()).toBeTruthy();

  await page.goto("/search");
  await page
    .getByPlaceholder("Search engineering intelligence…")
    .fill("playwright verification");
  await page.getByLabel("Entity type").selectOption("evidence");
  await expect(page.getByText(evidenceTitle)).toBeVisible();
});

test("authors rich text and imports a file through the evidence UI", async ({
  page,
}) => {
  const suffix = Date.now();
  const workspace = await page.request.post("/api/workspaces", {
    data: { name: `Editor Workspace ${suffix}`, purpose: "Product" },
  });
  expect(workspace.ok()).toBeTruthy();
  const workspaceRecord = await workspace.json();
  const story = await page.request.post("/api/stories", {
    data: {
      title: `Editor Story ${suffix}`,
      status: "Draft",
      content: "",
      workspaceId: workspaceRecord.id,
    },
  });
  expect(story.ok()).toBeTruthy();
  const storyRecord = await story.json();

  await page.goto(`/stories/${storyRecord.id}`);
  await page.getByRole("button", { name: "Editor" }).click();
  const editor = page.locator(".ProseMirror");
  await editor.fill("Browser-authored engineering narrative");
  await page.getByRole("button", { name: /sync changes/i }).click();
  await expect(page.getByRole("button", { name: /synced/i })).toBeDisabled();
  const persisted = await page.request.get(`/api/stories/${storyRecord.id}`);
  expect((await persisted.json()).content).toContain(
    "Browser-authored engineering narrative",
  );

  await page.goto("/evidence");
  await page.getByLabel("Import evidence files").setInputFiles({
    name: `browser-artifact-${suffix}.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from("browser file ingestion"),
  });
  await expect(
    page.getByRole("heading", {
      name: `browser-artifact-${suffix}.txt`,
      exact: true,
    }),
  ).toBeVisible();
});

test("loads the governed Evidence inspector and runs deterministic verification", async ({
  page,
}) => {
  const suffix = Date.now();
  const workspace = await page.request.post("/api/workspaces", {
    data: { name: `Inspector Workspace ${suffix}` },
  });
  const workspaceRecord = await workspace.json();
  const evidence = await page.request.post("/api/evidence", {
    data: {
      title: `Inspector Evidence ${suffix}`,
      type: "TerminalOutput",
      content: "deterministic inspector evidence",
      workspaceId: workspaceRecord.id,
    },
  });
  const evidenceRecord = await evidence.json();

  const started = performance.now();
  await page.goto(`/evidence/${evidenceRecord.id}`);
  await expect(
    page.getByRole("heading", { name: evidenceRecord.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sources and provenance" }),
  ).toBeVisible();
  expect(performance.now() - started).toBeLessThan(5000);

  await page.getByRole("button", { name: "Verify Evidence" }).click();
  await expect(page.getByText("Unverifiable", { exact: true })).toBeVisible();
  await expect(
    page.getByText("evidence-integrity@1.0.0", { exact: false }),
  ).toBeVisible();
});

test("authors, governs, versions, and archives Workspace Knowledge", async ({
  page,
}) => {
  const suffix = Date.now();
  const workspace = await page.request.post("/api/workspaces", {
    data: { name: `Knowledge Workspace ${suffix}` },
  });
  expect(workspace.ok()).toBeTruthy();
  const workspaceRecord = await workspace.json();
  const created = await page.request.post("/api/knowledge", {
    data: {
      title: `Governed Knowledge ${suffix}`,
      content: "<p>Initial reviewed understanding</p>",
      workspaceId: workspaceRecord.id,
    },
  });
  expect(created.ok()).toBeTruthy();
  const knowledge = await created.json();

  const started = performance.now();
  await page.goto(`/knowledge/${knowledge.id}`);
  const titleInput = page.locator("input").first();
  await expect(titleInput).toHaveValue(knowledge.title);
  expect(performance.now() - started).toBeLessThan(5000);
  await expect(
    page.getByRole("heading", { name: "Claims and Evidence citations" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lifecycle and review" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Typed relationships" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Versions" })).toBeVisible();
  await page
    .getByPlaceholder("Concise reusable summary")
    .fill("Browser-verified reusable summary");
  await page.getByPlaceholder("Knowledge owner").fill("Browser Owner");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Studio save", { exact: false })).toBeVisible();

  const claim = `Browser-reviewed claim ${suffix}`;
  await page.getByPlaceholder("Add a discrete, reviewable claim").fill(claim);
  await page
    .getByPlaceholder("Add a discrete, reviewable claim")
    .press("Enter");
  await expect(page.getByText(claim, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore Knowledge" }),
  ).toBeVisible();
  await expect(titleInput).toBeDisabled();
  await page.getByRole("button", { name: "Restore Knowledge" }).click();
  await expect(
    page.getByRole("button", { name: "Archive", exact: true }),
  ).toBeVisible();

  const persisted = await page.request.get(`/api/knowledge/${knowledge.id}`);
  const record = await persisted.json();
  expect(record.summary).toBe("Browser-verified reusable summary");
  expect(record.owner).toBe("Browser Owner");
  expect(record.version).toBeGreaterThan(1);
});

test("defines, activates, versions, archives, and restores a governed Campaign", async ({
  page,
}) => {
  const suffix = Date.now();
  const workspace = await page.request.post("/api/workspaces", {
    data: { name: `Campaign Workspace ${suffix}`, purpose: "Product" },
  });
  expect(workspace.ok()).toBeTruthy();
  const workspaceRecord = await workspace.json();
  const created = await page.request.post("/api/campaigns", {
    data: {
      title: `Governed Campaign ${suffix}`,
      workspaceId: workspaceRecord.id,
      campaignType: "ProductDevelopment",
    },
  });
  expect(created.ok()).toBeTruthy();
  const campaign = await created.json();
  const storyResponse = await page.request.post("/api/stories", {
    data: {
      title: `Campaign Portfolio Story ${suffix}`,
      workspaceId: workspaceRecord.id,
      status: "Draft",
    },
  });
  expect(storyResponse.ok()).toBeTruthy();
  const story = await storyResponse.json();

  const started = performance.now();
  await page.goto(`/campaigns/${campaign.id}`);
  await expect(page.getByLabel("Campaign title")).toHaveValue(campaign.title);
  expect(performance.now() - started).toBeLessThan(5000);
  await expect(
    page.getByRole("heading", { name: "Mission contract" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Version trail" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Story portfolio" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Milestone plan" }),
  ).toBeVisible();

  await page
    .getByPlaceholder("Mission statement")
    .fill("Coordinate an evidence-backed engineering narrative.");
  await page
    .getByPlaceholder("Success definition")
    .fill("A reviewable Campaign mission is active.");
  await page.getByPlaceholder("Accountable owner").fill("Browser Owner");
  await page.getByLabel("Target Story count").fill("1");
  await page.getByRole("button", { name: "Save checkpoint" }).click();
  await expect(
    page.getByText("Campaign mission edited", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Story to add").selectOption(String(story.id));
  await page.getByLabel("Story role").selectOption("Anchor");
  await page
    .getByPlaceholder("Contribution note")
    .fill("Carries the Campaign thesis");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(story.title, { exact: true })).toBeVisible();
  await page.getByPlaceholder("Milestone title").fill("Portfolio accepted");
  await page.getByRole("button", { name: "Add milestone" }).click();
  await expect(
    page.getByText("Portfolio accepted", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Activate" }).focus();
  await expect(page.getByRole("button", { name: "Activate" })).toBeFocused();
  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
  await expect(page.getByLabel("Campaign title")).toBeDisabled();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(
    page.getByRole("button", { name: "Archive", exact: true }),
  ).toBeVisible();

  const persisted = await page.request.get(`/api/campaigns/${campaign.id}`);
  const record = await persisted.json();
  expect(record.missionStatement).toContain("evidence-backed");
  expect(record.owner).toBe("Browser Owner");
  expect(record.lifecycleStatus).toBe("Active");
  expect(record.version).toBeGreaterThan(1);
  const backlinks = await page.request.get(
    `/api/stories/${story.id}/campaigns`,
  );
  expect(backlinks.ok()).toBeTruthy();
  expect((await backlinks.json())[0].campaignId).toBe(campaign.id);

  const concurrent = await page.request.patch(`/api/campaigns/${campaign.id}`, {
    data: {
      expectedVersion: record.version,
      owner: "Concurrent Browser Writer",
      changeSummary: "Conformance conflict fixture",
    },
  });
  expect(concurrent.ok()).toBeTruthy();
  await page.getByPlaceholder("Accountable owner").fill("Stale Browser Writer");
  await page.getByRole("button", { name: "Save checkpoint" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Campaign version conflict",
  );
});
