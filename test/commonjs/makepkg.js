const path = require('../../src/path');
const dedent = require('dedent');
const fs = require('../../src/fs');

const fileStructure = require('./fs-commonjs')

console.log(fileStructure)

exports.fileStructure = fileStructure

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