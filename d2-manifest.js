#!/usr/bin/env node
"use strict";

const fs = require('fs');
const readline = require('readline');
const colors = require('colors');
const log = require('loglevel');
log.setDefaultLevel(log.levels.INFO);

const Manifest = require('./src/Manifest');

const args = require('minimist')(process.argv.slice(2), {
    alias: {
        debug: ['!'],
        help: ['h', '?'],
        ugly: ['u'],
        interactive: ['i'],

        'out': ['m'],
        'in': ['package', 'p'],

        'manifest.version': ['version', 'v'],
        'manifest.name': ['name', 'n'],
        'manifest.description': ['d', 'description', 'descr', 'desc'],
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
        'manifest.activities.dhis.href': ['href'],
        'manifest.appType': ['type', 't'],
    },
    string: [
        'manifest.version', 'version', 'v',
        'manifest.name', 'name', 'n',
        'manifest.description', 'd', 'description', 'descr', 'desc',
        'manifest.developer.name', 'developer', 'dev', 'author',
        'manifest.developer.email', 'email',
        'manifest.developer.url', 'url', 'homepage',
        'manifest.developer.company', 'company',
        'manifest.icons.16', 'icons.16',
        'manifest.icons.48', 'icons.48', 'icon',
        'manifest.icons.128', 'icons.128',
        'manifest.launch_path', 'launch_path', 'index',
        'manifest.installs_allowed_from', 'installs_allowed_from', 'allow', 'allowed', 'allow_from', 'allowed_from',
        'manifest.default_locale', 'default_locale', 'locale', 'l',
        'manifest.activities.dhis.href', 'href',
        'manifest.appType', 'type', 't',
    ],
    boolean: ['debug', 'help', 'interactive', 'ugly', 'timestamp'],
    default: {
        timestamp: true,
    }
});

const defaultValues = {
    launch_path: 'index.html',
    default_locale: 'en',
    activities: { dhis: { href: '*' } },
    appType: 'APP'
};

if(args.debug) {
    log.setLevel(log.levels.TRACE);
    log.debug('Debug mode enabled'.green);
    log.debug('Args:'.green, args);
}

if(args.help) {
    const arg = '.' + __filename.substr(__filename.lastIndexOf('/'));
    const helpMessage = `
    Usage: ${arg} [options] [[-p] package] [[-m] manifest]

    Options:
      --debug                        Print debug messages
      -h, --help                         Print usage information and exit
      -i, --interactive                  Enable interactive mode
      -u, --ugly                         Don't pretty-print the manifest
      --no-timestamp                     Don't add 'manifest_generated_at' timestamp
      --no-type                          Don't add an appType
      -m <path>                          Write the manifest to <path>
      -p <path>                          Read npm package info from <path>

    Specifying manifest contents:
      -v, --version <value>              Use <value> for the version field
      -n, --name <value>                 Use <value> for the name field
      -d, --desc, --description <value>  Use <value> for the description field
      -t, --type <value>                 Set appType to <value>
      --dev, --developer <value>         Use <value> for the developer.name field
                                         It's also possible to specify the developer.email
                                         and developer.url fields here, in the same way as
                                         people fields in package.json: "Name <email> (url)"
      --icon <value>                     Use <value> for the 48x48 icon field (icons.48)
      --launch_path, --index <value>     Use <value> for the launch_path field
      --allow-from, -allow <value>       Use <value> for the installs_allowed_from field
      -l, --locale <value>               Use <value> for the default_locale field
      --href <value>                     Use <value> for the activities.dhis.href field

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

log.debug('Creating default manifest:'.green);
log.debug(manifest.getJSON(false));

if(packagePath) {
    log.info('Reading package data: '.cyan + packagePath);
    const packageFile = Manifest.readPackageFile(packagePath);
    log.debug(JSON.stringify(packageFile, null, 2));
    manifest.merge(packageFile, false);
} else {
    log.debug('No package path specified'.green);
}

if(args.timestamp) {
    const ts = new Date();
    log.debug('Generating timestamp:'.green, ts);
    manifest.setFieldValue('manifest_generated_at', ts.toString());
} else {
    log.debug('Timestamp disabled'.green);
}

if(args.type === false) {
    if(manifest.getFieldValue('appType').length != 0) {
        manifest.setFieldValue('appType', '');
    } 
    log.debug('App type disabled'.green);
    delete args.manifest.appType;
} else if(args.type === undefined) {
    log.debug('App type not defined'.green);
} else {
    switch(args.type.toUpperCase()) {
    case '':
    case 'APP':
        args.manifest.appType = 'APP';
        break;
    case 'RESOURCE':
        args.manifest.appType = 'RESOURCE';
        break;
    case 'DASHBOARD':
    case 'DASHBOARD_WIDGET':
    case 'WIDGET':
        args.manifest.appType = 'DASHBOARD_WIDGET';
        break;
    case 'TRACKER':
    case 'TRACKER_DASHBOARD_WIDGET':
    case 'TRACKER_WIDGET':
        args.manifest.appType = 'TRACKER_DASHBOARD_WIDGET';
        break;
    default:
        args.manifest.appType = args.type.toUpperCase();
    }
    log.debug('App type set to:'.green, args.manifest.appType);
}

if(args.manifest && Manifest.cleanObject(args.manifest)) {
    log.debug('Merging data from arguments:'.green);
    log.debug(JSON.stringify(args.manifest, null, 2));
    manifest.merge(args.manifest, true);
} else {
    log.debug('No manifest data in arguments'.green);
}

if(!args.interactive) {
    log.debug('Interactive mode not enabled'.green);

    if (!manifest.isValid()) {
        log.error('Validating manifest: '.cyan + '✗'.red + ' Error');
        if (manifest.getMissingFields().length > 0) {
            log.error(
                'Error:'.red + ' The following required fields were missing: ' +
                manifest
                    .getMissingFields()
                    .map(f => f.magenta.underline)
                    .join(', ')
            );
        }
        if (manifest.getInvalidFields().length > 0) {
            log.error(
                'Error:'.red + ' The following fields had invalid values: ' +
                manifest
                    .getInvalidFields()
                    .map(f => f.magenta.underline + '=' + manifest.getFieldValue(f))
                    .join(', ')
            );
        }
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
        log.debug('No target file specified, printing to stdout'.green);
        log.info('Generated manifest:'.green);
        log.info(manifest.getJSON(args.ugly));
    }

    process.exit(0);
} else {
    require('./src/interactive')(manifest, manifestPath, args.ugly === true);
}
