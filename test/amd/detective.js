// TODO: Test typescript detective individually on files and on file structure
const detective = require('detective-amd')
const {
  expect
} = require('chai');

const {
  readSrcFile
} = require('../helpers');

describe('AMD detective', () => {
  it('should detect dependencies in /files/amd.js', () => {
    const src = readSrcFile('amd.js')
    const expectedDeps = ['dependency-1', 'dependency-2', '@test/package-1']

    const dependencies = detective(src)
    expect(dependencies).to.include.members(expectedDeps)
  })
})
