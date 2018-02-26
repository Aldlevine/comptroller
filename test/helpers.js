const path = require('../src/path');
const fs = require('../src/fs');

exports.readSrcFile = function (srcPath) {
  const fullSrcPath = path.join(__dirname, 'makePkg', 'files', srcPath)
  return fs.readFileSync(fullSrcPath, 'utf8')
}
