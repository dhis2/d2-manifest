#!/usr/bin/env node
"use strict";

const fs = require('fs');
const readline = require('readline');
const colors = require('colors');
const log = require('loglevel');
log.setDefaultLevel(log.levels.INFO);

const Manifest = require('./Manifest');
//const interactive = require('./interactive');

const args = require('minimist')(process.argv.slice(2), {
    alias: {
        debug: ['d'],
        help: ['h', '?'],
        ugly: ['u'],
        interactive: ['i'],

        'out': ['m'],
        'in': ['package', 'p'],

        'manifest.version': ['version', 'v'],
        'manifest.name': ['name', 'n'],
        'manifest.description': ['description', 'descr', 'desc'],
        'manifest.developer.name': ['developer', 'dev', 'author'],
        'manifest.developer.email': ['email'],
        'manifest.developer.url': ['url', 'homepage'],
        'manifest.developer.company': ['company'],
        'manifest.icons.16': ['icons.16'],
        'manifest.icons.48': ['icons.48', 'icon'],
        'manifest.icons.128': ['icons.128'],
        'manifest.launch_path': ['launch_path', 'index'],
        'manifest.installs_allowed_from': ['installs_allowed_from', 'allow', 'allowed', 'allow_from', 'allowed_from'],
        'manifest.default_locale': ['default_locale', 'locale', 'l'],
        'manifest.activities.dhis.href': ['href']
    },
    string: [
        'manifest.version', 'version', 'v',
        'manifest.name', 'name', 'n',
        'manifest.description', 'description', 'descr', 'desc',
        'manifest.developer.name', 'developer', 'dev', 'author',
        'manifest.developer.email', 'email',
        'manifest.developer.url', 'url', 'homepage',
        'manifest.developer.company', 'company',
        'manifest.icons.16', 'icons.16',
        'manifest.icons.48', 'icon', 'icons.48',
        'manifest.icons.128', 'icons.128',
        'manifest.launch_path', 'launch_path', 'index',
        'manifest.installs_allowed_from', 'installs_allowed_from', 'allow', 'allowed', 'allow_from', 'allowed_from',
        'manifest.default_locale', 'default_locale', 'locale', 'l',
        'manifest.activities.dhis.href', 'href',
    ],
    boolean: ['debug', 'help', 'interactive', 'ugly', 'timestamp'],
    default: {
        timestamp: true,
    }
});

const defaultValues = {
    launch_path: 'index.html',
    default_locale: 'en',
    activities: { dhis: { href: '*' } }
};

if(args.debug) {
    log.setLevel(log.levels.TRACE);
    log.debug('Debug mode enabled'.magenta);
}

if(args.help) {
    const arg = '.' + __filename.substr(__filename.lastIndexOf('/'));
    const helpMessage = `
    Usage: ${arg} [options] [[-p] package] [[-m] manifest]

    Options:
      -d, --debug                        Print debug messages
      -h, --help                         Print usage information and exit
      -i, --interactive                  Enable interactive mode
      -u, --ugly                         Don't pretty-print the manifest
      --no-timestamp                     Don't add 'manifest_generated_at' timestamp
      -m <path>                          Write the manifest to <path>
      -p <path>                          Read npm package info from <path>

    Specifying manifest contents:
      -v, --version <value>              Use <value> for the version field
      -n, --name <value>                 Use <value> for the name field
      -d, --desc, --description <value>  Use <value> for the description field
      --dev, --developer <value>         Use <value> for the developer.name field
                                         It's also possible to specify the developer.email
                                         and developer.url fields here, in the same way as
                                         people fields in package.json: "Name <email> (url)"
      --icon <value>                     Use <value> for the 48x48 icon field (icons.48)
      --launch_path, --index <value>     Use <value> for the launch_path field
      --allow-from, -allow <value>       Use <value> for the installs_allowed_from field
      -l, --locale <value>               Use <value> for the default_locale field

    In addition to the above, any option that starts with "--manifest.*" will be added to
    the manifest. For example, specifying "--manifest.foo bar" would add a field called
    "foo" with the value "bar".
    `;
    log.info(helpMessage.split('\n').map(line => line.substring(4)).join('\n'));
    process.exit(0);
}


const packagePath = args._.length > 0 ? args._[0] : args.in;
const manifestPath = args._.length > 1 ? args._[1] : args.out;
const manifest = new Manifest(defaultValues);
let rl;

if(packagePath) {
    log.info('Reading package data: '.cyan + packagePath);
    const packageFile = Manifest.readPackageFile(packagePath);
    log.debug(JSON.stringify(packageFile, null, 2));
    manifest.merge(packageFile, false);
} else {
    log.debug('No package path specified'.magenta);
}

if(args.timestamp) {
    const ts = new Date();
    log.debug('Generating timestamp:'.magenta, ts);
    manifest.merge({ 'manifest_generated_at': ts.toString() }, false);
} else {
    log.debug('Timestamp disabled'.magenta);
}

if(args.manifest) {
    log.debug('Merging data from arguments:'.magenta);
    log.debug(JSON.stringify(args.manifest, null, 2));
    manifest.merge(args.manifest, true);
} else {
    log.debug('No manifest data in arguments'.magenta);
}

if(!args.interactive) {
    log.debug('Interactive mode not enabled'.magenta);

    if (!manifest.isValid()) {
        log.error('Validating manifest: '.cyan + '✗'.red + ' Error');
        log.error('Error:'.red + ' The following required fields were missing: ' + manifest.getMissingFields().join(', '));
        process.exit(1);
    }
    log.info('Validating manifest: '.cyan + '✓'.green + ' Ok');

    if(manifestPath) {
        log.info('Writing manifest to:'.cyan, manifestPath);
        try {
            manifest.write(manifestPath, args.ugly);
            log.info('Done!'.cyan);
        } catch (e) {
            process.exit(1);
        }
    } else {
        log.debug('No target file specified, printing to stdout'.magenta);
        log.info('Generated manifest:'.green);
        log.info(manifest.getJSON(args.ugly));
    }

    process.exit(0);
} else {
    require('./interactive')(manifest, manifestPath, args.ugly === true);
}
