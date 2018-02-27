const dedent = require('dedent');
const {
  readSrcFile
} = require('.')

const fileName = 'typescript.ts' // TODO: 'typescript.tsx'
const srcFile = readSrcFile(fileName)

// "srource": "index.ts",

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
        "log": true,
        "dev": "test.ts",
        "inherits": ["version", "author"],
        "exclude": ["excluded-dependency"]
      }
    }
  `,
  'index.ts': dedent(srcFile),
  'test.ts': dedent `
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
      'index.ts': dedent `
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
      'index.ts': dedent `
      import * as a from 'dependency-1';
      import * as b from 'dependency-2';
      import * as c from '@test/package-1';
      `
    }
  }
};
