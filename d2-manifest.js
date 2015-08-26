#!/usr/bin/env node

var colors = require('colors/safe');
var readline = require('readline');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));

var manifestFolderName = '.';

var requiredFields = [
    { name: 'name' },
    { name: 'description' },
    { name: 'icons.48' },
    { name: 'developer.name' },
    { name: 'launch_path', default: 'index.html' },
    { name: 'default_locale', default: 'en' } 
];

var manifestTemplate = {
    'version':'0.0.1',
    'name': '',
    'description': '',
    'icons':{
        '16': undefined,
        '48': 'img/icons/icon.png',
        '128': undefined
    },
    'developer':{
        'url':'',
        'name':'James Chang',
        'company': undefined,
        'email': undefined
    },
    'launch_path': 'index.html',
    'installs_allowed_from': undefined,
    'default_locale': 'en',
    'activities': {
      'dhis': { 
        'href': '*'
      }
    }
};

var manifest = {
    'version':'0.0.1',
    'name': '',
    'description': '',
    'icons':{
        '16': undefined,
        '48': 'img/icons/icon.png',
        '128': undefined
    },
    'developer':{
        'url':'',
        'name':'James Chang',
        'company': undefined,
        'email': undefined
    },
    'launch_path': 'index.html',
    'installs_allowed_from': undefined,
    'default_locale': 'en',
    'activities': {
      'dhis': { 
        'href': '*'
      }
    }
};

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function printMessage(message, surroundWithNewLines) {
    if (surroundWithNewLines) console.log();
    console.log(colors.cyan(message || ''));
    if (surroundWithNewLines) console.log();
}

function printError(message) {
    console.log();
    console.log(colors.red(message));
    console.log();
}

function isRequiredField(field) {
    return (requiredFields.indexOf(field) >= 0 ? true : false);
}

function getAdditionalFields(source, itemContext) {
    var fields = [];
    var item;

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
            var prefix = '';
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
    var depth = field.name.split('.');
    var context = manifest;

    while(depth.length > 0) {
        var item = depth.shift();
        if (typeof context[item] !== 'object') {
            return context;
        }
        context = manifest[item];
    }
    return context; //Not sure if needed..
}

function replaceField(field, answer) {
    var context = getContext(field);

    if (answer === '') {
        answer = field.default || undefined; //Undefined removes the value
    }
    field = field.name.split('.').reverse()[0];

    context[field] = answer;
}


var hasIllegalInput = (function () {
    var regex = /^[\.0-9a-zA-Z\u00c0-\u017e\s\=\&\?\:\;\/]+$/i;

    return function (input) {
        if (!regex.test(input)) {
            return true;
        }
        return false;
    }
})();

function askForValueFor(field) {
    rl.question('New value for ' + field.name + ': ', function (answer) {

        if ((isRequiredField(field.name) && hasIllegalInput(answer))) {
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
    var additionalFields = getAdditionalFields(manifestTemplate);
    console.log('');
    printMessage('Your current manifest looks like: ');
    console.log(colors.gray(JSON.stringify(manifest, undefined, 2)));
    console.log('');
    printMessage('If you want to change any of the following fields enter the number: ');

    additionalFields.forEach(function (field, index) {
        console.log(colors.red((index >= 10 ? index : ' ' + index)) + ': ' + field);
    });
    console.log('');

    printMessage('s: To save as "manifest.webapp" (Program will quit after save)');
    printMessage('q: To quit');
    rl.question('Enter a number to edit or one of the commands above: ', function (answer) {
        var fieldName;

        if (answer == 'q') {
            rl.close();
            return;
        }

        if (answer == 's') {
            //Save
            saveManifest();
        } else {
            if (fieldName = additionalFields[parseInt(answer, 10)]) {
                askForValueFor({ name: fieldName });
            } else {
                printError('Please enter a number between 0-' + (additionalFields.length - 1) + ' or \'s\' to save.');
                askForAdditionalFields(); 
            }
        }
    });
}

function askQuestions() {    
    var field;
    
    if (requiredFields.length <= 0) {
        printMessage('Thanks!', true);
        
        askForAdditionalFields();
        return;
    }

    field = requiredFields.shift();

    rl.question(field.name + ( field.default ? '(' + field.default + ')' : '') + ': ', function(answer) {
        if (!isRequiredField(field) || (!hasIllegalInput(answer)) || (answer === '' && field.default)) {
            replaceField(field, answer || field.default);
        } else {
            printError('Empty or incorrect input for this field is not allowed');
            requiredFields.unshift(field);
        }
        askQuestions();
    });
}

function createNew() {
    printMessage('Please answer the following. What would you like to use as:');
    printMessage('- When a default is shown between () an empty value will use the default.')
    askQuestions();
}

function saveManifest() {
    fs.writeFile([manifestFolderName, 'manifest.webapp'].join('/'), JSON.stringify(manifest), function (err) {
        if (err) {
            printError(err);
        } else {
            printMessage('Manifest saved!');
        }
        rl.close();
    });
}

function getVersion() {
    var versionParts = manifest.version.split('.');
    var version = {
        major: parseInt(versionParts[0], 10),
        minor: parseInt(versionParts[1], 10),
        patch: parseInt(versionParts[2], 10),
    }
    return version;
}

function bumpVersion(versionType) {
    var version = getVersion();
    var versionArray = [];

    if (versionType === 'patch') {
        if (version.patch >= 0) version.patch += 1;
    }

    if (versionType === 'minor') {
        if (version.minor >= 0) version.minor += 1;
        if (version.patch >= 0) version.patch = 0;
    }

    if (versionType === 'major') {
        version.major += 1;
        if (version.minor >= 0) version.minor = 0;
        if (version.patch >= 0) version.patch = 0;
    }

    if (version.major >= 0) versionArray.push(version.major);
    if (version.minor >= 0) versionArray.push(version.minor);
    if (version.patch >= 0) versionArray.push(version.patch);


    printMessage('Bumped version to: ' + versionArray.join('.'), true);
    replaceField({ name: 'version' }, versionArray.join('.'));
    saveManifest();
}

function checkAction() {
    if (argv.bump || argv.b) {
        bumpVersion(argv.bump || argv.b);
    } else {
        askForAdditionalFields();
    }
}

printMessage();
printMessage('Attempting to find existing manifest file.');

fs.readFile('./manifest.webapp', 'utf8', function (err, data) {
  if (err) {
    console.log('-- Manifest file not found in the root of the project, checking /src folder.');
    fs.readFile('./src/manifest.webapp', 'utf8', function (err, data) {
        if (err) {
            console.log('- Manifest file not found or corrupted, creating a new one.');
            console.log('');
            createNew();
            return;
        }

        console.log('-- Found manifest file in /src folder');
        manifestFolderName = './src';
        console.log('');
        manifest = JSON.parse(data);
        checkAction();
        rl.close();
    });
    return;
  }

  console.log('- Existing manifest found, using existing manifest.');
  console.log('');
  manifest = JSON.parse(data);
  checkAction();
});
