const dedent = require('dedent');

// "comptroller": {
//   "srource": "index.js",
// }

// FUCKS UP!
// "comptroller": {
//   "source": "index.js",
// }

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
        "dev": "test.js",
        "inherits": ["version", "author"],
        "exclude": ["excluded-dependency"]
      }
    }
  `,
  'index.js': dedent `
    require('dependency-1');
    require('dependency-2');
    require('excluded-dependency');
    require('http');
    require('not-a-package');
  `,
  'test.js': dedent `
    require("dev-dependency-1");
    require("dev-dependency-3");
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
        require('dependency-1');
        require('dependency-2');
        require('doesnt-exist');
        require('events');
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
        require('dependency-1');
        require('dependency-2');
        require('@test/package-1');
      `
    }
  }
};
