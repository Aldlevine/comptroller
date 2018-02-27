// TODO: Test typescript detective individually on files and on file structure
const detective = require('detective-typescript')
const {
  expect
} = require('chai');

const {
  readSrcFile
} = require('../helpers');

describe('typescript detective', () => {
  it('should detect dependencies in /files/typescript.ts', () => {
    const src = readSrcFile('typescript.ts')
    const expectedDeps = ['http', 'not-a-package', 'dependency-1', 'dependency-2', 'excluded-dependency']

    const dependencies = detective(src)
    expect(dependencies).to.include.members(expectedDeps)
  })

  it('should detect dependencies in /files/typescript.tsx with TSX', () => {
    const filePath = 'typescript.tsx'
    const src = readSrcFile('typescript.tsx')
    const expectedDeps = ['react', 'http', 'not-a-package', 'dependency-1', 'dependency-2', 'excluded-dependency']
    const config = {
      filePath
    }

    const dependencies = detective(src, config)
    expect(dependencies).to.include.members(expectedDeps)
  })
})
