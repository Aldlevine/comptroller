require('./settings')
const detective = require('detective-es6')
const {
  expect
} = require('chai');

const path = require('../../src/path');
const fs = require('../../src/fs');

function readSrcFile(srcPath) {
  const fullSrcPath = path.join(__dirname, 'files', srcPath)
  return fs.readFileSync(fullSrcPath, 'utf8')
}

describe('ES6 detective', () => {
  it('should detect dependencies in /files/es6.js.txt', () => {
    const src = readSrcFile('es6.js.txt')
    const expectedDeps = ['http', 'not-a-package', 'dependency-1', 'dependency-2', 'excluded-dependency']

    const dependencies = detective(src)
    expect(dependencies).to.include.members(expectedDeps)
  })

  it('should detect dependencies in /files/es6.jsx with JSX', () => {
    const src = readSrcFile('es6.jsx.txt')
    const expectedDeps = ['http', 'not-a-package', 'dependency-1', 'dependency-2', 'excluded-dependency']

    const dependencies = detective(src)
    expect(dependencies).to.include.members(expectedDeps)
  })
})
