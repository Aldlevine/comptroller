const dedent = require('dedent');
const path = require('../../src/path');
const fs = require('../../src/fs');

function readSrcFile(srcPath) {
  const fullSrcPath = path.join(__dirname, 'files', srcPath)
  return fs.readFileSync(fullSrcPath, 'utf8')
}

const fileName = 'es6.js' // TODO: 'es6.jsx.txt'
const srcFile = readSrcFile(fileName)

console.log(srcFile)

// comptroller:
// "srource": "index.mjs",

module.exports = {
  'package.json': dedent `
    {
      "name": "test-package",
      "version": "0.0.1",
      "author": "Some Body",
      "dependencies": {
        "dependency-1": "0.0.0",
        "dependency-2": "0.0.1",
        "unused-dependency": "0.0.0"
      },
      "devDependencies": {
        "dev-dependency-1": "9.9.9",
        "dev-dependency-2": "8.8.8"
      },
      "comptroller": {
        "dev": "test.mjs",
        "inherits": ["version", "author"],
        "exclude": ["excluded-dependency"]
      }
    }
  `,
  'index.mjs': dedent(srcFile),
  'test.mjs': dedent `
  import { z } from "dev-dependency-1";
  import { a } from "dev-dependency-3";
`,
  'packages': {
    'package-1': {
      'package.json': dedent `
        {
          "name": "@test/package-1",
          "version": "0.0.0",
          "comptroller": {
            "inherit": ["version", "author"]
          },
          "dependencies": {
            "dependency-1": "0.0.0",
            "dependency-2": "0.0.0",
            "extra-package": "1.2.3"
          }
        }
      `,
      'index.mjs': dedent `
      import * as a from 'dependency-1';
      import * as b from 'dependency-2';
      import * as c from 'doesnt-exist';
      import * as d from 'events';
    `
    },
    'package-2': {
      'package.json': dedent `
        {
          "name": "@test/package-2",
          "version": "0.0.2",
          "comptroller": {
            "inherit": ["version"]
          }
        }
      `,
      'index.mjs': dedent `
      import * as a from 'dependency-1';
      import * as b from 'dependency-2';
      import * as c from '@test/package-1';
      `
    }
  }
};
