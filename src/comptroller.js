const path = require('path');
const fs = require('./fs');
const glob = require('./glob');
const Package = require('./package');
const Patch = require('./patch');

/**
 * This is the main Comptroller class. It serves as the entry point into all of
 * Comptroller's higher level functionality.
 */
module.exports = class Comptroller extends Package
{
  /**
   * Creates a new Comptroller instance. It accepts all of the arguments in
   * {@link Package#constructor} as well as...
   * @param {string} [opts.config.packages = packages] - The directory name
   * where packages can be found.
   */
  constructor (config)
  {
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
  get packages () {return this._packages}

  /**
   * The child packages.
   * @type {Package[]}
   */
  get children () {return this._children}

  /**
   * Scans the {@link Comptroller#packages} directory, finds package.json files
   * and generates {@link Package}s. Note that all package.json files must be
   * in a direct subdirectory of the packages directory.
   * @return {Package[]} - The child packages.
   */
  readChildren ()
  {
    const packageJsons = glob.sync(path.resolve(this.root, this.packages, '*', 'package.json'), {
      ignore: this.ignore,
      nodir: true,
    });
    return packageJsons.map((pkgjson) => new Package({root: path.dirname(pkgjson), config: this}));
  }

  /**
   * Loops through all packages in {@link Comptroller#children} and writes it's
   * package.json.
   */
  async writePackages ()
  {
    for (let child of this.children) {
      try {await child.writePackageJson()}
      catch (err) {console.error(err); return}
    }
  }

  /**
   * A convenience method that locates a package in {@link Comptroller#children}
   * by it's name in {@link Package#packageJson}.
   * @return {Package | boolean} - The found package, or `false` if not found.
   */
  getChildByName (name)
  {
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
  updatePatches (patches)
  {
    const newPatches = [];
    for (let patch of patches) {
      switch (patch.type) {
        case Patch.ADD:
        case Patch.UPDATE:
          const child = this.getChildByName(patch.name);
          const source = child ? 'local' : 'remote';
          const value = child ?
            child.packageJson.version :
            this.packageJson.dependencies[patch.name];

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
          newPatches.push(new Patch(patch.type, {
            ...patch,
            value: this.packageJson[patch.name],
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
  logPatch (child, patch)
  {
    const childName = child.packageJson.name;
    const disabled = patch.disabled ? 'DISABLED: ' : '';

    if ((patch.type == Patch.ADD || patch.type == Patch.UPDATE) && !patch.value) {
      console.warn(`WARNING: '${patch.name}' required by ${childName} (${patch.files}) not found in package.json or local packages.`);
      return;
    }

    switch (patch.type) {
      case Patch.ADD:
        console.log(`${disabled}Adding package ${patch.source} package '${patch.name}@${patch.value}' to package '${childName}'`);
        break;

      case Patch.UPDATE:
        const oldVersion = child.packageJson.dependencies[patch.name];
        if (oldVersion !== patch.value) {
          console.log(`${disabled}Updating ${patch.source} package '${patch.name}' from ${oldVersion} to ${patch.value} in package '${childName}'`);
        }
        break;

      case Patch.REMOVE:
        console.log(`${disabled}Removing package '${patch.name}' from '${childName}'`);
        break;

      case Patch.INHERIT:
        const oldValue = child.packageJson[patch.name];
        if (oldValue !== patch.value) {
          if (oldValue) {
            console.log(`${disabled}Updating field ${patch.name} from '${oldValue}' to '${patch.value}' in package '${childName}'`);
          }
          else {
            console.log(`${disabled}Adding field ${patch.name} as '${patch.value}' to package '${childName}'`);
          }
        }
    }
  }

  /**
   * Analyzes the dependencies and inherits of each package and applies the
   * respective patches to each package.
   */
  async updatePackages ()
  {
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
   * Links the packages to node_modules in a way that enables them to be
   * resolved by other packages by name.
   */
  async linkPackages ()
  {
    const node_modules = path.resolve(this.root, 'node_modules');
    await fs.ensureDirPlease(node_modules);

    for (let child of this.children) {
      const name = child.packageJson.name;
      await fs.ensureSymlinkPlease(child.root, path.resolve(node_modules, name));
    }

  }
}
