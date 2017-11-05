/** @external {EventEmitter} https://nodejs.org/api/events.html#events_class_eventemitter */
const EventEmitter = require('events');
/** @external {fs} https://www.npmjs.com/package/fs-extra */
const fs = require('fs-extra');
/** @external {path} https://nodejs.org/api/path.html */
const path = require('path');
/** @external {promisify} https://nodejs.org/api/util.html#util_util_promisify_original */
const {promisify} = require('util');
/** @external {glob} https://www.npmjs.com/package/glob */
const glob = promisify(require('glob'));
/** @external {builtins} https://www.npmjs.com/package/builtin-modules */
const builtins = require('builtin-modules');
/** @type {Package} */
const Package = require('./package');

fs.readFilePromise = promisify(fs.readFile);
fs.writeFilePromise = promisify(fs.writeFile);
fs.ensureDirPromise = promisify(fs.ensureDir);
fs.ensureSymlinkPromise = promisify(fs.ensureSymlink);

/**
 * The core Comptroller class. It provides encapsulation for all of the stuff
 * that Comptroller is supposed to do
 */
module.exports = class Comptroller extends EventEmitter
{

  /**
   * Creates a new Comptroller instance.
   * @param {object} cfg - The configuration options
   * @param {string} [cfg.root = process.cwd()] - The project root (where your
   * main package.json lives).
   * @param {string} [cfg.packages = 'packages'] - The path from `cfg.root` to
   * the packages directory.
   * @param {object} [cfg.detective={}] - The options to pass to {@link detective}
   */
  constructor ({
    root = process.cwd(),
    packages = 'packages',
    ignorePackages = builtins,
    detective = {},
  }={})
  {
    super();

    /** @type {string} */
    this._rootPath = path.resolve(root);

    /** @type {string} */
    this._packagesPath = path.resolve(root, packages);

    /** @type {object} */
    this._packages = {};

    /** @type {string[]} */
    this._ignorePackages = ignorePackages;

    /** @type {object} */
    this._detectiveOpts = detective;

    /** @type {string} */
    this._packageJsonPath = path.resolve(root, 'package.json');

    try {
      /** @type {object} */
      this._packageJson = require(this._packageJsonPath);
    }
    catch (err) {
      this._packageJson = null;
    }
  }

  /**
   * Resolves the dependencies for local packages.
   */
  async resolvePackages ()
  {
    const packagePaths = await glob(path.join(this._packagesPath, '*'), {ignore: '**/node_modules/**'});
    for (let packagePath of packagePaths) {
      const pkg = new Package(this, packagePath);
      if (pkg._packageJson == null) {
        this.emit('warn', {
          type: 'packagejson',
          path: packagePath,
        });
        continue;
      }
      await pkg.evaluateDependencies(this._detectiveOpts);
      this._packages[pkg._name] = pkg;
    }
  }

  /**
   * Updates the dependencies for local packages.
   */
  async updateDependencies ()
  {
    for (let pkgName in this._packages) {
      this._packages[pkgName].updateDependencies();
    }
  }

  /**
   * Prunes the dependencies for local packages.
   */
  async pruneDependencies ()
  {
    for (let pkgName in this._packages) {
      this._packages[pkgName].pruneDependencies();
    }
  }

  /**
   * Writes the updated package.json's for each package.
   */
  async writePackageJsons ()
  {
    for (let pkgName in this._packages) {
      const pkg = this._packages[pkgName];
      await pkg.writePackageJson();
    }
  }

  /**
   * Updates the packge.json's for all packages.
   */
  async update ()
  {
    if (this._packageJson == null) {
      console.error(`ERROR: package.json not found in ${this._rootPath}`);
      process.exit(1);
    }
    this.on('info', (info) => {
      if (info.action == 'add') {
        console.log(`Added ${info.type} package "${info.name}@${info.version}" to ${info.packageJson}`);
      }
      else if (info.action == 'update') {
        console.log(`Updated ${info.type} package "${info.name}" to version ${info.version} in ${info.packageJson}`);
      }
    });
    this.on('warn', (warn) => {
      if (warn.type == 'missing') {
        console.warn(`WARNING: remote package "${warn.name}" invoked by ${warn.file} not found in package.json`);
      }
      if (warn.type == 'packagejson') {
        console.log(`WARNING: package.json not found in ${warn.path}`);
      }
    });
    this.on('error', (error) => {
      if (error.type == 'parse') {
        console.error(`ERROR: ${error.err.message} ${error.file}:${error.line}:${error.column}`);
      }
      else if (error.type == 'config') {
        console.error(`ERROR: ${error.err.message} in config option "${error.config}"`);
      }
      process.exit(1);
    });
    await this.resolvePackages();
    await this.updateDependencies();
    await this.writePackageJsons();
  }

  /**
   * Prunes the packge.json's for all packages.
   */
  async prune ()
  {
    if (this._packageJson == null) {
      console.error(`ERROR: package.json not found in ${this._rootPath}`);
      process.exit(1);
    }
    this.on('info', (info) => {
      if (info.action == 'remove') {
        console.log(`Removed package "${info.name}@${info.version}" from ${info.packageJson}`);
      }
    });
    this.on('error', (error) => {
      if (error.type == 'parse') {
        console.error(`ERROR: ${error.err.message} ${error.file}:${error.line}:${error.column}`);
      }
      else if (error.type == 'config') {
        console.error(`ERROR: ${error.err.message} in config option "${error.config}"`);
      }
      process.exit(1);
    });
    await this.resolvePackages();
    await this.pruneDependencies();
    await this.writePackageJsons();
  }

  /**
   * Creates a symlink'd node_modules to local packages.
   */
  async link ()
  {
    this.on('error', (error) => {
      if (error.type == 'parse') {
        console.error(`ERROR: ${error.err.message} ${error.file}:${error.line}:${error.column}`);
      }
      else if (error.type == 'config') {
        console.error(`ERROR: ${error.err.message} in config option "${error.config}"`);
      }
      process.exit(1);
    });

    await fs.ensureDirPromise(path.join(this._packagesPath, 'node_modules'));
    await this.resolvePackages();

    for (let pkgName in this._packages) {
      const pkg = this._packages[pkgName];
      let dstpath = path.join(this._packagesPath, 'node_modules', pkgName);
      await fs.ensureSymlinkPromise(pkg._dir, dstpath);
    }
  }
}
