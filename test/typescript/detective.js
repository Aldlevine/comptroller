require('./settings')
const detective = require('detective-typescript')
const {
  expect
} = require('chai');

const path = require('../../src/path');
const fs = require('../../src/fs');

function readSrcFile(srcPath) {
  const fullSrcPath = path.join(__dirname, 'files', srcPath)
  return fs.readFileSync(fullSrcPath, 'utf8')
}

describe('typescript detective', () => {
  it('should detect dependencies in /files/typescript.ts', () => {
    const src = readSrcFile('typescript.ts.txt')
    const expectedDeps = ['http', 'not-a-package', 'dependency-1', 'dependency-2', 'excluded-dependency']

    const dependencies = detective(src)
    expect(dependencies).to.include.members(expectedDeps)
  })

  it('should detect dependencies in /files/typescript.tsx with TSX', () => {
    const filePath = 'typescript.tsx'
    const src = readSrcFile('typescript.tsx.txt')
    const expectedDeps = ['react', 'http', 'not-a-package', 'dependency-1', 'dependency-2', 'excluded-dependency']
    const config = {
      filePath
    }

    const dependencies = detective(src, config)
    expect(dependencies).to.include.members(expectedDeps)
  })
})
