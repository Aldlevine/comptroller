const fs = require('fs-extra');
const path = require('path');
const generate = require('./generate-api');

class Plugin {
  onHandleConfig(ev) {
    this._config = ev.data.config;
    this._option = ev.data.option || {};
    if (!('enable' in this._option)) this._option.enable = true;

    if (!this._option.enable) return;

    const srcPath = path.resolve(__dirname, 'external-node.js');
    const outPath = path.resolve(this._config.source, '.external-node.js');

    fs.copySync(srcPath, outPath);
  }

  onHandleDocs(ev) {
    if (!this._option.enable) return;

    const outPath = path.resolve(this._config.source, '.external-node.js');
    fs.removeSync(outPath);

    const name = path.basename(path.resolve(this._config.source)) + '/.external-node.js';
    for (const doc of ev.data.docs) {
      if (doc.kind === 'external' && doc.memberof === name) doc.builtinExternal = true;
    }

    const docIndex = ev.data.docs.findIndex(doc => doc.kind === 'file' && doc.name === name);
    ev.data.docs.splice(docIndex, 1);
  }
}

module.exports = new Plugin();
