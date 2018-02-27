const {
  promisify
} = require('util');
const fastGlob = require('fast-glob');
const glob = require('glob');

glob.please = fastGlob // promisify(glob);

module.exports = glob;
