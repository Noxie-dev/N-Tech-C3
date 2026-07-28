import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const applicationRoot = path.resolve(currentDirectory, '..');
const workspaceRoot = path.resolve(applicationRoot, '..', '..');
const apiEntry = app.isPackaged
  ? path.join(process.resourcesPath, 'api', 'index.mjs')
  : path.join(workspaceRoot, 'artifacts', 'api-server', 'dist', 'index.mjs');
const frontendDist = app.isPackaged
  ? path.join(process.resourcesPath, 'frontend')
  : path.join(applicationRoot, 'dist', 'public');
const port = 4317;
let apiProcess;
const execFileAsync = promisify(execFile);

function getVaultRoot() {
  return path.join(app.getPath('documents'), 'N-TechC3-Vault');
}

async function ensureVault() {
  const root = getVaultRoot();
  const directories = [
    'database', 'stories', 'campaigns', 'knowledge', 'evidence', 'assets',
    'exports', 'drafts', 'templates', 'backups', 'logs', 'settings',
  ];
  await Promise.all(directories.map((directory) => mkdir(path.join(root, directory), { recursive: true })));
  return root;
}

function resolveVaultSource(root, source) {
  if (typeof source !== 'string' || path.isAbsolute(source)) throw new TypeError('Invalid vault-relative source');
  const resolved = path.resolve(root, source);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new RangeError('Source escapes the vault');
  return resolved;
}

function mimeTypeForSource(source) {
  const extension = path.extname(source).toLowerCase();
  return {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  }[extension] ?? 'application/octet-stream';
}

async function startApi() {
  if (apiProcess && apiProcess.exitCode === null) return;
  const vault = await ensureVault();
  apiProcess = spawn(process.execPath, [apiEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(port),
      NTC3_VAULT_PATH: vault,
      NTC3_DESKTOP_DIST: frontendDist,
    },
    stdio: 'inherit',
  });
  apiProcess.once('exit', (code) => {
    if (!app.isQuitting && code) console.error(`N-Tech C³ local API exited with ${code}`);
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
      if (response.ok) return;
    } catch {
      // API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Local API did not become ready');
}

async function stopApi() {
  const processToStop = apiProcess;
  apiProcess = undefined;
  if (!processToStop || processToStop.exitCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5000);
    processToStop.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    processToStop.kill();
  });
}

async function createWindow() {
  await startApi();
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#080a0f',
    title: 'N-Tech C³',
    webPreferences: {
      preload: path.join(currentDirectory, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  await window.loadURL(`http://127.0.0.1:${port}`);
}

async function readOptionalText(filePath, limit = 12000) {
  try {
    return (await readFile(filePath, 'utf8')).slice(0, limit);
  } catch {
    return '';
  }
}

async function gitValue(repositoryPath, args) {
  try {
    return (await execFileAsync('git', args, { cwd: repositoryPath, timeout: 5000 })).stdout.trim();
  } catch {
    return '';
  }
}

async function countTodos(repositoryPath) {
  const ignored = new Set(['.git', 'node_modules', 'dist', 'build', 'release', '.next', 'coverage']);
  const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.md']);
  let fileCount = 0;
  let todoCount = 0;

  async function walk(directory, depth) {
    if (depth > 8 || fileCount > 5000) return;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignored.has(entry.name) || fileCount > 5000) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath, depth + 1);
      } else if (extensions.has(path.extname(entry.name))) {
        fileCount += 1;
        try {
          if ((await stat(entryPath)).size > 1024 * 1024) continue;
          const content = await readFile(entryPath, 'utf8');
          todoCount += (content.match(/\b(?:TODO|FIXME|HACK)\b/g) ?? []).length;
        } catch {
          // Ignore unreadable files.
        }
      }
    }
  }

  await walk(repositoryPath, 0);
  return { fileCount, todoCount };
}

async function analyzeRepository(repositoryPath) {
  const packageText = await readOptionalText(path.join(repositoryPath, 'package.json'));
  let packageData = {};
  try {
    packageData = packageText ? JSON.parse(packageText) : {};
  } catch {
    packageData = {};
  }
  const readme = await readOptionalText(path.join(repositoryPath, 'README.md'), 3000);
  const branch = await gitValue(repositoryPath, ['branch', '--show-current']);
  const commit = await gitValue(repositoryPath, ['log', '-1', '--pretty=%h %s']);
  const { fileCount, todoCount } = await countTodos(repositoryPath);
  const dependencies = {
    ...(packageData.dependencies ?? {}),
    ...(packageData.devDependencies ?? {}),
  };
  const dependencyNames = Object.keys(dependencies);
  const frameworks = [
    ['react', 'React'], ['next', 'Next.js'], ['vite', 'Vite'], ['express', 'Express'],
    ['electron', 'Electron'], ['drizzle-orm', 'Drizzle'], ['typescript', 'TypeScript'],
  ].filter(([dependency]) => dependency in dependencies).map(([, label]) => label);
  const packageManager = await readOptionalText(path.join(repositoryPath, 'pnpm-lock.yaml'), 20)
    ? 'pnpm'
    : await readOptionalText(path.join(repositoryPath, 'yarn.lock'), 20)
      ? 'Yarn'
      : await readOptionalText(path.join(repositoryPath, 'package-lock.json'), 20)
        ? 'npm'
        : 'Unknown';
  const scripts = packageData.scripts ?? {};
  const readinessChecks = [
    ['README', Boolean(readme)],
    ['Build script', Boolean(scripts.build)],
    ['Test script', Boolean(scripts.test)],
    ['Typecheck script', Boolean(scripts.typecheck)],
    ['License', Boolean(packageData.license)],
  ];
  const readinessScore = Math.round(
    readinessChecks.filter(([, passed]) => passed).length / readinessChecks.length * 100,
  );
  const name = packageData.name || path.basename(repositoryPath);
  const metrics = {
    branch: branch || '',
    commit: commit || '',
    dependencyCount: dependencyNames.length,
    fileCount,
    todoCount,
    readinessScore,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(metrics)).digest('hex').slice(0, 16);
  const content = `# Repository Snapshot — ${name}

## Source state

- Branch: ${branch || 'Not detected'}
- Latest commit: ${commit || 'Not detected'}
- Package manager: ${packageManager}
- Frameworks: ${frameworks.join(', ') || 'Not detected'}
- Dependencies: ${dependencyNames.length}
- Scanned source files: ${fileCount}
- TODO/FIXME/HACK markers: ${todoCount}
- Production readiness: ${readinessScore}%

## Readiness checks

${readinessChecks.map(([label, passed]) => `- ${passed ? '✅' : '⬜'} ${label}`).join('\n')}

## Architecture summary

${frameworks.length ? `Detected ${frameworks.join(', ')} in a ${packageManager} project.` : 'No supported framework signature was detected.'}

## README excerpt

${readme || '_No README.md found._'}
`;
  return { name, branch, commit, readinessScore, fingerprint, metrics, content };
}

ipcMain.handle('vault:info', async () => {
  const root = await ensureVault();
  return { root, database: path.join(root, 'database', 'ntc3.sqlite') };
});

ipcMain.handle('vault:import-file', async (_event, input) => {
  if (!input || typeof input.name !== 'string' || !(input.bytes instanceof Uint8Array)) {
    throw new TypeError('Invalid vault file');
  }
  if (input.bytes.byteLength > 100 * 1024 * 1024) {
    throw new RangeError('Evidence files are limited to 100 MB');
  }
  const root = await ensureVault();
  const safeName = path.basename(input.name).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const checksum = createHash('sha256').update(input.bytes).digest('hex');
  const relative = path.join('evidence', `${Date.now()}-${checksum.slice(0, 10)}-${safeName}`);
  await writeFile(path.join(root, relative), input.bytes, { flag: 'wx' });
  return { source: relative, checksum };
});

ipcMain.handle('vault:preview', async (_event, source) => {
  const root = await ensureVault();
  const sourcePath = resolveVaultSource(root, source);
  const fileStat = await stat(sourcePath);
  if (!fileStat.isFile() || fileStat.size > 20 * 1024 * 1024) {
    throw new RangeError('Preview is limited to files smaller than 20 MB');
  }
  const mimeType = mimeTypeForSource(source);
  if (mimeType === 'application/octet-stream') return null;
  const bytes = await readFile(sourcePath);
  return { mimeType, dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}` };
});

ipcMain.handle('vault:reveal', async (_event, source) => {
  const root = await ensureVault();
  const sourcePath = resolveVaultSource(root, source);
  await stat(sourcePath);
  shell.showItemInFolder(sourcePath);
  return true;
});

ipcMain.handle('vault:export', async () => {
  const selection = await dialog.showOpenDialog({
    title: 'Choose an export destination',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (selection.canceled || !selection.filePaths[0]) return null;
  const entityNames = ['stories', 'campaigns', 'evidence', 'knowledge', 'assets', 'templates', 'projects'];
  const exportedAt = new Date().toISOString();
  const snapshot = { format: 'ntc3-portable-export-v1', exportedAt, entities: {} };
  for (const entityName of entityNames) {
    const response = await fetch(`http://127.0.0.1:${port}/api/${entityName}`);
    if (!response.ok) throw new Error(`Unable to export ${entityName}`);
    snapshot.entities[entityName] = await response.json();
  }
  const stamp = exportedAt.replace(/[:.]/g, '-');
  const destination = selection.filePaths[0];
  const jsonPath = path.join(destination, `ntc3-export-${stamp}.json`);
  const markdownPath = path.join(destination, `ntc3-export-${stamp}.md`);
  await writeFile(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
  const markdown = [`# N-Tech C³ Export`, ``, `Exported: ${exportedAt}`, ``];
  for (const entityName of entityNames) {
    markdown.push(`## ${entityName[0].toUpperCase()}${entityName.slice(1)}`, '');
    for (const entity of snapshot.entities[entityName]) {
      markdown.push(`### ${entity.title ?? entity.name ?? `#${entity.id}`}`, '', entity.content ?? entity.description ?? entity.notes ?? '', '');
    }
  }
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, { flag: 'wx' });
  return { jsonPath, markdownPath };
});

ipcMain.handle('vault:backup', async () => {
  const root = await ensureVault();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const selection = await dialog.showSaveDialog({
    title: 'Back up N-Tech C³ vault',
    defaultPath: path.join(app.getPath('documents'), `N-TechC3-Vault-${stamp}.tar.gz`),
    filters: [{ name: 'Compressed vault archive', extensions: ['tar.gz'] }],
  });
  if (selection.canceled || !selection.filePath) return null;
  await execFileAsync('tar', ['-czf', selection.filePath, '-C', root, '.'], { timeout: 120000 });
  return { path: selection.filePath };
});

ipcMain.handle('vault:restore', async () => {
  const selection = await dialog.showOpenDialog({
    title: 'Restore N-Tech C³ vault backup',
    properties: ['openFile'],
    filters: [{ name: 'Compressed vault archive', extensions: ['gz'] }],
  });
  if (selection.canceled || !selection.filePaths[0]) return null;
  const archivePath = selection.filePaths[0];
  const listing = (await execFileAsync('tar', ['-tzf', archivePath], { timeout: 30000 })).stdout.split('\n').filter(Boolean);
  if (listing.some((entry) => path.isAbsolute(entry) || entry.split('/').includes('..'))) {
    throw new Error('Unsafe backup archive');
  }
  const temporary = await mkdtemp(path.join(app.getPath('temp'), 'ntc3-restore-'));
  try {
    await execFileAsync('tar', ['-xzf', archivePath, '-C', temporary], { timeout: 120000 });
    await stat(path.join(temporary, 'database', 'ntc3.sqlite'));
    const root = getVaultRoot();
    const recovery = `${root}.pre-restore-${Date.now()}`;
    await stopApi();
    await rename(root, recovery);
    try {
      await cp(temporary, root, { recursive: true, errorOnExist: true });
    } catch (error) {
      await rm(root, { recursive: true, force: true });
      await rename(recovery, root);
      throw error;
    }
    await startApi();
    for (const window of BrowserWindow.getAllWindows()) await window.reload();
    return { recovery };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

ipcMain.handle('repository:analyze', async () => {
  const selection = await dialog.showOpenDialog({
    title: 'Select a repository to analyze',
    properties: ['openDirectory'],
  });
  if (selection.canceled || !selection.filePaths[0]) return null;
  return analyzeRepository(selection.filePaths[0]);
});

app.whenReady().then(createWindow).catch((error) => {
  console.error(error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  apiProcess?.kill();
});
