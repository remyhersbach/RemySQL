#!/usr/bin/env node
// Renders assets/icon.svg → assets/icon.png via Electron's Chromium engine.
// Run with: electron scripts/render-icon.js
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { readFileSync, writeFileSync } = require('node:fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    webPreferences: { offscreen: true }
  });

  const svg = readFileSync(path.join(__dirname, '..', 'assets', 'icon.svg'), 'utf8');
  const html = `<!doctype html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent">${svg}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise(r => setTimeout(r, 400));

  const image = await win.webContents.capturePage();
  writeFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), image.toPNG());
  console.log('icon.png gegenereerd');
  app.quit();
});
