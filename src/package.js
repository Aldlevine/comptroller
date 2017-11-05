/** @type {fs} */
const fs = require('fs-extra');
/** @type {path} */
const path = require('path');
/** @type {promisify} */
const {promisify} = require('util');
/** @type {glob} */
const glob = promisify(require('glob'));
/** @external {detective} https://www.npmjs.com/package/@zdychacek/detective */
const detective = require('@zdychacek/detective');
/** @external {format-package} https://www.npmjs.com/package/format-package */
const format = require('format-package');

/**
 * Provides encapsulation for each local package.
 */
module.exports = class Package
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

      /** @type {object} */
      this._options = this._packageJson.comptroller || {};
    }
    catch (err)
    {
      this._packageJson = null;
      this._name = null;
      this._version = null;
    }

    /** @type {Map<string, string>} */
    this._dependencies = {};
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

          dependencies[name] = {file: sourcePath, name};
        }
      }

      this._dependencies = dependencies;
      res(dependencies);
    });
  }

  /**
   * Updates a packages package.json with values found in the main package.json
   */
  async updatePackageJson ()
  {
    const {inherit} = this._options;
    const packageJson = this._packageJson;
    const comptroller = this._comptroller;
    const mainPackageJson = comptroller._packageJson;
    if (inherit) {
      for (let key of inherit) {
        if (key in mainPackageJson) {
          if (packageJson[key] == mainPackageJson[key]) continue;
          packageJson[key] = mainPackageJson[key];
          comptroller.emit('info', {
            action: 'update-field',
            key,
            value: mainPackageJson[key],
            packageJson: this._packageJsonPath,
          });
        }
        else {
          comptroller.emit('warn', {
            type: 'update-field-missing',
            key,
            packageJson: this._packageJsonPath,
          });
        }
      }
    }
  }

  /**
   * Updates a packages package.json dependencies.
   */
  async updateDependencies ()
  {
    const comptroller = this._comptroller;
    for (let depName in this._dependencies) {
      const dep = this._dependencies[depName];
      this._packageJson.dependencies = this._packageJson.dependencies || {};
      // ignore package
      if (comptroller._ignorePackages.indexOf(depName) >= 0) continue;

      // local package
      if (depName in comptroller._packages) {
        const localPackage = comptroller._packages[depName];
        if (!(depName in this._packageJson.dependencies)) {
          this._packageJson.dependencies[depName] = localPackage._version;
          comptroller.emit('info', {
            action: 'add',
            type: 'local',
            file: dep.file,
            name: depName,
            version: localPackage._version,
            packageJson: this._packageJsonPath,
          });
        }
        else if (this._packageJson.dependencies[depName] !== localPackage._version) {
          this._packageJson.dependencies[depName] = localPackage._version;
          comptroller.emit('info', {
            action: 'update',
            type: 'local',
            file: dep.file,
            name: depName,
            version: localPackage._version,
            packageJson: this._packageJsonPath,
          })
        }
      }

      // remote package
      else {
        const version = comptroller._packageJson.dependencies[depName];
        if (!version) {
          comptroller.emit('warn', {
            type: 'missing',
            file: dep.file,
            name: depName
          });
        }
        else if (!(depName in this._packageJson.dependencies)) {
          this._packageJson.dependencies[depName] = version;
          comptroller.emit('info', {
            action: 'add',
            type: 'remote',
            file: dep.file,
            name: depName,
            version,
            packageJson: this._packageJsonPath,
          });
        }
        else if (this._packageJson.dependencies[depName] != version) {
          this._packageJson.dependencies[depName] = version;
          comptroller.emit('info', {
            action: 'update',
            type: 'remote',
            file: dep.file,
            name: depName,
            version,
            packageJson: this._packageJsonPath,
          });
        }
      }
    }
  }

  /**
   * Prunes unused dependencies from a packages package.json
   */
  async pruneDependencies ()
  {
    const comptroller = this._comptroller;
    for (let depName in this._packageJson.dependencies) {
      if (!(depName in this._dependencies)) {
        const version = this._packageJson.dependencies[depName];
        delete this._packageJson.dependencies[depName];
        comptroller.emit('info', {
          action: 'remove',
          name: depName,
          version,
          packageJson: this._packageJsonPath,
        });
      }
    }
  }

  /**
   * Format's package.json using {@link format-package}
   */
  async formatPackageJson ()
  {
    const comptroller = this._comptroller;
    let opts;
    if (comptroller._packageJsonOrder) {
      opts = {order: comptroller._packageJsonOrder};
    }
    return await format(this._packageJson, opts);
  }

  /**
   * Writes a package's package.json
   */
  async writePackageJson ()
  {
    await fs.writeFilePromise(this._packageJsonPath, await this.formatPackageJson());
  }
}


