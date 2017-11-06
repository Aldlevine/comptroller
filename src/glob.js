const {promisify} = require('util');
const glob = require('glob');

glob.please = promisify(glob);

module.exports = glob;
