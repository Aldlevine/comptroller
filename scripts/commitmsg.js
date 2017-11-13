#!/usr/bin/env node

const shell = require('./shell');

if (shell(`commitlint -e ${process.env.GIT_PARAMS}`)) process.exit(1);
