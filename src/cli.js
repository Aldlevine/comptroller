#!/usr/bin/env node

const {
  version
} = require('../package.json');
const path = require('./path');
const minimist = require('minimist');
const dedent = require('dedent');
const fs = require('./fs');
const logger = require('./logger');
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

const logOn = argv.log || argv.logging;
const amd = argv.amd
const commonjs = argv.commonjs || argv.cjs;
const typescript = argv.typescript || argv.ts;
const es6 = argv.es6 || argv.modules;

// by default set commonjs to true
if (commonjs === undefined) {
  commonjs = true
}

/**
 * Whether or not Comptroller should update the root package.
 * @type {boolean}
 */
const self = argv.self || argv.s;

/**
 * A function map for all cli commands
 * @type {Map<string, function>}
 */
const cli = {
  /**
   * Prints the help message
   */
  help() {
    logger.log(dedent `
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
      --prune -p                Remove unused dependencies from subpackges' package.json
      --self -s                 If set, only the root package will be updated
      --log                     Turn logging on for resolving dependencies
      --commonjs --cjs          Search for CommonJS (ie. node.js require) module dependencies
      --typescript --ts         Search for TypeScript (ie. import/export) module dependencies
      --es6 --modules           Search for ES6 (ie. import/export) module dependencies
    `);
  },

  /**
   * Updates all subpackages of package found at [root-directory]
   */
  async update() {
    const comp = new Comptroller({
      root,
      prune,
      logOn,
      commonjs,
      amd,
      typescript,
      es6
    });

    if (self) {
      await comp.updateSelf();
      await comp.writePackageJson();
    } else {
      await comp.updatePackages();
      await comp.writePackages();
    }
  },

  /**
   * Creates symlink in node_modules for each subpackage found at [root-directory]
   */
  async link() {
    const comp = new Comptroller({
      root,
      prune
    });
    await comp.linkPackages();
  },

  /**
   * Prints Comptroller version
   */
  version() {
    logger.log(`Comptroller ${version}`);
  },
}

;
(async function main() {
  try {
    await cli[command]();
  } catch (err) {
    if (err instanceof Error) {
      return logger.error(err.stack);
    }
    logger.error(err);
  }
})();
