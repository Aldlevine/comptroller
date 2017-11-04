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
/** @external {detective} https://www.npmjs.com/package/@zdychacek/detective */
const detective = require('@zdychacek/detective');
/** @external {builtins} https://www.npmjs.com/package/builtin-modules */
const builtins = require('builtin-modules');

fs.readFilePromise = promisify(fs.readFile);
fs.writeFilePromise = promisify(fs.writeFile);
fs.ensureDirPromise = promisify(fs.ensureDir);
fs.ensureSymlinkPromise = promisify(fs.ensureSymlink);

/**
 * Provides encapsulation for each local package.
 */
class Package
{
  /**
   * Creates a new package.
   * @param {Comptroller} comptroller - The parent Comptroller instance.
   * @param {string} dir - The package's directory.
   */
  constructor (comptroller, dir)
  {
    /** @type {Comptroller} */
    this._comptroller = comptroller;

    /** @type {string} */
    this._dir = dir;

    /** @type {string} */
    this._packageJsonPath = path.join(dir, 'package.json');

    try {
      /** @type {object} */
      this._packageJson = require(this._packageJsonPath);

      /** @type {string} */
      this._name = this._packageJson.name;

      /** @type {string} */
      this._version = this._packageJson.version;
    }
    catch (err)
    {
      this._packageJson = null;
      this._name = null;
      this._version = null;
    }

  }

  /**
   * Evaluates a package's dependencies
   */
  async evaluateDependencies (detectiveOpts)
  {
    return new Promise(async (res, rej) => {
      const sourcePaths = await glob(path.join(this._dir, '**/*.js'));
      const dependencies = {};
      for (let sourcePath of sourcePaths) {
        const sourceFile = await fs.readFilePromise(sourcePath);
        let reqs;
        try {
          reqs = detective(sourceFile, detectiveOpts);
        }
        catch (err) {
          // Parser error
          if (err.loc) {
            let {line, column} = err.loc;
            return this._comptroller.emit('error', {
              type: 'parse',
              err,
              file: sourcePath,
              line,
              column,
            });
          }
          // Config error
          return this._comptroller.emit('error', {
            type: 'config',
            config: 'detective',
            err,
          });
        }
        for (let req of reqs) {
          // It's a relative dep, so skip it
          if (/^\.\//.test(req)) continue;

          const split = req.split('/');
          let name = split.shift();
          if (name.charAt(0) == '@') name += '/' + split.shift();

          // return {file: sourcePath, name};
          dependencies[name] = {file: sourcePath, name};
        }
      }

      res(dependencies);
    });
  }

  /**
   * Writes a package's package.json
   */
  async writePackageJson ()
  {
    await fs.writeFilePromise(this._packageJsonPath, JSON.stringify(this._packageJson, null, 2));
  }
}

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
      pkg._dependencies = await pkg.evaluateDependencies(this._detectiveOpts);
      this._packages[pkg._name] = pkg;
    }
  }

  /**
   * Updates the dependencies for local packages.
   */
  async updateDependencies ()
  {
    for (let pkgName in this._packages) {
      const pkg = this._packages[pkgName];
      for (let depName in pkg._dependencies) {
        const dep = pkg._dependencies[depName];
        pkg._packageJson.dependencies = pkg._packageJson.dependencies || {};
        // ignore package
        if (this._ignorePackages.indexOf(depName) >= 0) continue;

        // local package
        if (depName in this._packages) {
          if (!(depName in pkg._packageJson.dependencies)) {
            pkg._packageJson.dependencies[depName] = this._packages[depName]._version;
            this.emit('info', {
              action: 'add',
              type: 'local',
              file: dep.file,
              name: depName,
              version: this._packages[depName]._version,
              packageJson: pkg._packageJsonPath,
            });
          }
          else if (pkg._packageJson.dependencies[depName] !== this._packages[depName]._version) {
            pkg._packageJson.dependencies[depName] = this._packages[depName]._version;
            this.emit('info', {
              action: 'update',
              type: 'local',
              file: dep.file,
              name: depName,
              version: this._packages[depName]._version,
              packageJson: pkg._packageJsonPath,
            })
          }
        }

        // remote package
        else {
          if (!(depName in this._packageJson.dependencies)) {
            // delete pkg._packageJson.dependencies[depName];
            this.emit('warn', {
              type: 'missing',
              file: dep.file,
              name: depName
            });
          }
          else if (!(depName in pkg._packageJson.dependencies)) {
            pkg._packageJson.dependencies[depName] = this._packageJson.dependencies[depName];
            this.emit('info', {
              action: 'add',
              type: 'remote',
              file: dep.file,
              name: depName,
              version: this._packageJson.dependencies[depName],
              packageJson: pkg._packageJsonPath,
            });
          }
          else if (pkg._packageJson.dependencies[depName] != this._packageJson.dependencies[depName]) {
            pkg._packageJson.dependencies[depName] = this._packageJson.dependencies[depName];
            this.emit('info', {
              action: 'update',
              type: 'remote',
              file: dep.file,
              name: depName,
              version: this._packageJson.dependencies[depName],
              packageJson: pkg._packageJsonPath,
            });
          }
        }
      }
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
   * Creates a symlink'd node_modules to local packages.
   */
  async link ()
  {
    await fs.ensureDirPromise(path.join(this._packagesPath, 'node_modules'));
    await this.resolvePackages();

    for (let pkgName in this._packages) {
      const pkg = this._packages[pkgName];
      let dstpath = path.join(this._packagesPath, 'node_modules', pkgName);
      await fs.ensureSymlinkPromise(pkg._dir, dstpath);
    }
  }
}

