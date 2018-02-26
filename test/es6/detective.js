// TODO: Test typescript detective individually on files and on file structure
const detective = require('detective-es6')
const {
  expect
} = require('chai');

const {
  readSrcFile
} = require('../helpers');

describe('ES6 detective', () => {
  it('should detect dependencies in /files/es6.js', () => {
    const src = readSrcFile('es6.js')
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
