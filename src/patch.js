/** @ignore */
const ADD = Symbol('ADD');
/** @ignore */
const REMOVE = Symbol('REMOVE');
/** @ignore */
const UPDATE = Symbol('UPDATE');
/** @ignore */
const INHERIT = Symbol('INHERIT');

/**
 * A class representing operations to apply to a package.
 */
module.exports = class Patch
{
  /**
   * Creates a new patch instance.
   * @param {Symbol} type - The type of patch this is.
   * @param {object} [config={}] - The configuration of the patch.
   * @param {string} config.name - The name of the item being patched.
   * @param {object} config.value - The value of the item being patched.
   * @param {string?} config.source - The dependency type being patched.
   * @param {boolean} [config.dev = false] - Whether or not this is a devDependency.
   * @param {boolean} [config.disabled = false] - Whether or not the patch is disabled.
   * @param {string[]} [config.files = []] - The files that necessitate the patch.
   */
  constructor (type, {
    name,
    value,
    source,
    dev = false,
    disabled = false,
    files = [],
  }={})
  {
   /**
    * The type of patch this is.
    * @type {Symbol}
    */
    this.type = type;

    /**
     * The name of the item being patched.
     * @type {string}
     */
    this.name = name;

    /**
     * The value of the item being patched.
     * @type {object}
     */
    this.value = value;

    /**
     * The dependency type being patched.
     * @type {string}
     */
    this.source = source;

    /**
     * Whether or not this is a devDependency
     * @type {boolean}
     */
    this.dev = dev;

    /**
     * Whether or not the patch is disabled
     * @type {boolean}
     */
    this.disabled = disabled;

    /**
     * The files that necessitate the patch.
     * @type {string[]}
     */
    this.files = files;
  }

  /**
  * A symbol representing the `ADD` operation.
  * @type {Symbol}
  */
  static get ADD () {return ADD}

  /**
  * A symbol representing the `REMOVE` operation.
  * @type {Symbol}
  */
  static get REMOVE () {return REMOVE}

  /**
  * A symbol representing the `UPDATE` operation.
  * @type {Symbol}
  */
  static get UPDATE () {return UPDATE}

  /**
  * A symbol representing the `INHERIT` operation.
  * @type {Symbol}
  */
  static get INHERIT () {return INHERIT}
}
