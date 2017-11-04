#!/usr/bin/env node

/** @external {path} https://nodejs.org/api/path.html */
const path = require('path');
/** @external {minimist} https://www.npmjs.com/package/minimist */
const minimist = require('minimist');
/** @external {fs} https://www.npmjs.com/package/fs-extra */
const fs = require('fs-extra');
/** @external {promisify} https://nodejs.org/api/util.html#util_util_promisify_original */
const {promisify} = require('util');
/** @type {Comptroller} */
const Comptroller = require('./comptroller');

fs.pathExistsPromise = promisify(fs.pathExists);

/** The cli arguments */
const argv = minimist(process.argv.slice(2));

const root = argv.root || argv.r || '.';
const packages = argv.packages || argv.p || 'packages';
const configPath = argv.config || argv.c || '.comptroller.json';


async function cli ()
{
  let config = {root, packages};
  if (await fs.pathExistsPromise(path.resolve(root, configPath))) {
    try {
      config = {...require(path.resolve(root, configPath)), ...config};
    }
    catch (err) {
      console.error(`ERROR: ${err.message}`);
      process.exit(1);
    }
  }

  const c = new Comptroller(config);
  switch (argv._[0]) {
    case 'update':
      await c.update();
      break;
    case 'link':
      await c.link();
      break;
  }
}

cli();

