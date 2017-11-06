# Comptroller

[![npm (scoped)](https://img.shields.io/npm/v/comptroller.svg)](https://www.npmjs.com/package/comptroller)
[![Greenkeeper badge](https://badges.greenkeeper.io/Aldlevine/comptroller.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/Aldlevine/comptroller.svg?branch=master)](https://travis-ci.org/Aldlevine/comptroller)
[![Coverage Status](https://coveralls.io/repos/github/Aldlevine/comptroller/badge.svg?branch=master)](https://coveralls.io/github/Aldlevine/comptroller?branch=master)
[![Docs Status](https://aldlevine.github.io/comptroller/badge.svg)](https://aldlevine.github.io/comptroller/source.html)

A simple and lightweight tool to manage your monorepo.

_Warning: This automatically updates your local package's package.json
dependencies. Use at your own risk!_

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
--prune -p                 Remove unused dependencies from subpackges' package.json
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

Comptroller's `link` command creates a symlinked `node_modules` directory in the
specified `packages` directory. This directory points to the `packages`
directory itself and enables `require` calls to local packages without the need
for relative paths or to `npm install` or `npm link` them.

### Options

__prune__

Comptroller's `prune` option takes all those extraneous dependencies found by
the `update` command and delivers them to the void.

## The nitty gritty

_TODO: describe how to use the thing in detail_
