'use strict';

require('colors');
const fs = require('fs');
const log = require('loglevel');
const getAuthorRegex = require('author-regex');
const isPlainObject = require('lodash.isplainobject');


class Manifest {
    constructor(data) {
        Object.assign(this, data);

        this.write = this.write.bind(this);
        this.merge = this.merge.bind(this);

        this.isValid = this.isValid.bind(this);
        this.getMissingFields = this.getMissingFields.bind(this);
        this.getJSON = this.getJSON.bind(this);
    }


    /**
     * Returns a copy of the provided data where any properties that don't have values are removed
     *
     * @param {Object} data
     * @returns {Object}
     * @private
     */
    _cleanObject(data) {
        return Object.keys(data)
            .filter(field => isPlainObject(data[field]) || !!data[field])
            .reduce((obj, field) => {
                if (isPlainObject(data[field])) {
                    obj[field] = this._cleanObject(data[field]);
                } else {
                    obj[field] = data[field];
                }
                return obj;
            }, {});
    }


    /**
     * Merge the fields from the specified data with the current manifest
     *
     * @param {Object} data
     * @param {boolean} force If true, empty fields in the data will be removed from the manifest
     * @returns {Manifest}
     */
    merge(data, force) {
        if (data instanceof Object) {
            Object.keys(data).map(key => {
                if (data[key] instanceof Object) {
                    if (key === 'developer' && data[key].name) {
                        Object.assign(data[key], Manifest.parseAuthor(data[key].name));
                    }
                    const cleanData = force ? data[key] : this._cleanObject(data[key]);
                    this[key] = Object.assign({}, this[key], cleanData);
                } else if(data[key] || force) {
                    this[key] = data[key];
                }
            });
        }

        return this;
    }


    /**
     * Validate the current manifest
     *
     * @returns {boolean}
     */
    isValid() {
        return this.getMissingFields().length === 0;
    }


    /**
     * Return a list of required fields
     *
     * @returns {string[]}
     */
    static getRequiredFields() {
        return [
            'name',
            'description',
            'version',
            'icons.48',
            'developer.name',
            'launch_path',
            'default_locale',
            'activities.dhis.href'
        ];
    }


    /**
     * Checks the current manifest against the list of required fields
     *
     * @returns {string[]} List of required fields that are missing
     */
    getMissingFields() {
        const isValid = (object, fields) => {
            if (Array.isArray(fields) && fields.length > 1) {
                const field = fields.shift();
                return object && object.hasOwnProperty(field) && isPlainObject(object[field]) && isValid(object[field], fields);
            }

            return !!object[fields[0]];
        };

        log.debug('Checking for required fields:'.magenta);
        return Manifest.getRequiredFields().filter(key => {
            log.debug(`    - ${key}`);
            if (key.indexOf('.') > 0) {
                const fields = key.split('.');
                const object = fields.shift();

                return !(isValid(this[object], fields));
            }

            return !(this.hasOwnProperty(key) && this[key] !== undefined && this[key] !== '');
        });
    }


    /**
     * Return a JSON representation of the current manifest
     *
     * @param {boolean} ugly If true, no extra spaces or newlines will be returned
     */
    getJSON(ugly) {
        return JSON.stringify(this, null, ugly == true ? 0 : 2);
    }


    /**
     * Write the JSON representation of the current manifest to a file
     *
     * @param {String} filename
     * @param {boolean} ugly
     */
    write(filename, ugly) {
        log.info('Writing manifest to:'.cyan, filename);
        try {
            fs.writeFileSync(filename, this.getJSON(ugly == true));
            log.info('Success!'.green);
        } catch (e) {
            log.error('Failed to write to file:'.red, e.message);
        }
    }


    /**
     * Read npm package data from the specified file, typically package.json
     *
     * @param filename
     * @returns {{}}
     */
    static readPackageFile(filename) {
        try {
            const pkg = JSON.parse(fs.readFileSync(filename, 'utf8'));
            const out = {};
            if (pkg.name) out.name = pkg.name;
            if (pkg.version) out.version = pkg.version;
            if (pkg.description) out.description = pkg.description;
            if (pkg.author) out.developer = Manifest.parseAuthor(pkg.author);

            if (pkg.hasOwnProperty('webapp.manifest')) {
                Object.assign(out, pkg['webapp.manifest']);
            }

            return out;
        }
        catch (e) {
            log.error('Failed to read package file:'.red, e.message);
            process.exit(1);
        }
    }


    /**
     * Parse a "person field" as used by npm into an object consisting of
     * name, email and url
     *
     * @param {String} str
     * @returns {{name: String, email: String, url: String}}
     */
    static parseAuthor(str) {
        if (isPlainObject(str)) {
            return {
                name: str.name,
                email: str.email,
                url: str.url
            };
        }

        const author = getAuthorRegex().exec(str);
        if (!author) return {};
        const out = {name: author[1]};
        if (author[2] && author[2] !== '') out.email = author[2];
        if (author[3] && author[3] !== '') out.url = author[3];
        return out;
    }
}

module.exports = Manifest;
