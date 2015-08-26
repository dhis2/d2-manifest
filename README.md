# d2-manifest
Simple node package to manage `manifest.webapp` files for DHIS2 apps

```sh
npm install -g d2-manifest
```

Basic usage to create a new manifest or edit properties on a manifest
```sh
d2-manifest
```
It will look for a manifest.webapp file in the current directory and if not found in the `./src` directory.

A simple convenient option can be given to change just the version number in the manifest.
```sh
# Version types<major|minor|patch> 
d2-manifest --bump major
d2-manifest --bump minor
d2-manifest --bump patch
```
