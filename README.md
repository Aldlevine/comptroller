# Comptroller

A simple and lightweight tool to manage your monorepo.

_Warning: This is a very basic and rough build so far. Also, it automatically
updates your local package's package.json dependencies. Use at your own risk!_

## Install

```
npm i comptroller
```

## Usage

__Update dependencies in__ `packages/**/package.json` __with discovered dependencies in main__ `package.json`

```
comp update [--root|-r <root dir>] [--packges|-p <packages dir>]
```

__Link__ `packages/*` __to__ `packages/node_modules/*`

```
comp link [--root|-r <root dir>] [--packges|-p <packages dir>]
```

__Prune extraneous packages from__ `packages/**/package.json`

```
comp prune [--root|-r <root dir>] [--packges|-p <packages dir>]
```

## How it works

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

__create__: _Not implemented_

Comptroller's `create` command creates a new package in the specified directory
with a stub `package.json` just waiting to be "comp updated".

__prune__

Comptroller's `prune` command takes all those extraneous dependencies found by
the `update` command and delivers them to the void.

## The nitty gritty

_TODO: describe how to use the thing in detail_
