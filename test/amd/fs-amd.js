const dedent = require('dedent');
const fs = require('../../src/fs');
const path = require('../../src/path');

exports.readSrcFile = function (srcPath) {
  const fullSrcPath = path.join(__dirname, 'files', srcPath)
  return fs.readFileSync(fullSrcPath, 'utf8')
}

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
        "source": "**/*.js",
        "dev": "test.js",
        "inherits": ["version", "author"],
        "exclude": ["excluded-dependency"]
      }
    }
  `,
  'index.js': dedent `
    define(['dependency-1', 'dependency-2'], function (b, c) {
      console.log(b, c);
    });

    define(['excluded-dependency', 'http'], function (b, c) {
      console.log(b, c);
    });

    define(['not-a-package'], function (a) {
      console.log(a);
    });
  `,
  'test.js': dedent `
  define(["dependency-1", "dependency-3"], function (b, c) {
    console.log(b, c);
  });
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
      'index.js': dedent `
        define(['dependency-1', 'dependency-2', 'doesnt-exist', 'events'], function (b, c) {
          console.log(b, c);
        });
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
      'index.js': dedent `
        define(['dependency-1', 'dependency-2', '@test/package-1'], function (b, c) {
          console.log(b, c);
        });
      `
    }
  }
};
