const path = require('path');
const dedent = require('dedent');
const fs = require('../src/fs');

exports.fileStructure = {
  'package.json': dedent`
    {
      "name": "test-package",
      "version": "0.0.1",
      "dependencies": {
        "dependency-1": "0.0.0",
        "dependency-2": "0.0.1"
      },
      "comptroller": {
        "exclude": ["excluded-dependency"]
      }
    }
  `,
  'index.js': dedent`
    require('dependency-1');
    require('dependency-2');
    require('excluded-dependency');
    require('http');
    require('not-a-package');
  `,
  'packages': {
    'package-1': {
      'package.json': dedent`
        {
          "name": "@test/package-1",
          "version": "0.0.0",
          "comptroller": {
            "inherit": ["version"]
          }
        }
      `,
      'index.js': dedent`
        require('dependency-1');
        require('doesnt-exist');
        require('events');
      `
    },
    'package-2': {
      'package.json': dedent`
        {
          "name": "@test/package-2",
          "version": "0.0.2",
          "comptroller": {
            "inherit": ["version"]
          }
        }
      `,
      'index.js': dedent`
        require('dependency-1');
        require('dependency-2');
        require('@test/package-1');
      `
    }
  }
}

exports.makepkg = async function makepkg (location, structure)
{
  await fs.ensureDirPlease(location);
  for (let entry in structure) {
    const dir = path.resolve(location, entry);
    const content = structure[entry];
    if (typeof content === 'object') {
      await makepkg(dir, content);
    }
    else {
      await fs.writeFilePlease(dir, content);
    }
  }
}

exports.rempkg = async function rempkg (location)
{
  await fs.removePlease(location);
}
