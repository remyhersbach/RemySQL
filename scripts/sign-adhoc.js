'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

function hasDeveloperIdIdentity() {
  try {
    const identities = execFileSync('/usr/bin/security', ['find-identity', '-v', '-p', 'codesigning'], {
      encoding: 'utf8'
    });
    return identities.includes('Developer ID Application');
  } catch {
    return false;
  }
}

function codesign(args) {
  execFileSync('/usr/bin/codesign', args, { stdio: 'inherit' });
}

module.exports = async function signAdHoc(context) {
  if (context.electronPlatformName !== 'darwin') return;

  if (hasDeveloperIdIdentity()) {
    console.log('  • ad-hoc ondertekenen overgeslagen  reason=Developer ID Application gevonden');
    return;
  }

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log(`  • ad-hoc ondertekenen  app=${appPath}`);
  codesign(['--force', '--deep', '--sign', '-', appPath]);
  codesign(['--verify', '--deep', '--strict', appPath]);
};
