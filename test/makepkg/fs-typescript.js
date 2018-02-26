const dedent = require('dedent');
const {
  readSrcFile
} = require('.')

const fileName = 'typescript.txt' // TODO: 'typescript.tsx.txt'
const srcFile = readSrcFile(fileName)

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
        "source": "index.js",
        "dev": "test.js",
        "inherits": ["version", "author"],
        "exclude": ["excluded-dependency"]
      }
    }
  `,
  'index.ts': dedent(srcFile),
  'test.ts': dedent `
    import from "dev-dependency-1"
    import from "dev-dependency-3";
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
        import from 'dependency-1';
        import from 'dependency-2';
        import from 'doesnt-exist';
        import from 'events';
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
        import from 'dependency-1';
        import from 'dependency-2';
        import from '@test/package-1';
      `
    }
  }
};
