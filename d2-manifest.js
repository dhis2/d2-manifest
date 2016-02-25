#!/usr/bin/env node
"use strict";

const fs = require('fs');
const readline = require('readline');
const colors = require('colors');
const log = require('loglevel');
log.setDefaultLevel(log.levels.INFO);

const Manifest = require('./Manifest');

const arg = '.' + __filename.substr(__filename.lastIndexOf('/'));
const args = require('minimist')(process.argv.slice(2), {
    alias: {
        debug: ['d'],
        help: ['h', '?'],
        ugly: ['u'],

        'out': ['m'],
        'in': ['package', 'p'],

        'manifest.version': ['version', 'v'],
        'manifest.name': ['name', 'n'],
        'manifest.description': ['description', 'descr', 'desc'],
        'manifest.developer.name': ['developer', 'dev', 'author', 'a'],
        'manifest.developer.email': ['email', 'e'],
        'manifest.developer.url': ['url', 'homepage', 'web'],
        'manifest.developer.company': ['company'],
        'manifest.icons.48': ['icons.48', 'icon'],
        'manifest.launch_path': ['launch_path', 'launch', 'index'],
        'manifest.installs_allowed_from': ['installs_allowed_from', 'allow', 'allowed', 'allow_from', 'allowed_from'],
        'manifest.default_locale': ['default_locale', 'locale', 'l'],
        'manifest.activities.dhis.href': ['href']
    },
    boolean: ['debug', 'help', 'interactive'],
});

const defaultValues = {
    version: '0.0.1',
    icons: {
        48: 'icon.png',
    },
    launch_path: 'index.html',
    default_locale: 'en',
    activities: { dhis: { href: '*' } }
};

if(args.debug) {
    log.setLevel(log.levels.TRACE);
}

const packagePath = args._.length > 0 ? args._[0] : args.in;
const manifestPath = args._.length > 1 ? args._[1] : args.out;

if(!packagePath || !manifestPath) {
    args.help = true;
}

if(args.help) {
    const helpMessage = `
    Usage: ${arg} [options] [-p] <package> [-m] <manifest>

    Options:
      -d, --debug                        Print debug messages
      -h, --help                         Print usage information and exit
      -u, --ugly                         Don't pretty-print the manifest
      -m <path>                          Write the manifest to <path>
      -p <path>                          Read npm package info from <path>

    Specifying manifest contents:
      -v, --version <value>              Use <value> for the version field
      -n, --name <value>                 Use <value> for the name field
      -d, --desc, --description <value>  Use <value> for the description field
      --dev, --developer <value>         Use <value> for the developer field
                                         This will be parsed the same way as people fields in
                                         package.json: "Name <email> (url)"
      --icon <value>                     Use <value> as the path for the 48x48 icon field
      --launch_path, --launch <value>    Use <value> for the launch_path field
      --allow-from, -allow <value>       Use <value> for the installs_allowed_from field
      -l, --locale <value>               Use <value> for the default_locale field

    In addition, any option that starts with "manifest." will be added to the manifest
    For example, specifying "--manifest.foo bar" would add a field called "foo" with the value "bar"
    `;
    log.info(helpMessage.split('\n').map(line => line.substring(4)).join('\n'));
    process.exit(1);
}

let manifest = new Manifest(defaultValues);
manifest
    .merge(Manifest.readPackageFile(packagePath))
    .merge(args.manifest)
    .clean();

if (!manifest.isValid()) {
    log.error('Manifest validation: '.cyan + '✗'.red + ' fail');
    log.error('Missing fields:'.red, manifest.getMissingFields().join(', '));
    process.exit(1);
}
log.info('Manifest validation: '.cyan + '✓'.green + ' ok');

manifest.write(manifestPath, args.ugly);
process.exit(0);

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function getAdditionalFields(source, itemContext) {
    let fields = [];
    let item;

    if (!source) {
        return [];
    }

    for (item in source) {
        if (source.hasOwnProperty(item) && typeof source[item] !== 'object') {
            if (itemContext) {
                fields.push(itemContext + '.' + item);
            } else {
                fields.push(item);
            }
        } else {
            let prefix = '';
            if (itemContext) {
                prefix = itemContext + '.';
            }
            getAdditionalFields(source[item], item).forEach(function (value) {
                fields.push(prefix + value);
            });
        }
    }
    return fields;
}

function getContext(field) {
    let depth = field.name.split('.');
    let context = manifest;

    while (depth.length > 0) {
        let item = depth.shift();
        if (typeof context[item] !== 'object') {
            return context;
        }
        context = manifest[item];
    }
    return context;
}

function replaceField(field, answer) {
    let context = getContext(field);

    if (answer === '') {
        answer = field.default || undefined; // Undefined removes the value
    }
    field = field.name.split('.').reverse()[0];

    context[field] = answer;
}


function hasIllegalInput(input) {
    const regex = /^[\.0-9a-zA-Z\u00c0-\u017e\s\=\&\?\:\;\/]+$/i;

    return !regex.test(input);
}

function askForValueFor(field) {
    rl.question('New value for ' + field.name + ': ', function (answer) {

        if ((Manifest.isRequiredField(field.name) && hasIllegalInput(answer))) {
            console.error('Empty or incorrect input for this field is not allowed');
        } else {
            if (answer === '') {
                replaceField(field, undefined);
            } else {
                replaceField(field, answer);
            }

        }

        askForAdditionalFields();
    });
}

function askForAdditionalFields() {
    let additionalFields = getAdditionalFields(manifestTemplate);
    log.info('\nYour current manifest looks like: '.green);
    log.info(JSON.stringify(manifest, undefined, 2).gray);
    log.info('If you want to change any of the following fields enter the number:'.green);

    additionalFields.forEach(function (field, index) {
        log.info(colors.red((index >= 10 ? index : ' ' + index)) + ': ' + field);
    });
    log.info('');

    log.info('s: To save as "manifest.webapp" (Program will quit after save)'.cyan);
    log.info('q: To quit'.cyan);
    rl.question('Enter a number to edit or one of the commands above: ', function (answer) {
        let fieldName;

        if (answer == 'q') {
            rl.close();
            return;
        }

        if (answer == 's') {
            //Save
            saveManifest();
        } else {
            if (fieldName = additionalFields[parseInt(answer, 10)]) {
                askForValueFor({name: fieldName});
            } else {
                log.error('Please enter a number between 0-' + (additionalFields.length - 1) + ' or \'s\' to save.'.red);
                askForAdditionalFields();
            }
        }
    });
}

function askQuestions() {
    let field;

    if (requiredFields.length <= 0) {
        log.info('Thanks!'.green, true);

        askForAdditionalFields();
        return;
    }

    field = requiredFields.shift();

    rl.question(field.name + ( field.default ? '(' + field.default + ')' : '') + ': ', function (answer) {
        if (!Manifest.isRequiredField(field) || (!hasIllegalInput(answer)) || (answer === '' && field.default)) {
            replaceField(field, answer || field.default);
        } else {
            log.error('Empty or incorrect input for this field is not allowed'.red);
            requiredFields.unshift(field);
        }
        askQuestions();
    });
}
/* TODO: Remove dead code
function createNew() {
    log.info('Please answer the following. What would you like to use as:'.cyan);
    log.info('- When a default is shown between () an empty value will use the default.'.cyan);
    askQuestions();
}
*/
function saveManifest() {
    fs.writeFile(args.manifest, JSON.stringify(manifest), function (err) {
        if (err) {
            log.error('Error:'.red, err);
        } else {
            log.info('Manifest saved!'.green);
        }
        rl.close();
    });
}
