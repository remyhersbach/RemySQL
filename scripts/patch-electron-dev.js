#!/usr/bin/env node
// Patches the local Electron.app bundle for development:
//  - CFBundleName / CFBundleDisplayName → RemySQL  (dock tooltip, menus)
//  - CFBundleExecutable → RemySQL                   (app switcher process name)
//  - Symlinks MacOS/RemySQL → MacOS/Electron        (keeps npx electron working)
//  - Updates electron/path.txt                      (keeps npx electron working)
// Runs automatically via "postinstall" in package.json.

if (process.platform !== 'darwin') process.exit(0);

const path = require('node:path');
const { execFileSync, execSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');

const dist   = path.join(__dirname, '..', 'node_modules', 'electron', 'dist');
const plist  = path.join(dist, 'Electron.app', 'Contents', 'Info.plist');
const macos  = path.join(dist, 'Electron.app', 'Contents', 'MacOS');
const pathtxt = path.join(__dirname, '..', 'node_modules', 'electron', 'path.txt');
const buddy  = '/usr/libexec/PlistBuddy';

try {
  execFileSync(buddy, ['-c', 'Set :CFBundleName RemySQL', plist]);
  execFileSync(buddy, ['-c', 'Set :CFBundleDisplayName RemySQL', plist]);
  execFileSync(buddy, ['-c', 'Set :CFBundleExecutable RemySQL', plist]);
  execSync(`ln -sf "${macos}/Electron" "${macos}/RemySQL"`);
  writeFileSync(pathtxt, 'Electron.app/Contents/MacOS/RemySQL');
  console.log('Electron.app gepatcht → RemySQL');
} catch (e) {
  console.warn('patch-electron-dev: overgeslagen —', e.message);
}
