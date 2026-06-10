#!/usr/bin/env node

const { execFileSync, spawnSync } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');

const root = path.join(__dirname, '..');
const packagePath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const changelogPath = path.join(root, 'CHANGELOG.md');
const releaseNotesPath = path.join(root, 'RELEASE_NOTES.md');
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

function getStatusPath(statusLine) {
  const pathPart = statusLine.slice(3).trim();
  return pathPart.includes(' -> ') ? pathPart.split(' -> ').pop().trim() : pathPart;
}

function assertCleanWorktree(allowedDirtyPaths = []) {
  const statusLines = getGitStatus().split(/\r?\n/).filter(Boolean);
  const disallowed = statusLines.filter((line) => !allowedDirtyPaths.includes(getStatusPath(line)));
  if (disallowed.length) {
    console.error('Release gestopt: je git worktree is niet schoon.');
    console.error(disallowed.join('\n'));
    console.error('\nCommit/stash eerst je lopende werk, zodat de release-commit alleen release-wijzigingen bevat.');
    if (allowedDirtyPaths.length) {
      console.error(`Toegestaan vooraf aangepast: ${allowedDirtyPaths.join(', ')}`);
    }
    process.exit(1);
  }
  const allowedDirty = statusLines.filter((line) => allowedDirtyPaths.includes(getStatusPath(line)));
  if (allowedDirty.length) {
    console.log('\nVooraf aangepaste releasebestanden worden meegenomen:');
    console.log(allowedDirty.join('\n'));
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

function upsertChangelogSection(version, body) {
  let changelog = existsSync(changelogPath)
    ? readFileSync(changelogPath, 'utf8')
    : '# Changelog\n\nAlle noemenswaardige wijzigingen in RemySQL staan in dit bestand.\n';
  const section = [`## ${version} - ${todayIsoDate()}`, '', body.trim(), ''].join('\n');
  const sectionStart = changelog.search(getVersionSectionRegex(version));

  if (sectionStart === -1) {
    const firstReleaseIndex = changelog.search(/^##\s+/m);
    changelog = firstReleaseIndex === -1
      ? `${changelog.trim()}\n\n${section}\n`
      : `${changelog.slice(0, firstReleaseIndex).trim()}\n\n${section}\n${changelog.slice(firstReleaseIndex)}`;
    writeFileSync(changelogPath, changelog);
    return;
  }

  const rest = changelog.slice(sectionStart);
  const nextSection = rest.slice(1).search(/^##\s+/m);
  const sectionEnd = nextSection === -1 ? changelog.length : sectionStart + nextSection + 1;
  changelog = `${changelog.slice(0, sectionStart)}${section}${changelog.slice(sectionEnd)}`;
  writeFileSync(changelogPath, changelog);
}

function getChangelogSection(version) {
  const changelog = readFileSync(changelogPath, 'utf8');
  const sectionStart = changelog.search(getVersionSectionRegex(version));
  if (sectionStart === -1) return '';

  const rest = changelog.slice(sectionStart);
  const nextSection = rest.slice(1).search(/^##\s+/m);
  return nextSection === -1 ? rest : rest.slice(0, nextSection + 1);
}

function getChangelogBulletCount(version) {
  return getChangelogSection(version)
    .split(/\r?\n/)
    .filter((line) => /^\s*[-*]\s+\S/.test(line))
    .length;
}

function getReleaseNotesTemplate() {
  return [
    '# RemySQL {{tag}}',
    '',
    '## Wijzigingen',
    '',
    '- '
  ].join('\n');
}

function ensureReleaseNotesFile() {
  if (existsSync(releaseNotesPath)) return false;
  writeFileSync(releaseNotesPath, `${getReleaseNotesTemplate()}\n`);
  return true;
}

function resetReleaseNotesFile() {
  writeFileSync(releaseNotesPath, `${getReleaseNotesTemplate()}\n`);
}

function readReleaseNotes(version, tag) {
  return readFileSync(releaseNotesPath, 'utf8')
    .replaceAll('{{version}}', version)
    .replaceAll('{{tag}}', tag)
    .trim();
}

function getReleaseNotesChangelogBody(version, tag) {
  const lines = readReleaseNotes(version, tag).split(/\r?\n/);
  while (lines.length && !lines[0].trim()) lines.shift();
  if (/^#\s+/.test(lines[0] || '')) lines.shift();
  while (lines.length && !lines[0].trim()) lines.shift();
  return lines
    .map((line) => line.replace(/^##\s+/, '### '))
    .join('\n')
    .trim();
}

function getReleaseNotesBulletCount(version, tag) {
  return readReleaseNotes(version, tag)
    .split(/\r?\n/)
    .filter((line) => /^\s*[-*]\s+\S/.test(line))
    .filter((line) => !/^\s*[-*]\s*$/.test(line))
    .length;
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

function openEditorIfAvailable(filePath) {
  const editor = process.env.EDITOR || process.env.VISUAL;
  if (!editor) return false;

  const result = spawnSync(editor, [filePath], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${editor} stopte met exit-code ${result.status}.`);
  }
  return true;
}

function prepareChangelog(version, tag) {
  upsertChangelogSection(version, getReleaseNotesChangelogBody(version, tag));
  console.log(`\nCHANGELOG.md bijgewerkt vanuit RELEASE_NOTES.md voor ${version}.`);
  const section = getChangelogSection(version);
  if (!section) {
    throw new Error(`CHANGELOG.md mist een sectie voor ${version}.`);
  }
  if (!getChangelogBulletCount(version)) {
    throw new Error(`CHANGELOG.md heeft geen bullets voor ${version}.`);
  }
}

async function prepareReleaseNotes(version, tag) {
  const created = ensureReleaseNotesFile();
  if (created) {
    console.log('\nRELEASE_NOTES.md template toegevoegd.');
  }

  if (!openEditorIfAvailable(releaseNotesPath)) {
    console.log('\nRELEASE_NOTES.md wordt gebruikt als GitHub Release-body.');
    console.log('Bewerk dit bestand handmatig voordat je releaset. Tokens {{version}} en {{tag}} worden automatisch ingevuld.');
    await prompt('Druk op Enter om door te gaan.');
  }

  if (!readReleaseNotes(version, tag)) {
    throw new Error('RELEASE_NOTES.md is leeg.');
  }

  if (!getReleaseNotesBulletCount(version, tag)) {
    throw new Error('RELEASE_NOTES.md heeft nog geen ingevulde bullets.');
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

function getDistPath() {
  return path.join(root, 'dist');
}

function cleanOldDmgs() {
  const distPath = getDistPath();
  if (!existsSync(distPath)) return;

  const oldDmgs = readdirSync(distPath)
    .filter((name) => name.toLowerCase().endsWith('.dmg'))
    .map((name) => path.join(distPath, name));

  for (const dmg of oldDmgs) {
    unlinkSync(dmg);
  }

  if (oldDmgs.length) {
    console.log(`\n${oldDmgs.length} oude DMG asset${oldDmgs.length === 1 ? '' : 's'} uit dist/ verwijderd.`);
  }
}

function findBuiltDmgs(version) {
  const distPath = path.join(root, 'dist');
  if (!existsSync(distPath)) return [];
  return readdirSync(distPath)
    .filter((name) => name.toLowerCase().endsWith('.dmg') && name.includes(version))
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
  const releaseBody = readReleaseNotes(version, tag);
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

  assertCleanWorktree(['RELEASE_NOTES.md']);

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
  await prepareReleaseNotes(nextVersion, tag);
  prepareChangelog(nextVersion, tag);

  run('node', ['--check', 'src/main.js']);
  run('node', ['--check', 'src/renderer/app.js']);

  if (publish && !process.env.REMYSQL_GH_TOKEN && !process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    throw new Error('REMYSQL_GH_TOKEN ontbreekt. Zet een GitHub token met contents:write voordat je release:publish draait.');
  }

  cleanOldDmgs();
  run(npmCmd, ['run', 'build:mac']);

  const dmgs = findBuiltDmgs(nextVersion);
  if (!dmgs.length) {
    throw new Error(`Build klaar, maar geen DMG voor versie ${nextVersion} gevonden in dist/.`);
  }

  console.log('\nDMG gebouwd:');
  for (const dmg of dmgs) console.log(`- ${dmg}`);

  run('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md', 'RELEASE_NOTES.md']);
  const changed = getGitStatus();
  if (!changed) {
    throw new Error('Geen release-wijzigingen gevonden om te committen.');
  }

  console.log('\nRelease-wijzigingen:');
  console.log(changed);

  run('git', ['commit', '-m', `chore: release ${tag}`]);
  run('git', ['tag', tag]);

  run('git', ['push', 'origin', 'HEAD']);
  run('git', ['push', 'origin', tag]);
  if (publish) {
    await publishGitHubRelease(tag, nextVersion, dmgs);
  }
  resetReleaseNotesFile();
  console.log('RELEASE_NOTES.md is teruggezet als werkbestand voor de volgende release.');
  console.log(`\nRelease ${tag} staat op GitHub.`);
}

main().catch((error) => {
  console.error(`\nRelease mislukt: ${error.message}`);
  process.exit(1);
});
