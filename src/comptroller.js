const path = require('./path');
const fs = require('./fs');
const glob = require('./glob');
const logger = require('./logger');
const Package = require('./package');
const Patch = require('./patch');

/**
 * This is the main Comptroller class. It serves as the entry point into all of
 * Comptroller's higher level functionality.
 */
module.exports = class Comptroller extends Package {
  /**
   * Creates a new Comptroller instance. It accepts all of the arguments in
   * {@link Package#constructor} as well as...
   * @param {string} [opts.config.packages = packages] - The directory name
   * where packages can be found.
   */
  constructor(config) {
    super(config);

    /** @type {string} */
    this._packages = config.packages || 'packages';

    /** @type {Package[]} */
    this._children = this.readChildren();
  }

  /**
   * The packages directory.
   * @type {string}
   */
  get packages() {
    return this._packages
  }

  /**
   * The child packages.
   * @type {Package[]}
   */
  get children() {
    return this._children
  }

  /**
   * Scans the {@link Comptroller#packages} directory, finds package.json files
   * and generates {@link Package}s. Note that all package.json files must be
   * in a direct subdirectory of the packages directory.
   * @return {Package[]} - The child packages.
   */
  readChildren() {
    const packageJsons = glob.sync(path.resolve(this.root, this.packages, '*', 'package.json'), {
      ignore: this.ignore,
      nodir: true,
    });
    return packageJsons.map((pkgjson) => new Package({
      root: path.dirname(pkgjson),
      config: this
    }));
  }

  /**
   * Loops through all packages in {@link Comptroller#children} and writes it's
   * package.json.
   */
  async writePackages() {
    for (let child of this.children) {
      try {
        await child.writePackageJson()
      } catch (err) {
        logger.error(err);
        return
      }
    }
  }

  /**
   * A convenience method that locates a package in {@link Comptroller#children}
   * by it's name in {@link Package#packageJson}.
   * @param {string} name - The name of the child package.
   * @return {Package | boolean} - The found package, or `false` if not found.
   */
  getChildByName(name) {
    for (let child of this.children) {
      if (child.packageJson.name == name) return child;
    }
    return false;
  }

  /**
   * Takes an array of raw patches (returned by
   * {@link Package#generateDependencyPatches} or
   * {@link Package#generateInheritPatches}) and updates them with the
   * information in the {@link Comptroller#packageJson}
   * @param {Patch[]} patches - The patches to update.
   * @return {Patch[]} - The updated patches.
   */
  updatePatches(patches) {
    const newPatches = [];
    for (let patch of patches) {
      switch (patch.type) {
        case Patch.ADD:
        case Patch.UPDATE:
          const child = this.getChildByName(patch.name);
          const source = child ? 'local' : 'remote';
          let value = child ?
            child.packageJson.version :
            this.dependencies[patch.name];

          if (!value && patch.dev) {
            value = this.devDependencies[patch.name];
          }

          newPatches.push(new Patch(patch.type, {
            ...patch,
            source,
            value,
          }));

          break;

        case Patch.REMOVE:
          newPatches.push(new Patch(patch.type, {
            ...patch,
            disabled: !this.prune,
          }));
          break;

        case Patch.INHERIT:
          const val = this.packageJson[patch.name];
          const disabled = typeof val == 'undefined' && !this.pruneInherited;
          newPatches.push(new Patch(patch.type, {
            ...patch,
            value: val,
            disabled,
          }));
          break;

        default:
          break;
      }
    }
    return newPatches;
  }

  /**
   * Logs patch operations.
   * @param {Package} child - The child the patch is being applied to.
   * @param {Patch} patch - The patch being applied.
   */
  logPatch(child, patch) {
    const childName = child.packageJson.name;
    const disabled = patch.disabled ? 'DISABLED: ' : '';
    const dev = patch.dev ? ' dev ' : ' ';

    if ((patch.type == Patch.ADD || patch.type == Patch.UPDATE) && !patch.value) {
      if (patch.name in child.devDependencies) {
        const msg = `WARNING: '${patch.name}' required by ${childName} in non-dev source (${patch.files}) was found in package.json devDependencies.`
        logger.warn(msg);
      } else {
        const msg = `WARNING: '${patch.name}' required by ${childName} (${patch.files}) not found in package.json or local packages.`
        logger.warn(msg);
      }
      return;
    }

    switch (patch.type) {
      case Patch.ADD:
        logger.log(`${disabled}Adding ${patch.source}${dev}package '${patch.name}@${patch.value}' to package '${childName}'`);
        break;

      case Patch.UPDATE:
        const depField = patch.dev ? 'devDependencies' : 'dependencies';
        const oldVersion = child[depField][patch.name];
        if (oldVersion !== patch.value) {
          logger.log(`${disabled}Updating ${patch.source}${dev}package '${patch.name}' from ${oldVersion} to ${patch.value} in package '${childName}'`);
        }
        break;

      case Patch.REMOVE:
        logger.log(`${disabled}Removing${dev}package '${patch.name}' from '${childName}'`);
        break;

      case Patch.INHERIT:
        const oldValue = JSON.stringify(child.packageJson[patch.name]);
        const newValue = JSON.stringify(patch.value);
        if (oldValue !== newValue) {
          if (oldValue) {
            if (typeof newValue === 'undefined') {
              logger.log(`${disabled}Removing field ${patch.name} from package '${childName}'`);
            }
            else {
              logger.log(`${disabled}Updating field ${patch.name} from ${oldValue} to ${newValue} in package '${childName}'`);
            }
          } else {
            logger.log(`${disabled}Adding field ${patch.name} as ${newValue} to package '${childName}'`);
          }
        }
    }
  }

  /**
   * Analyzes the dependencies and inherits of each package and applies the
   * respective patches to each package.
   */
  async updatePackages() {
    for (let child of this.children) {
      let deps = await child.analyzeSourceDependencies();
      let patches = [
        ...child.generateDependencyPatches(deps),
        ...child.generateInheritPatches(),
      ];
      patches = this.updatePatches(patches);
      for (let patch of patches) {
        this.logPatch(child, patch);
        child.applyPatch(patch);
      }
    }
  }

  /**
   * Analyzes the dependencies of the root package and applies the respective
   * patches.
   */
  async updateSelf() {
    const deps = await this.analyzeSourceDependencies();
    let patches = this.generateDependencyPatches(deps)
    for (let child of this.children) {
      const childDeps = await child.analyzeSourceDependencies();
      const childPatches = child.generateDependencyPatches(childDeps);
      patches.push(...childPatches);
    }

    patches = this.updatePatches(patches);

    // shake out patches
    const shaken = {};
    for (let patch of patches) {
      if (patch.source == 'local') continue;

      const name = patch.name;

      if (!shaken[name]) {
        shaken[name] = patch;
        continue;
      }

      shaken[name] = Comptroller.mergePatches(shaken[name], patch);
    }

    for (let name in shaken) {
      const patch = shaken[name];
      this.logPatch(this, patch);
      this.applyPatch(patch);
    }
  }

  /**
   * Merges patches generated by child packages in order to apply to the parent
   * package. This resolves conflicts that occur when applying patches
   * generated by multiple sources.
   * @param {Patch} a - A patch
   * @param {Patch} b - Another patch
   * @return {Patch} - The merged patch
   */
  static mergePatches(a, b) {
    const priority = [Patch.UPDATE, Patch.ADD, Patch.REMOVE];
    const name = a.name;
    const value = a.value || b.value;
    const source = a.source || b.source;
    const dev = a.dev && b.dev;
    const files = [...a.files, ...b.files];
    const type = priority[
      Math.min(priority.indexOf(a.type), priority.indexOf(b.type))
    ];
    const disabled = (a.disabled || b.disabled) && type == Patch.REMOVE;
    return new Patch(type, {
      name,
      value,
      source,
      dev,
      disabled,
      files,
    });
  }

  /**
   * Links the packages to node_modules in a way that enables them to be
   * resolved by other packages by name.
   */
  async linkPackages() {
    const node_modules = path.resolve(this.root, 'node_modules');
    await fs.ensureDirPlease(node_modules);

    for (let child of this.children) {
      const name = child.packageJson.name;
      await fs.ensureSymlinkPlease(child.root, path.resolve(node_modules, name));
    }

  }
}
