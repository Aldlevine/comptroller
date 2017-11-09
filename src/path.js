const path = require('path');

/**
 * The new path object. Attemts to Posixify all path string responses.  Can't
 * just use path.posix because it doesn't seem to work for absolute paths.
 * @type {object}
 */
const newPath = {};

for (let key of ['resolve', 'join', 'format', 'normalize', 'relative']) {
  const origFn = path[key];
  newPath[key] = function (...args) {
    return path.posix.join(...path[key](...args).split(/\\|\/\//))
  }
}

module.exports = ({...path, ...newPath});
