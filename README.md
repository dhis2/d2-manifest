
D2 Manifest
===========

D2 Manifest is a node app that helps generate manifests for DHIS2 apps.

Two modes of operation are supported: Automatic and interactive (manual).

Automatic mode is intended to be used during the build step of webapps. In this mode,
field values are read from `package.json` as well as (optionally) from the command line.
The manifest is then verified, before it's written to the target manifest file,
typically `manifest.webapp`.

In interactive mode, initial field values may also be read from both `package.json` and
the command line. Then the user will be given the opportunity to add, change and delete
fields in the manifest before saving it to a file.



Basic usage
-----------

Basic usage is documented in d2-manifest itself. Using the following command d2-manifest
can be made available globally:

`npm install -g d2-manifest`

You can then get usage information with the following command:

`d2-manifest --help`

In its simplest form, d2-manifest will read a source file and command line arguments, and
write a manifest to a target file. If no source file is specified, some fields will be
given default values. If no target file is specified, the manifest will be written to
stdout.

Interactive mode can be enabled by specifying `--interactive` (or `-i` for short) on the
command line. For example:

`d2-manifest -i package.json`



Using D2 Manifest in your app
-----------------------------

The typical usage scenario for d2-manifest is to use it to automatically generate the
manifest for your webapp during the build step. This guide assumes that you are using
npm both for dependency management and to build your app.

Install d2-manifest as a development dependency (or optionally as a normal dependency):

`npm install --save-dev d2-manifest`

By default `package.json` does not contain all the fields that are needed to generate
the manifest. Additionally, you may want to specify different values for some fields in
the manifest than what's used by `package.json`. Both of these issues can be resolved by
adding a new field to `package.json` called `manifest.webapp`. Any fields specified on
this object will override any values read from the base object in `package.json`.

For example:

```json
{
  "version": "1.2.3",
  "name": "my-npm-compatible-package-name",
  "description": "An example app",
  "scripts": {
    "build": "build-my-app && d2-manifest package.json build/manifest.webapp"
  },
  // ... various other fields
  "manifest.webapp": {
    "name": "My Example App for DHIS2",
    "icons": {
      "48": "icon.png"
    },
    "developer": {
      "name": "My Name",
      "email": "e@ma.il"
    },
    "activities": {
      "dhis": {
        "href": ".."
      }
    },
    "launch_url": "app.html",
    "default_locale": "en"
  }
}
```

To generate a new `manifest.webapp` from `package.json`, do:

`./node_modules/.bin/d2-manifest package.json build/manifest.webapp`

You can also specify additional fields on the command line. Fields specified on the
command line always override values read from any other source. Additionally, giving a
field an empty value (`""`) on the command line will effectively remove that field from
the manifest:

```
./node_modules/.bin/d2-manifest package.json build/manifest.webapp \
      --manifest.name="Super Cool App Name"
```

Given the `package.json` above, and assuming that `build-my-app` is the command you use
to build your app, you could build your app and generate the manifest with the following
command:

`npm run-script build`
