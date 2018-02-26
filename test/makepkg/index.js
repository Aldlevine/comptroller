const path = require('../../src/path');
const dedent = require('dedent');
const fs = require('../../src/fs');

exports.readSrcFile = function (srcPath) {
  const fullSrcPath = path.join(__dirname, 'files', srcPath)
  return fs.readFileSync(fullSrcPath, 'utf8')
}

exports.fileStructure = {
  commonjs: require('./fs-commonjs'),
  typescript: require('./fs-typescript'),
  es6: require('./fs-es6'),
  amd: require('./fs-amd')
}

exports.makepkg = async function makepkg(location, structure) {
  await fs.ensureDirPlease(location);
  for (let entry in structure) {
    const dir = path.resolve(location, entry);
    const content = structure[entry];
    if (typeof content === 'object') {
      await makepkg(dir, content);
    } else {
      await fs.writeFilePlease(dir, content);
    }
  }
};

exports.rempkg = async function rempkg(location) {
  await fs.removePlease(location);
};
