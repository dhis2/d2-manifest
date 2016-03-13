'use strict';

const fs = require('fs');
const rls = require('readline-sync');
const log = require('loglevel');
const isPlainObject = require('lodash.isplainobject');

const Manifest = require('./Manifest');

module.exports = function (manifest, manifestPath, ugly) {
    function clearScreen() {
        log.info('\x1Bc');
    }


    function getOptions() {
        const options = {};

        let fieldCount = 0;
        Manifest.getAllKnownFields().forEach(field => {
            options[++fieldCount] = field;
        });

        options.A = 'Add custom field';
        options.D = 'Delete field';
        if (manifestPath) {
            options.S = 'Save manifest to ' + manifestPath.blue;
        } else {
            options.S = 'Save manifest';
        }
        options.V = 'View current manifest';

        options.Q = 'Quit';

        return options;
    }

    function prompt() {
        let cmd = '';
        let options = getOptions();
        let fieldName = '';
        let value = '';

        while(true) {
            log.info('Available options:\n'.cyan);
            Object.keys(options).forEach(opt => {
                const o = `   ${opt}`.slice(-2).yellow;
                if(!isNaN(opt)) {
                    const star = (
                        Manifest.getRequiredFields().indexOf(options[opt]) >= 0 &&
                        manifest.getMissingFields().indexOf(options[opt]) >= 0 ?
                            '*'.yellow :
                            ''
                    );
                    log.info(`   ${o} : Set field ` + options[opt].magenta.underline + star);
                } else {
                    log.info(`   ${o} : ${options[opt]}`);
                }
            });
            if(!manifest.isValid()) {
                log.warn('Note: '.red + 'There are missing required fields (marked with '.cyan + '*'.yellow + ')'.cyan);
            }
            cmd = rls.question('\nChoose an option: '.cyan);

            if (isNaN(cmd)) {
                switch (cmd.trim().toUpperCase()) {
                case 'A':
                    log.info('\nAdd custom field'.cyan);
                    while(fieldName === '') {
                        fieldName = promptFieldName();
                        if (fieldName && manifest.hasOwnProperty(fieldName)) {
                            if (isPlainObject(manifest[fieldName])) {
                                log.info('The field "'.cyan + fieldName.magenta + '" exists and has sub-fields:\n'.cyan);
                                log.info(JSON.stringify(manifest[fieldName], null, 2).magenta);
                                fieldName = '';
                            } else {
                                log.info('The field "'.cyan + fieldName.magenta + '" already exists, and has the value: "'.cyan + manifest[fieldName].magenta + '"'.cyan);
                            }
                        }
                    }
                    value = promptFieldValue(fieldName);
                    clearScreen();
                    if(value.length) {
                        log.info('Custom field added: "'.cyan + fieldName.magenta + '" = "'.cyan + value.magenta + '"'.cyan);
                        manifest.setFieldValue(fieldName, value);
                    }
                    fieldName = '';
                    value = '';
                    break;

                case 'D':
                    log.info('\nDelete field'.cyan);
                    fieldName = promptFieldName();
                    clearScreen();
                    if (manifest.getFieldValue(fieldName)) {
                        log.info('Deleting field "'.cyan + fieldName.magenta + '" (current value "'.cyan + manifest.getFieldValue(fieldName).magenta + '")'.cyan);
                        manifest.setFieldValue(fieldName, '');
                    } else {
                        log.info('Field "'.cyan + fieldName.magenta + '" was not set'.cyan);
                    }
                    break;

                case 'S':
                    if (!manifestPath) {
                        log.info('\nSave manifest'.cyan);
                        manifestPath = rls.question('Enter filename: '.cyan);
                    }
                    clearScreen();
                    try {
                        log.info('Writing manifest to: '.cyan + manifestPath.magenta);
                        manifest.write(manifestPath, ugly);
                    } catch (e) {
                        manifestPath = '';
                    }
                    options = getOptions();
                    break;

                case 'V':
                    clearScreen();
                    log.info('Current manifest contents:'.cyan);
                    log.info(manifest.getJSON(false));
                    break;

                case 'Q':
                    log.info('Terminating'.magenta);
                    return;

                default:
                    log.info('Unknown option:'.cyan, cmd);
                    break;
                }
            } else {
                if (options.hasOwnProperty(cmd)) {
                    value = promptFieldValue(options[cmd]);
                    clearScreen();
                    if(value.length) {
                        log.info('Set '.cyan + options[cmd].magenta + ' = "'.cyan + value.magenta + '"'.cyan);
                        manifest.setFieldValue(options[cmd], value);
                    }
                } else {
                    log.info('Unknown option:'.cyan, cmd);
                }
            }
        }
    }


    function hasIllegalInput(input) {
        const regex = /^[0-9a-zA-Z\(\)\[\]\u00c0-\u017e\s=&@<>\?!:;,\.\*\-\/]+$/i;

        return !regex.test(input);
    }


    function promptFieldValue(fieldName) {
        let value = '';
        let currentValuePrompt = manifest[fieldName] ? '('.grey + manifest[fieldName].grey + ') '.grey : "";
        let verb = manifest[fieldName] ? 'Edit' : 'Enter';

        while(!value.length) {
            value = rls.question(verb.cyan + ' value for '.cyan + fieldName.magenta + ': '.cyan + currentValuePrompt).trim();

            if(!value.length) {
                return value;
            }

            if(hasIllegalInput(value)) {
                log.warn('Error:'.red + ' "'.cyan + value.magenta + '" is not valid'.cyan);
                value = '';
            }
        }

        return value;
    }


    function promptFieldName() {
        let fieldName = '';

        while(!fieldName.length) {
            fieldName = rls.question('Enter field name: '.cyan);

            if(!/^[a-z0-9\._]*$/i.test(fieldName)) {
                log.warn('Error:'.red + ' Field names can only contain letters, numbers and underscore.'.cyan);
                log.warn('       In addition, you can use dots to specify sub-fields.'.cyan);
                fieldName = '';
            }
        }

        return fieldName;
    }

    clearScreen();
    prompt();
};
