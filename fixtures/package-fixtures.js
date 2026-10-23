const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const fixturesDir = __dirname;

function zipFolder(srcFolder, outZipPath) {
  const zip = new AdmZip();
  const files = fs.readdirSync(srcFolder);
  for (const file of files) {
    const fullPath = path.join(srcFolder, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      zip.addLocalFile(fullPath);
    }
  }
  zip.writeZip(outZipPath);
  console.log(`Created fixture archive: ${outZipPath}`);
}

const vulnDir = path.join(fixturesDir, 'vulnerable-app');
const corrDir = path.join(fixturesDir, 'corrected-app');

zipFolder(vulnDir, path.join(fixturesDir, 'vulnerable-app.zip'));
zipFolder(corrDir, path.join(fixturesDir, 'corrected-app.zip'));
