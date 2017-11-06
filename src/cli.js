#!/usr/bin/env node

const {version} = require('../package.json');
const path = require('path');
const minimist = require('minimist');
const dedent = require('dedent');
const fs = require('./fs');
const Comptroller = require('./comptroller');

/**
 * The cli arguments
 * @type {object}
 */
const argv = minimist(process.argv.slice(2));

/**
 * The command to run
 * @type {string}
 */
const command = argv._[0] || 'help';

/**
 * The package root dir
 * @type {string}
 */
const root = argv._[1] || '.';

/**
 * Whether or not Comtroller should prune dependencies.
 * @type {boolean}
 */
const prune = argv.prune || argv.p;

/**
 * A function map for all cli commands
 * @type {Map<string, function>}
 */
const cli = {
  /**
   * Prints the help message
   */
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

  /**
   * Updates all subpackages of package found at [root-directory]
   */
  async update ()
  {
    const comp = new Comptroller({root, prune});
    await comp.updatePackages();
    await comp.writePackages();
  },

  /**
   * Creates symlink in node_modules for each subpackage found at [root-directory]
   */
  async link ()
  {
    const comp = new Comptroller({root, prune});
    await comp.linkPackages();
  },

  /**
   * Prints Comptroller version
   */
  version ()
  {
    console.log(`Comptroller ${version}`);
  },
}

;(async function main () {
  try {
    await cli[command]();
  }
  catch (err) {
    if (err instanceof Error) {
      return console.error(err.stack);
    }
    console.error(err);
  }
})();
