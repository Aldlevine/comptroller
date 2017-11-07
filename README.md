# <img alt="Comptroller" src="http://aldlevine.github.io/comptroller/image/logo.png" style="box-shadow:none;"/>

[![npm (scoped)](https://img.shields.io/npm/v/comptroller.svg)](https://www.npmjs.com/package/comptroller)
[![Greenkeeper badge](https://badges.greenkeeper.io/Aldlevine/comptroller.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/Aldlevine/comptroller.svg?branch=master)](https://travis-ci.org/Aldlevine/comptroller)
[![Coverage Status](https://coveralls.io/repos/github/Aldlevine/comptroller/badge.svg?branch=master)](https://coveralls.io/github/Aldlevine/comptroller?branch=master)
[![Docs Status](https://aldlevine.github.io/comptroller/badge.svg)](https://aldlevine.github.io/comptroller/source.html)

A simple and lightweight tool to manage your monorepo.

_Warning: This automatically updates your local package's package.json_

## Install

```
npm i comptroller
```

## Usage

```
comp <command> [options]

Commands:
--------
help                      Show this message
update [root-directory]   Update all subpackages of package found at [root-directory]
link [root-directory]     Create symlink in node_modules for each subpackage found at [root-directory]
version                   Print Comptroller version

Options:
--------
--prune -p                Remove unused dependencies from subpackges' package.json
```

## How it works

### Commands

__update__

Comptroller's `update` command analyzes the packages in a given directory and
identifies static `require` calls. Using this, it is able to update each
package's `package.json` to include these as dependencies (Comptroller ignores
Node.js builtin modules by default). Comptroller finds these modules in the
project root's `package.json` (or a specified file) and adds the defined version
to the subpackage's `package.json`. If a module is required but doesn't exist in
the root `package.json` a warning is issued. If a module in the root
`package.json` has a different version than one used in the subpackage
`package.json` then it's version is updated in the subpackage. If a dependency
is listed in the subpackage `package.json` but not found in the package source,
a warning is issued. If a `require` call is found that references a local
package, Comptroller locates the specified package's `package.json` and updates
the issuing package's `package.json` dependencies with the version information
of the specified package.

__link__

Comptroller's `link` command creates symlinks in the root `node_modules`
directory to each child package. These symlinks are stuctured to match the names
provided in each package's package.json replicating the same structure that an
npm install would create. This enables `require` calls to local packages without
the need for to specify relative paths or to `npm install` or `npm link` them.

### Options

__prune__

Comptroller's `prune` option takes all those extraneous dependencies found by
the `update` command and delivers them to the void.

## The nitty gritty

Comptroller's power is it's simplicity and flexibility.

### Configuration

Comptroller has a cascading configuration scheme. This means that your root
package's configuration will cascade through to its child packages, as long as
they don't override the configuration themselves. If all of your packages share
the same configuration, you only need to declare your configuration in the root
package, but if any of your subpackages deviate from the norm just specify its
own custom configuration within it's package.json and it'll be right as rain!
The subpackage's configration will seamlessly override the root configuration.

Currently the only place to specify your config is in a package.json, but this
is likely to expand to accomodate a variety of workflows.

```json
{
  "name": "my-fancy-package",
  "version": "0.4.2",
  "author": "Some Body",
  "homepage": "https://somewhere.org",
  "comptroller": {
    "source": "**/*.js",
    "ignore": "**/node_modules/**",
    "exclude": [
      "not-the-droid-youre-looking-for"
    ],
    "inherits": [
      "version",
      "author",
      "homepage"
    ],
    "detective": {
      "parse": {
        "plugins": ["objectRestSpread"]
      }
    }
  },
  "dependencies": {
    "need-this": "1.0.0",
    "and-this": "1.2.0"
  }
}
```

#### Inheritance

Inheritance is the tool that saves you from the mundane maintainence of a
multitude of package.json files throughout the life of your project. This is
like the swiss army knife version of [Lerna's 'fixed/locked'
mode](https://github.com/lerna/lerna#fixedlocked-mode-default). While it's
perfect for keeping your package versions in sync, it can be used for any field
in your package.json (including dependencies, but we'd recommend against that.
Comptroller has bigger plans for your dependencies). It also has the added
benefit of being able to opt in/out of any field inheritance globally or locally
per each subpackage.

Do you wan't to keep all package versions in sync? Simply inherit the `version`
field. Do all of your packages share the same homepage? Do the same with the
`homepage` field. Did one of your packages mature and deserves its own homepage?
Simply stop inheriting the `homepage` key for that package and provide it with
its with its own. The possibilities are endless!

#### Dependency management

Comptroller's dependency management allows you to manage your dependencies at
the top level only. Comptroller will intelligently analyze the invoked
dependencies in your packages' source files and add (and remove, with the `prune`
option) them from each package.json as needed. This will ensure that all of your
packages' dependencies stay in sync and helps you avoid heavy downloads by
pruning out any unused dependencies hiding in the corner. With Comptroller,
keeping all of your packages' dependencies perfectly managed is only 14
keystrokes away! `comp update -p`.

But we know the world isn't perfect (if it was there'd be no use for a tool like
this), which is why Comptroller allows you to opt out of dependency management
for specific named dependencies. If one of your packages relies on a different
version of a specific dependency, exlude that dependency in the package's
configuration and Comptroller will look the other way when it sees it.

### Updating your packages

Let's say the package.json above belongs to the root package. Now if you have a
child package with the below package.json:

```json
{
  "name": "@my-fancy-package/my-fancy-module",
  "version": "0.4.1",
  "dependencies": {
    "need-this": "0.1.0",
    "dont-need-this": "1.2.3"
  }
}
```

And the below index.js:

```javascript
require('need-this');
require('and-this');
```

A call to `comp update` will log this in your terminal:

```
Updating remote package 'need-this' from 0.1.0 to 1.0.0 in package '@my-fancy-package/my-fancy-module'
Adding remote package 'and-this@^1.2.0' to package '@my-fancy-package/my-fancy-module'
DISABLED: Removing package 'dont-need-this' from '@my-fancy-package/my-fancy-module'
Updating field version from "0.4.1" to "0.4.2" in package '@my-fancy-package/my-fancy-module'
Adding field homepage as "https://somewhere.org" to package '@my-fancy-package/my-fancy-module'
Adding field author as "Some Body" to package '@my-fancy-package/my-fancy-module'
```

And update the package.json like so:

```json
{
  "name": "@my-fancy-package/my-fancy-module",
  "version": "0.4.2",
  "author": "Some Body",
  "homepage": "https://somewhere.org",
  "dependencies": {
    "need-this": "1.0.0",
    "and-this": "1.2.0",
    "dont-need-this": "1.2.3"
  }
}
```

Oops! We have a dependency in our package.json that appears to be unused!
Comptroller won't just go deleting your dependencies williy nilly, it must be
given the right to do so by issuing the command with the `--prune` or `-p`
option.

`comp update -p`

```
Removing package 'dont-need-this' from '@my-fancy-package/my-fancy-module'
```

```json
{
  ...
  "dependencies": {
    "need-this": "1.0.0",
    "and-this": "1.2.0",
  }
}
```

Whew! That's better :wink:. Now we're free to just develop our project and not
worry about managing our dependencies and metadata.

_Note that this works just as well with sibling package dependencies, it just
seemed unweildy to add an example for this here._

### Link's Awakening

The link command is like a super simplified version of [Lerna's bootstrap
command](https://github.com/lerna/lerna#bootstrap) (step #2). It doesn't take a
very aggressive approach, but it gets the job done well. It's kind of like if
`npm link` worked on all subpackages at once and only impacted the project scope
rather than the global scope.

Let's pretend you have a project with three subpackages named
`@my-fancy-package/my-fancy-module`, `@my-fancy-package/my-other-fancy-module`,
and `my-not-so-fancy-module`. A call to `comp link` will ensure that the top
level `node_modules` includes:

```
node_modules
├── @my-fancy-package
│   ├── my-fancy-module
│   └── my-other-fancy-module
└── my-not-so-fancy-module
```

Now you can have no fear that your interdependent packages will function exactly
as they will in the wild (and you'll have only burned ~0.017 calories in the
process)!
