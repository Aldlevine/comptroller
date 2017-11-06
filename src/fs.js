const fs = require('fs-extra');
const {promisify} = require('util');

for (let key of ['writeFile', 'readFile', 'readJson', 'ensureDir', 'ensureSymlink', 'remove']) {
  fs[`${key}Please`] = promisify(fs[key]);
}

module.exports = fs;
