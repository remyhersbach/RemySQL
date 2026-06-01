#!/usr/bin/env node

const { execFileSync, spawnSync } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');

const root = path.join(__dirname, '..');
const packagePath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const changelogPath = path.join(root, 'CHANGELOG.md');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = process.argv.slice(2);

function run(command, commandArgs, options = {}) {
  console.log(`\n$ ${[command, ...commandArgs].join(' ')}`);
  execFileSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    ...options
  });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getOutput(command, commandArgs) {
  return execFileSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function getGitStatus() {
  return getOutput('git', ['status', '--short']);
}

function assertCleanWorktree() {
  const status = getGitStatus();
  if (status) {
    console.error('Release gestopt: je git worktree is niet schoon.');
    console.error(status);
    console.error('\nCommit/stash eerst je lopende werk, zodat de release-commit alleen release-wijzigingen bevat.');
    process.exit(1);
  }
}

function parseVersion(version) {
  const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Ongeldige versie: ${version}`);
  return match.slice(1).map(Number);
}

function bumpVersion(current, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;

  const [major, minor, patch] = parseVersion(current);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Kies patch, minor, major of een exacte versie. Ontvangen: ${bump}`);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getVersionSectionRegex(version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^##\\s+v?${escaped}(?:\\s+-\\s+.*)?$`, 'm');
}

function insertChangelogTemplate(version) {
  let changelog = existsSync(changelogPath)
    ? readFileSync(changelogPath, 'utf8')
    : '# Changelog\n\nAlle noemenswaardige wijzigingen in RemySQL staan in dit bestand.\n';

  if (getVersionSectionRegex(version).test(changelog)) {
    return false;
  }

  const template = [
    `## ${version} - ${todayIsoDate()}`,
    '',
    '### Toegevoegd',
    '',
    '### Gewijzigd',
    '',
    '### Opgelost',
    ''
  ].join('\n');

  const firstReleaseIndex = changelog.search(/^##\s+/m);
  if (firstReleaseIndex === -1) {
    changelog = `${changelog.trim()}\n\n${template}\n`;
  } else {
    changelog = `${changelog.slice(0, firstReleaseIndex).trim()}\n\n${template}\n${changelog.slice(firstReleaseIndex)}`;
  }

  writeFileSync(changelogPath, changelog);
  return true;
}

function getChangelogSection(version) {
  const changelog = readFileSync(changelogPath, 'utf8');
  const sectionStart = changelog.search(getVersionSectionRegex(version));
  if (sectionStart === -1) return '';

  const rest = changelog.slice(sectionStart);
  const nextSection = rest.slice(1).search(/^##\s+/m);
  return nextSection === -1 ? rest : rest.slice(0, nextSection + 1);
}

async function prompt(question, fallback = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim();
    return answer || fallback;
  } finally {
    rl.close();
  }
}

async function confirm(question, defaultYes = false) {
  const suffix = defaultYes ? ' [Y/n] ' : ' [y/N] ';
  const answer = (await prompt(`${question}${suffix}`)).toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes' || answer === 'j' || answer === 'ja';
}

function openEditorIfAvailable(filePath) {
  const editor = process.env.EDITOR || process.env.VISUAL;
  if (!editor) return false;

  const result = spawnSync(editor, [filePath], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${editor} stopte met exit-code ${result.status}.`);
  }
  return true;
}

async function requireChangelog(version) {
  const inserted = insertChangelogTemplate(version);
  if (inserted) {
    console.log(`\nCHANGELOG.md template toegevoegd voor ${version}.`);
  }

  if (!openEditorIfAvailable(changelogPath)) {
    console.log('\nPas CHANGELOG.md nu aan voor deze release.');
    console.log(`Zet minimaal 1 echte changelog-bullet in de sectie voor ${version}.`);
    await prompt('Druk op Enter zodra CHANGELOG.md klaar is.');
  }

  const section = getChangelogSection(version);
  if (!section) {
    throw new Error(`CHANGELOG.md mist een sectie voor ${version}.`);
  }
  const bulletCount = section
    .split(/\r?\n/)
    .filter((line) => /^\s*[-*]\s+\S/.test(line))
    .length;
  if (!bulletCount) {
    throw new Error(`CHANGELOG.md mist changelog-bullets in de sectie voor ${version}.`);
  }
}

function updatePackageVersions(version) {
  const pkg = readJson(packagePath);
  pkg.version = version;
  writeJson(packagePath, pkg);

  if (existsSync(lockPath)) {
    const lock = readJson(lockPath);
    lock.version = version;
    if (lock.packages?.['']) lock.packages[''].version = version;
    writeJson(lockPath, lock);
  }
}

function findBuiltDmgs() {
  const distPath = path.join(root, 'dist');
  if (!existsSync(distPath)) return [];
  return readdirSync(distPath)
    .filter((name) => name.toLowerCase().endsWith('.dmg'))
    .map((name) => path.join(distPath, name));
}

function getGitHubRepo() {
  const pkg = readJson(packagePath);
  const rawUrl = String(pkg.repository?.url || pkg.homepage || '').trim();
  const match = rawUrl.match(/github\.com[:/](.+?)(?:\.git)?(?:[#?].*)?$/i);
  if (!match) return null;
  return match[1].replace(/^\/+|\/+$/g, '');
}

async function githubRequest(repo, route, options = {}) {
  const token = process.env.REMYSQL_GH_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('REMYSQL_GH_TOKEN ontbreekt. Maak een GitHub token met contents:write en zet REMYSQL_GH_TOKEN=...');
  }

  const response = await fetch(`https://api.github.com/repos/${repo}${route}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'RemySQL-release-script',
      ...(options.headers || {})
    }
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message || `GitHub API gaf status ${response.status}.`);
  }
  return payload;
}

async function getReleaseByTag(repo, tag) {
  try {
    return await githubRequest(repo, `/releases/tags/${encodeURIComponent(tag)}`);
  } catch (error) {
    if (String(error.message).includes('Not Found')) return null;
    throw error;
  }
}

async function ensureGitHubRelease(repo, tag, version) {
  const releaseBody = getChangelogSection(version).trim();
  const existing = await getReleaseByTag(repo, tag);
  if (existing) {
    return githubRequest(repo, `/releases/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: `RemySQL ${tag}`,
        body: releaseBody,
        draft: false,
        prerelease: false
      }),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return githubRequest(repo, '/releases', {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      name: `RemySQL ${tag}`,
      body: releaseBody,
      draft: false,
      prerelease: false
    }),
    headers: { 'Content-Type': 'application/json' }
  });
}

async function deleteExistingAsset(repo, release, assetName) {
  const existing = (release.assets || []).find((asset) => asset.name === assetName);
  if (!existing) return;
  await githubRequest(repo, `/releases/assets/${existing.id}`, { method: 'DELETE' });
}

async function uploadReleaseAsset(repo, release, filePath) {
  const fileName = path.basename(filePath);
  await deleteExistingAsset(repo, release, fileName);

  const bytes = readFileSync(filePath);
  const uploadUrl = `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(fileName)}`;
  const token = process.env.REMYSQL_GH_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(bytes.length),
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'RemySQL-release-script'
    },
    body: bytes
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message || `Upload van ${fileName} mislukt met status ${response.status}.`);
  }
  return payload;
}

async function publishGitHubRelease(tag, version, dmgs) {
  const repo = getGitHubRepo();
  if (!repo) {
    throw new Error('Geen GitHub repository gevonden in package.json.');
  }

  console.log(`\nGitHub Release maken/bijwerken: ${repo} ${tag}`);
  const release = await ensureGitHubRelease(repo, tag, version);
  for (const dmg of dmgs) {
    console.log(`Asset uploaden: ${path.basename(dmg)}`);
    await uploadReleaseAsset(repo, release, dmg);
  }
  console.log(`GitHub Release klaar: ${release.html_url}`);
}

async function main() {
  const publish = args.includes('--publish');
  const rawBump = args.find((arg) => !arg.startsWith('--'));
  const pkg = readJson(packagePath);

  assertCleanWorktree();

  const bump = rawBump || await prompt(`Nieuwe versie vanaf ${pkg.version} (patch/minor/major/x.y.z) [patch] `, 'patch');
  const nextVersion = bumpVersion(pkg.version, bump);
  const tag = `v${nextVersion}`;

  try {
    getOutput('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`]);
    throw new Error(`Tag ${tag} bestaat al.`);
  } catch (error) {
    if (!String(error.message).includes('Tag ')) {
      // rev-parse failed because the tag does not exist; that is what we want.
    } else {
      throw error;
    }
  }

  console.log(`\nRelease voorbereiden: ${pkg.version} -> ${nextVersion}`);
  updatePackageVersions(nextVersion);
  await requireChangelog(nextVersion);

  run('node', ['--check', 'src/main.js']);
  run('node', ['--check', 'src/renderer/app.js']);

  if (publish && !process.env.REMYSQL_GH_TOKEN && !process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    throw new Error('REMYSQL_GH_TOKEN ontbreekt. Zet een GitHub token met contents:write voordat je release:publish draait.');
  }

  run(npmCmd, ['run', 'build:mac']);

  const dmgs = findBuiltDmgs();
  if (!dmgs.length) {
    throw new Error('Build klaar, maar geen DMG gevonden in dist/.');
  }

  console.log('\nDMG gebouwd:');
  for (const dmg of dmgs) console.log(`- ${dmg}`);

  run('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md']);
  const changed = getGitStatus();
  if (!changed) {
    throw new Error('Geen release-wijzigingen gevonden om te committen.');
  }

  console.log('\nRelease-wijzigingen:');
  console.log(changed);

  const shouldCommit = await confirm(`Commit en tag ${tag} maken?`, true);
  if (!shouldCommit) {
    console.log('Gestopt voor commit/tag. Je wijzigingen blijven lokaal staan.');
    return;
  }

  run('git', ['commit', '-m', `chore: release ${tag}`]);
  run('git', ['tag', tag]);

  const shouldPush = await confirm(`Push commit en tag ${tag} naar origin?`, false);
  if (!shouldPush) {
    console.log(`Niet gepusht. Push later met: git push origin HEAD && git push origin ${tag}`);
    return;
  }

  run('git', ['push', 'origin', 'HEAD']);
  run('git', ['push', 'origin', tag]);
  if (publish) {
    await publishGitHubRelease(tag, nextVersion, dmgs);
  }
  console.log(`\nRelease ${tag} staat op GitHub.`);
}

main().catch((error) => {
  console.error(`\nRelease mislukt: ${error.message}`);
  process.exit(1);
});
