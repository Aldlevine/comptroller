#!/usr/bin/env node

/** @external {minimist} https://www.npmjs.com/package/minimist */
const minimist = require('minimist');
/** @type {Comptroller} */
const Comptroller = require('./comptroller');

/** The cli arguments */
const argv = minimist(process.argv.slice(2));

const root = argv.root || argv.r || '.';
const packages = argv.packages || argv.p || 'packages';
const c = new Comptroller({root, packages});

async function cli ()
{
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

