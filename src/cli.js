#!/usr/bin/env node

const {version} = require('../package.json');
const path = require('path');
const minimist = require('minimist');
const dedent = require('dedent');
const fs = require('./fs');
const Comptroller = require('./comptroller');

/** The cli arguments */
const argv = minimist(process.argv.slice(2));
const command = argv._[0] || 'help';
const root = argv._[1] || '.';

const prune = argv.prune || argv.p;

const cli = {
  help ()
  {
    console.log(dedent`
      Comptroller ${version}

      Usage:
      --------
      comp <command> [options]

      Commands:
      --------
      help                      Show this message
      update [root-directory]   Update all subpackages of package found at [root-directory]
      link [root-directory]     Create symlink in node_modules for each subpackage found at [root-directory]
      version                   Print Comptroller version

      Options:
      --------
      --prune -p                 Remove unused dependencies from subpackges' package.json
    `);
  },

  async update ()
  {
    const comp = new Comptroller({root, prune});
    await comp.updatePackages();
    await comp.writePackages();
  },

  async link ()
  {
    const comp = new Comptroller({root, prune});
    await comp.linkPackages();
  },

  version ()
  {
    console.log(`Comptroller ${version}`);
  },
}

;(async function main () {
  await cli[command]();
})();
