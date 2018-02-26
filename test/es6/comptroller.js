require('mocha-sinon');
const proxyquire = require('proxyquire');
const path = require('../../src/path');
const {
  expect
} = require('chai');
const {
  makepkg,
  rempkg,
  fileStructure
} = require('../makepkg');
const fs = require('../../src/fs');
const Patch = require('../../src/patch');
const Package = require('../../src/package');

proxyquire.noCallThru().noPreserveCache();

describe('Comptroller', function () {
  beforeEach(async function () {
    this.logger = {
      log: this.sinon.stub(),
      info: this.sinon.stub(),
      warn: this.sinon.stub(),
      error: this.sinon.stub(),
    };
    const Comptroller = proxyquire('../../src/comptroller', {
      './logger': this.logger,
    });

    this.packageDir = path.resolve(__dirname, 'test-package')
    await rempkg(this.packageDir);
    await makepkg(this.packageDir, fileStructure.es6);
    this.comptroller = new Comptroller({
      root: this.packageDir
    });
  });

  afterEach(async function () {
    delete this.comptroller;
    await rempkg(this.packageDir);
    delete this.packageDir;
    this.sinon.restore();
  });

  describe('#readChildren()', function () {
    it('should return all children with package.json files', function () {
      const children = this.comptroller.readChildren();
      expect(children.length).to.equal(2);
      expect(children[0]).to.be.an.instanceof(Package);
      expect(children[1]).to.be.an.instanceof(Package);
    });
  });

  describe('#getChildByName(name)', function () {
    it('should return a package for a name that is used in local packages', function () {
      let child = this.comptroller.getChildByName('@test/package-1');
      expect(child).to.be.an.instanceof(Package);
      expect(child.packageJson.name).to.equal('@test/package-1');
    });

    it('should return false for a name that is not used in local packages', function () {
      expect(this.comptroller.getChildByName('not-a-package')).to.be.false;
    });
  });

  describe('#updatePatches(patches)', function () {
    it('should get value from package.json for remote add patch', function () {
      const patch = new Patch(Patch.ADD, {
        name: 'dependency-1'
      });
      const updated = this.comptroller.updatePatches([patch]);
      expect(updated.length).to.equal(1);
      expect(updated[0].source).to.equal('remote');
      expect(updated[0].value).to.equal('0.0.0');
    });

    it('should get value from package.json for remote update patch', function () {
      const patch = new Patch(Patch.UPDATE, {
        name: 'dependency-2'
      });
      const updated = this.comptroller.updatePatches([patch]);
      expect(updated.length).to.equal(1);
      expect(updated[0].source).to.equal('remote');
      expect(updated[0].value).to.equal('0.0.1');
    });

    it('should get value from local packages for local add patch', function () {
      const patch = new Patch(Patch.ADD, {
        name: '@test/package-1'
      });
      const updated = this.comptroller.updatePatches([patch]);
      expect(updated.length).to.equal(1);
      expect(updated[0].source).to.equal('local');
      expect(updated[0].value).to.equal('0.0.0');
    });

    it('should get value from local packages for local update patch', function () {
      const patch = new Patch(Patch.ADD, {
        name: '@test/package-2'
      });
      const updated = this.comptroller.updatePatches([patch]);
      expect(updated.length).to.equal(1);
      expect(updated[0].source).to.equal('local');
      expect(updated[0].value).to.equal('0.0.2');
    });

    it('should get value from package.json for remote update patch', function () {
      const patch = new Patch(Patch.UPDATE, {
        name: 'dependency-2'
      });
      const updated = this.comptroller.updatePatches([patch]);
      expect(updated.length).to.equal(1);
      expect(updated[0].source).to.equal('remote');
      expect(updated[0].value).to.equal('0.0.1');
    });

    it('should mark remove patches as disabled when prune is false', function () {
      const patch = new Patch(Patch.REMOVE, {
        name: 'dependency'
      });
      const updated = this.comptroller.updatePatches([patch]);
      expect(updated.length).to.equal(1);
      expect(updated[0].disabled).to.be.true;
    });

    it('should mark remove patches as not disabled when prune is true', function () {
      const patch = new Patch(Patch.REMOVE, {
        name: 'dependency'
      });
      this.comptroller._prune = true;
      const updated = this.comptroller.updatePatches([patch]);
      expect(updated.length).to.equal(1);
      expect(updated[0].disabled).to.be.false;
    });

    it('should update inherit patches with value from packageJson', function () {
      const patch = new Patch(Patch.INHERIT, {
        name: 'version'
      });
      const updated = this.comptroller.updatePatches([patch]);
      expect(updated.length).to.equal(1);
      expect(updated[0].value).to.equal('0.0.1');
    });

    it('should ignore invalid patches', function () {
      const patch = new Patch();
      const updated = this.comptroller.updatePatches([patch]);
      expect(updated.length).to.equal(0);
    });
  });

  describe('#logPatch(child, patch)', function () {
    it('should warn when add patch has no value', function () {
      const patch = new Patch(Patch.ADD, {
        name: 'dependency',
        files: ['index.js', 'other.js'],
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.warn.calledWith(`WARNING: 'dependency' required by @test/package-1 (index.js,other.js) not found in package.json or local packages.`)).to.be.true;
    });

    it('should warn when non-dev add patch has is defined in devDependencies', function () {
      const patch = new Patch(Patch.ADD, {
        name: 'dev-dependency-1',
        files: ['test.js'],
      });
      const child = this.comptroller;
      this.comptroller.logPatch(child, patch);
      expect(this.logger.warn.calledWith(`WARNING: 'dev-dependency-1' required by test-package in non-dev source (test.js) was found in package.json devDependencies.`)).to.be.true;
    });

    it('should warn when non-dev update patch has is defined in devDependencies', function () {
      const patch = new Patch(Patch.UPDATE, {
        name: 'dev-dependency-1',
        files: ['test.js'],
      });
      const child = this.comptroller;
      this.comptroller.logPatch(child, patch);
      expect(this.logger.warn.calledWith(`WARNING: 'dev-dependency-1' required by test-package in non-dev source (test.js) was found in package.json devDependencies.`)).to.be.true;
    });

    it('should warn when update patch has no value', function () {
      const patch = new Patch(Patch.UPDATE, {
        name: 'dependency',
        files: ['index.js', 'other.js'],
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.warn.calledWith(`WARNING: 'dependency' required by @test/package-1 (index.js,other.js) not found in package.json or local packages.`)).to.be.true;
    });

    it('should log add patch', function () {
      const patch = new Patch(Patch.ADD, {
        name: 'dependency',
        source: 'local',
        value: '1.0.0',
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.log.calledWith(`Adding local package 'dependency@1.0.0' to package '@test/package-1'`)).to.be.true;
    });

    it('should log update patch', function () {
      const patch = new Patch(Patch.UPDATE, {
        name: 'dependency-1',
        source: 'remote',
        value: '1.0.0',
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.log.calledWith(`Updating remote package 'dependency-1' from 0.0.0 to 1.0.0 in package '@test/package-1'`)).to.be.true;
    });

    it('should not log update patch with same version', function () {
      const patch = new Patch(Patch.UPDATE, {
        name: 'dependency-1',
        source: 'remote',
        value: '0.0.0',
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.log.calledOnce).to.be.false;
    });

    it('should log remove patch', function () {
      const patch = new Patch(Patch.REMOVE, {
        name: 'dependency',
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.log.calledWith(`Removing package 'dependency' from '@test/package-1'`)).to.be.true;
    });

    it('should log inherit update patch', function () {
      const patch = new Patch(Patch.INHERIT, {
        name: 'version',
        value: '1.0.0',
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.log.calledWith(`Updating field version from "0.0.0" to "1.0.0" in package '@test/package-1'`)).to.be.true;
    });

    it('should log inherit add patch', function () {
      const patch = new Patch(Patch.INHERIT, {
        name: 'author',
        value: 'Some Body',
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.log.calledWith(`Adding field author as "Some Body" to package '@test/package-1'`)).to.be.true;
    });

    it('should not log inherit patch with same value', function () {
      const patch = new Patch(Patch.INHERIT, {
        name: 'version',
        value: '0.0.0',
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.log.calledOnce).to.be.false;
    });

    it('should log disabled patch', function () {
      const patch = new Patch(Patch.REMOVE, {
        name: 'dependency',
        disabled: true,
      });
      const child = new Package({
        root: path.join(this.packageDir, 'packages', 'package-1')
      });
      this.comptroller.logPatch(child, patch);
      expect(this.logger.log.calledWith(`DISABLED: Removing package 'dependency' from '@test/package-1'`)).to.be.true;
    });
  });

  describe('#updatePackages()', function () {
    it('should properly update packages without prune option', async function () {
      await this.comptroller.updatePackages();

      const package1 = this.comptroller.getChildByName('@test/package-1');
      expect(package1.packageJson.version).to.equal('0.0.1');
      expect(package1.packageJson.author).to.equal('Some Body');
      expect(package1.packageJson.dependencies).to.deep.equal({
        'dependency-1': '0.0.0',
        'dependency-2': '0.0.1',
        'extra-package': '1.2.3'
      });


      const package2 = this.comptroller.getChildByName('@test/package-2');
      expect(package2.packageJson.version).to.equal('0.0.1');
      expect(package2.packageJson).not.to.have.key('author');
      expect(package2.dependencies).to.deep.equal({
        '@test/package-1': '0.0.1',
        'dependency-1': '0.0.0',
        'dependency-2': '0.0.1'
      });
    });

    it('should properly update packages with prune option', async function () {
      this.comptroller._prune = true;
      await this.comptroller.updatePackages();

      const package1 = this.comptroller.getChildByName('@test/package-1');
      expect(package1.packageJson.version).to.equal('0.0.1');
      expect(package1.packageJson.author).to.equal('Some Body');
      expect(package1.packageJson.dependencies).to.deep.equal({
        'dependency-1': '0.0.0',
        'dependency-2': '0.0.1',
      });


      const package2 = this.comptroller.getChildByName('@test/package-2');
      expect(package2.packageJson.version).to.equal('0.0.1');
      expect(package2.packageJson).not.to.have.key('author');
      expect(package2.dependencies).to.deep.equal({
        '@test/package-1': '0.0.1',
        'dependency-1': '0.0.0',
        'dependency-2': '0.0.1'
      });
    });
  });

  describe('#updateSelf()', function () {
    it('should properly update dependencies without prune option', async function () {
      await this.comptroller.updateSelf();
      expect(this.comptroller.packageJson.dependencies).to.deep.equal({
        'dependency-1': '0.0.0',
        'dependency-2': '0.0.1',
        'unused-dependency': '0.0.0',
      });
      expect(this.comptroller.packageJson.devDependencies).to.deep.equal({
        'dev-dependency-1': '9.9.9',
        'dev-dependency-2': '8.8.8',
      });
    });

    it('should properly update dependencies with prune option', async function () {
      this.comptroller._prune = true;
      await this.comptroller.updateSelf();
      expect(this.comptroller.packageJson.dependencies).to.deep.equal({
        'dependency-1': '0.0.0',
        'dependency-2': '0.0.1',
      });
      expect(this.comptroller.packageJson.devDependencies).to.deep.equal({
        'dev-dependency-1': '9.9.9',
        'dev-dependency-2': '8.8.8',
      });
    });
  });
});
