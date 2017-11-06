const path = require('path');
const {should, expect, assert} = require('chai');
const {makepkg, rempkg, fileStructure} = require('./makepkg');
const Package = require('../src/package');

describe('Package', function () {
  beforeEach(async function () {
    this.packageDir = path.resolve(__dirname, 'test-package')
    await rempkg(this.packageDir);
    await makepkg(this.packageDir, fileStructure);
    this.package = new Package({root: this.packageDir});
  });

  afterEach(async function () {
    delete this.package;
    await rempkg(this.packageDir);
    delete this.packageDir;
  });

  describe('#resolveDependency()', function () {
    it('should return false for relative dependencies', function () {
      expect(this.package.resolveDependency('../name')).to.be.false;
      expect(this.package.resolveDependency('./name')).to.be.false;
    });

    it('should return false for excluded dependencies', function () {
      expect(this.package.resolveDependency('excluded-dependency')).to.be.false;
    });

    it('should return static non-relative dependency name', function () {
      expect(this.package.resolveDependency('dependency')).to.equal('dependency');
      expect(this.package.resolveDependency('dependency/module')).to.equal('dependency');
      expect(this.package.resolveDependency('@org/dependency')).to.equal('@org/dependency');
      expect(this.package.resolveDependency('@org/dependency/module')).to.equal('@org/dependency');
    });
  });

  describe('#analyzeSourceDependencies()', function () {
    it('should return correct dependencies', async function () {
      const dependencies = {
        'dependency-1': {files: ['index.js', 'packages/package-1/index.js', 'packages/package-2/index.js']},
        'dependency-2': {files: ['index.js', 'packages/package-2/index.js']},
        'http': {files: ['index.js']},
        'not-a-package': {files: ['index.js']},
        'doesnt-exist': {files: ['packages/package-1/index.js']},
        'events': {files: ['packages/package-1/index.js']},
        '@test/package-1': {files: ['packages/package-2/index.js']}
      };
      const analyzed = await this.package.analyzeSourceDependencies();
      expect(analyzed).to.have.all.keys('dependency-1', 'dependency-2', 'http', 'not-a-package', 'doesnt-exist', 'events', '@test/package-1');

      expect(analyzed['dependency-1']).to.have.key('files');
      expect(analyzed['dependency-1']['files']).to.include('index.js', 'packages/package-1/index.js', 'packages/package-2/index.js');

      expect(analyzed['dependency-2']).to.have.key('files');
      expect(analyzed['dependency-2']['files']).to.include('index.js', 'packages/package-2/index.js');

      expect(analyzed['http']).to.have.key('files');
      expect(analyzed['http']['files']).to.include('index.js');

      expect(analyzed['not-a-package']).to.have.key('files');
      expect(analyzed['not-a-package']['files']).to.include('index.js');

      expect(analyzed['doesnt-exist']).to.have.key('files');
      expect(analyzed['doesnt-exist']['files']).to.include('packages/package-1/index.js');

      expect(analyzed['events']).to.have.key('files');
      expect(analyzed['events']['files']).to.include('packages/package-1/index.js');

      expect(analyzed['@test/package-1']).to.have.key('files');
      expect(analyzed['@test/package-1']['files']).to.include('packages/package-2/index.js');
    });
  });
});
