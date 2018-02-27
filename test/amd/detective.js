require('./settings')
const detective = require('detective-amd')
const {
  expect
} = require('chai');

const path = require('../../src/path');
const fs = require('../../src/fs');

function readSrcFile(srcPath) {
  const fullSrcPath = path.join(__dirname, 'files', srcPath)
  return fs.readFileSync(fullSrcPath, 'utf8')
}

describe('AMD detective', () => {
  it('should detect dependencies in /files/amd.js', () => {
    const src = readSrcFile('amd.js.txt')
    const expectedDeps = ['dependency-1', 'dependency-2', '@test/package-1']

    const dependencies = detective(src)
    expect(dependencies).to.include.members(expectedDeps)
  })
})
