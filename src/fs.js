const fs = require('fs-extra');
const {promisify} = require('util');

for (let key of ['writeFile', 'readFile', 'ensureDir', 'ensureSymlink']) {
  fs[`${key}Please`] = promisify(fs[key]);
}

module.exports = fs;
