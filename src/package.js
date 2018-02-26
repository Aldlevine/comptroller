const path = require('./path');
const glob = require('./glob');
const minimatch = require('minimatch');
const fs = require('./fs');
const builtins = require('builtin-modules');

const nodeDetective = require('detective')

const detective = {
  commonjs: nodeDetective,
  amd: require('detective-amd'),
  es6: require('detective-es6'),
  typescript: require('detective-typescript')
}

const sortPackageJson = require('sort-package-json');
const beautify = require('json-beautify');
const Patch = require('./patch');

/**
 * This is the package class. It serves as encapsulation for individual
 * packages, as a means of querying for package info, and as an outlet for
 * changes to a package.
 */
module.exports = class Package {
  /**
   * Creates a new package instance. It can accept it's configuration either
   * through the package.json file or through the constructor arguments.
   * @param {object} opts - The package options.
   * @param {string} opts.root - The root directory of the package.
   * @param {object} [opts.packageJson = fs.readJson('root package.json')] - The
   * package's package.json. If not specified, it's read from the root
   * directory.
   * @param {object} [opts.config = opts.packageJson.comptroller || {}] - The
   * Comptroller configurations options.
   * @param {glob} [opts.config.source = '⚹⚹/⚹.js'] - A glob that selects
   * the packages source files.
   * @param {glob} [opts.config.dev = '⚹⚹/test/⚹⚹/⚹.js'] - A glob that selects
   * the packages that should also include devDependencies
   * @param {glob[]} [opts.config.ignore = ['⚹⚹/node_modules/⚹⚹']] - An array
   * of globs to pass into {@link glob}'s `ignore` option when searching for
   * source files.
   * @param {Array<string|object>} [opts.config.exclude = builtins] - An array of package
   * names to ignore in all operations. Defaults to {@link builtin-modules}.
   * @param {string[]} [opts.config.inherits = []] - An array of field names to
   * inherit from the parent package.json. This is useful for values that
   * remain the same across all packages.
   * @param {object} [opts.config.detective = {}] - The options to pass through
   * to <a href="https://npmjs.com/package/@zdychacek/detective">detective</a>.
   * @param {boolean} [opts.config.prune = false] - Whether or not unused
   * dependencies should be pruned from the package.json.
   * @param {boolean|number} [opts.config.pretty = false] - The "maximum fixed
   * character width" parameter to pass to json-beautify.
   * @param {boolean} [opts.config.commonjs = true] - search for commonjs dependencies
   * @param {boolean} [opts.config.es6 = false] - search for es6 module dependencies
   * @param {boolean} [opts.config.amd = false] - search for amd module dependencies
   * @param {boolean} [opts.config.typescript = false] - search for typescript module dependencies
   * @param {boolean} [opts.config.log = false] - Whether logging is turned on
   **/
  constructor({
    root,
    packageJson = fs.readJsonSync(path.resolve(root, 'package.json')),
    config = {},
    _config = packageJson.comptroller || {},
    source = _config.source || config.source || '**/*.js ',
    dev = _config.dev || config.dev || '**/test/*.js',
    ignore = _config.ignore || config.ignore || ['**/node_modules/**'],
    exclude = _config.exclude || config.exclude || builtins,
    inherits = _config.inherits || config.inherits || [],
    detective = _config.detective || config.detective || {},
    prune = !!(_config.prune || config.prune),
    pretty = !!(_config.pretty || config.pretty),

    commonjs = !!(_config.commonjs || config.commonjs || process.env.CJS),
    typescript = !!(_config.typescript || config.typescript || process.env.TS),
    es6 = !!(_config.es6 || config.es6 || process.env.ES6),
    amd = !!(_config.amd || config.amd || process.env.AMD),
    logOn = !!(_config.log || config.log || process.env.LOG),
  }) {
    /** @type {string} */
    this._root = root;

    /** @type {object} */
    this._packageJson = packageJson;

    /** @type {glob} */
    this._source = source;

    /** @type {glob} */
    this._dev = dev;

    /** @type {glob[]} */
    this._ignore = ignore;

    /** @type {string[]} */
    this._exclude = Package.generateExcludes(exclude);

    /** @type {string[]} */
    this._inherits = inherits;

    /** @type {object} */
    this._detective = detective;

    /** @type {boolean} */
    this._prune = prune;

    /** @type {boolean|number} */
    this._pretty = pretty;

    /** @type {boolean} */
    this._commonjs = commonjs;

    /** @type {boolean} */
    this._typescript = typescript;

    /** @type {boolean} */
    this._es6 = es6;

    /** @type {boolean} */
    this._logOn = logOn;
  }

  get checkExtMap() {
    return {
      ts: /tsx?$/,
      js: /jsx?$/,
      es6: /mjsx?$/,
      default: /jsx?$/
    }
  }

  /**
   * The package's root directory.
   * @type {string}
   */
  get root() {
    return this._root
  }

  /**
   * An object representing the package's package.json.
   * @type {object}
   */
  get packageJson() {
    return this._packageJson
  }

  /**
   * An object representing the package's dependencies.
   * @type {object}
   */
  get dependencies() {
    return this.packageJson.dependencies || (this.packageJson.dependencies = {})
  }

  /**
   * An object representing the package's devDependencies.
   * @type {object}
   */
  get devDependencies() {
    return this.packageJson.devDependencies || (this.packageJson.devDependencies = {})
  }

  /**
   * A glob that matches the package's source files
   * @type {glob}
   */
  get source() {
    return this._source
  }

  /**
   * A glob that matches the package's dev files
   * @type {minimatch}
   */
  get dev() {
    return this._dev
  }

  /**
   * An array of globs that match files not to be included with the package's
   * source files.
   * @type {glob[]}
   */
  get ignore() {
    return this._ignore
  }

  /**
   * An array of package names to ignore in all operations.
   * @type {string[]}
   */
  get exclude() {
    return this._exclude
  }

  /**
   * An array of field names the package should inherit from it's parent
   * package.json.
   * @type {string[]}
   */
  get inherits() {
    return this._inherits
  }

  /**
   * The options to pass through to <a href="https://npmjs.com/package/@zdychacek/detective">detective</a>.
   * @type {object}
   */
  get detective() {
    return this._detective
  }

  /**
   * Whether or not unused dependencies should be pruned from the package.json.
   * @type {boolean}
   */
  get prune() {
    return this._prune
  }

  /**
   * The "maximum fixed character width" parameter to pass to json-beautify.
   * @type {boolean|number}
   */
  get pretty() {
    return this._pretty
  }

  /**
   * Whether CommonJS dependencies are to be searched
   * @type {boolean}
   */
  get commonjs() {
    return this._commonjs
  }

  /**
   * Whether AMD dependencies are to be searched
   * @type {boolean}
   */
  get amd() {
    return this._amd
  }

  /**
   * Whether TypeScript dependencies are to be searched
   * @type {boolean}
   */
  get typescript() {
    return this._typescript
  }

  /**
   * Whether ES6 module dependencies are to be searched
   * @type {boolean}
   */
  get es6() {
    return this._es6
  }

  /**
   * Whether Logging is turned on
   * @type {boolean}
   */
  get logOn() {
    return this._logOn
  }


  /**
   * Writes {@link Package#packageJson} to it's respective package.json file.
   */
  async writePackageJson() {
    const packageJson = sortPackageJson(this.packageJson);
    const json = beautify(packageJson, null, 2, this.pretty);
    await fs.writeFilePlease(path.resolve(this.root, 'package.json'), json);
  }

  /**
   * Takes a dependency name and resolves it to the actual dependency name,
   * stripping any subdirectories from the dependency name (retaining @org
   * style dependencies). It also excludes dependencies with relative paths (./
   * or ../ style) and any dependencies listed in {@link Package#exclude}
   * @param {string} dependency - The dependency to resolve
   * @return {string | boolean} - The resolved dependency name, or false if the
   * the dependency is excluded.
   */
  resolveDependency(dependency) {
    if (dependency.charAt(0) == '.') return false;
    if (this.exclude.indexOf(dependency) >= 0) return false;
    const split = dependency.split('/');
    return split[0].charAt(0) == '@' ? split[0] + '/' + split[1] : split[0];
  }

  detectiveOpts(name) {
    return (this.detective || {})[name] || this.detective
  }

  log(msg, data) {
    if (!this.logOn) return
    data ? console.log(msg, data) : console.log(msg)
  }

  error(msg, data) {
    console.error(msg, data)
    throw new Error(msg)
  }

  depsFor(name, src, file) {
    if (!this[name]) {
      // this.log('depsFor: skipped', name, {
      //   file
      // })
      return []
    }
    this.log('depsFor', {
      name,
      file
    })
    const opts = this.detectiveOpts(name) || {}
    const $detective = detective[name]

    if (!$detective) {
      this.error(`detective not registered: ${name}`, {
        $detective,
        detective,
        name
      })
    }
    let deps
    try {
      deps = $detective(src, opts)
    } catch (err) {
      this.error(err)
    }

    this.log('depsFor: dependencies found', {
      src,
      deps
    })
    return deps
  }

  fileExtension(file) {
    return path.extname(file).slice(1)
  }

  concatDeps(...deps) {
    deps = deps.filter(dep => Array.isArray(dep))
    return [].concat(...deps)
  }

  matchExt(ext) {
    const regExp = this.checkExtMap[ext] || this.checkExtMap.default
    const match = regExp.test(ext)
    this.log('matchExt', {
      ext,
      match
    })
    return match
  }

  resolve_ts(src, ext, file) {
    return this.matchExt(ext) ? this.depsFor('typescript', src, file) : []
  }

  resolve_es6(src, ext, file) {
    return this.matchExt(ext) ? this.depsFor('es6', src, file) : []
  }

  resolve_js(src, ext, file) {
    return this.matchExt(ext) ? this.concatDeps(
      this.depsFor('commonjs', src, file),
      this.depsFor('es6', src, file),
      this.depsFor('amd', src, file)) : []
  }

  resolve_default(src, ext, file) {
    // default fallback to include all
    return this.concatDeps(
      this.depsFor('commonjs', src, file),
      this.depsFor('es6', src, file),
      this.depsFor('typescript', src, file),
      this.depsFor('amd', src, file)
    )
  }

  resolveByExt(src, ext, {
    file,
    names
  }) {
    names = names || ['js', 'es6', 'ts', 'default']
    return names.reduce((acc, name) => {
      this.log('resolveByExt', name)
      // try to resolve using each extension until one returns dependencies
      if (acc.length > 0) {
        this.log('resolveByExt: found', acc)
        return acc
      }
      const funName = `resolve_${name}`
      const fun = this[funName].bind(this)
      const result = fun(src, ext, file)
      this.log('resolveByExt', {
        file,
        funName,
        result
      })
      if (result) {
        acc = acc.concat(result)
      }
      return acc
    }, [])
  }

  /**
   * Find dependencies in source file
   * @param {*} src
   */
  findDependencies(src, file) {
    console.log('findDependencies', file)
    const ext = this.fileExtension(file)
    return this.resolveByExt(src, ext, {
      file
    })
  }

  /**
   * Analyzes the package's source files and returns all of the invoked
   * dependencies mapped to the files invoking them.
   * @return {Map<string, object>} - A map with the dependency names as keys
   * and the dependency metadata as values.
   */
  async analyzeSourceDependencies() {
    const globPath = path.resolve(this.root, this.source)
    const globOpts = {
      ignore: this.ignore,
      nodir: true,
    }
    const files = await glob.please(globPath, globOpts);
    const deps = {};
    this.log('analyzeSourceDependencies', {
      globPath,
      globOpts,
      files
    })

    await Promise.all(files.map(async (file) => {
      const src = await fs.readFilePlease(file, 'utf8');
      this.log('findDependencies', {
        src,
        file
      })
      // const dependencies = nodeDetective(src, this.detective);
      const dependencies = this.findDependencies(src, file)
      const relFile = path.relative(this.root, file);
      for (let dep of dependencies) {
        if (dep = this.resolveDependency(dep)) {
          deps[dep] = deps[dep] || {
            files: []
          };
          deps[dep].files.push(relFile);
        }
      }
    }));
    return deps;
  }

  /**
   * Compares a dependency object (as returned from {@link Package#analyzeSourceDependencies})
   * with the dependencies listed in {@link Package@packageJson} and returns an
   * array of patches.
   * @param {object} dependencies - The dependencies to generate a patch for.
   * @return {Patch[]} - The patches that will make {@link Package#packageJson} match the inputted dependencies
   */
  generateDependencyPatches(dependencies) {
    const patches = [];
    const usedDeps = {};
    // const usedDev = {};

    for (let dep in dependencies) {
      let {
        files
      } = dependencies[dep];
      let dev = true;

      for (let file of files) {
        if (!minimatch(file, this.dev)) {
          dev = false;
          break;
        }
      }

      usedDeps[dep] = true;

      if (dev && !(dep in this.devDependencies) && !(dep in this.dependencies)) {
        patches.push(new Patch(Patch.ADD, {
          name: dep,
          dev,
          files
        }));
      } else if (!dev && !(dep in this.dependencies)) {
        patches.push(new Patch(Patch.ADD, {
          name: dep,
          files
        }));
      } else {
        if (dep in this.devDependencies) {
          patches.push(new Patch(Patch.UPDATE, {
            name: dep,
            dev: true,
            files
          }));
        } else if (dep in this.dependencies) {
          patches.push(new Patch(Patch.UPDATE, {
            name: dep,
            files
          }));
        }
      }
    }

    for (let dep in this.dependencies) {
      if (!usedDeps[dep] && this.exclude.indexOf(dep) < 0) {
        patches.push(new Patch(Patch.REMOVE, {
          name: dep
        }))
      }
    }

    return patches;
  }

  /**
   * Generates the patches that will satisfy {@link Package#inherits}
   * @return {Patch[]} - The patches that will update {@link Package#packageJson} with the inherited fields.
   */
  generateInheritPatches() {
    return this.inherits.map((name) => new Patch(Patch.INHERIT, {
      name
    }));
  }

  /**
   * Applies a given patch to {@link Package#packageJson}.
   * @param {Patch} patch - The patch to apply,
   */
  applyPatch(patch) {
    if (patch.disabled) return;

    let depField = patch.dev ? 'devDependencies' : 'dependencies';

    switch (patch.type) {
      case Patch.ADD:
      case Patch.UPDATE:
        if (typeof patch.value !== 'undefined') {
          this[depField][patch.name] = patch.value;
        }
        break;
      case Patch.REMOVE:
        delete this[depField][patch.name];
        break;
      case Patch.INHERIT:
        if (typeof patch.value !== 'undefined') {
          this.packageJson[patch.name] = patch.value;
        }
      default:
        break;
    }
  }

  /**
   * Generates an exclude array
   * @param {Array<string|object>} excludes - The excludes array to use as a base.
   */
  static generateExcludes(excludes) {
    const result = [];

    for (let exclude of excludes) {
      if (typeof exclude === 'string') {
        result.push(exclude);
        continue;
      }
      if (exclude && typeof exclude === 'object') {
        if (exclude.group === 'builtins') {
          result.push(...builtins);
        }
      }
    }

    return result;
  }
}
