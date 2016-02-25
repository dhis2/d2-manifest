'use strict';

require('colors');
const fs = require('fs');
const log = require('loglevel');
const getAuthorRegex = require('author-regex');
const isPlainObject = require('lodash.isplainobject');

const requiredFields = [
    'name',
    'description',
    'version',
    'icons.48',
    'developer.name',
    'launch_path',
    'default_locale',
    'activities.dhis'
];


class Manifest {
    constructor(data) {
        Object.assign(this, data);

        this.write = this.write.bind(this);
        this.merge = this.merge.bind(this);
        this.clean = this.clean.bind(this);

        this.isValid = this.isValid.bind(this);
        this.getMissingFields = this.getMissingFields.bind(this);
        this.getJSON = this.getJSON.bind(this);
    }


    merge(data) {
        if (data instanceof Object) {
            Object.keys(data).map(key => {
                if (data[key] instanceof Object) {
                    if (key === 'developer' && data[key].name) {
                        Object.assign(data[key], Manifest.parseAuthor(data[key].name));
                    }
                    this[key] = Object.assign({}, this[key], data[key]);
                } else {
                    this[key] = data[key];
                }
            });
        }

        return this;
    }


    isValid() {
        return this.getMissingFields().length === 0;
    }


    getMissingFields() {
        return requiredFields.filter(key => {
            if (key.indexOf('.') > 0) {
                const parts = key.split('.');
                const object = parts.shift();
                const field = parts.shift();
                if (parts.length > 0) {
                    throw new Error(`Required field ${key} is nested too deep!`.red);
                }

                return !(
                    this.hasOwnProperty(object) &&
                    this[object] !== undefined &&
                    this[object] instanceof Object &&
                    this[object].hasOwnProperty(field) &&
                    this[object][field] !== undefined &&
                    this[object][field] !== ''
                );
            }

            return !(this.hasOwnProperty(key) && this[key] !== undefined && this[key] !== '');
        });
    }


    clean() {
        const cleanObject = (obj) => {
            return Object.keys(obj).filter(field => {
                if (isPlainObject(obj[field])) {
                    return cleanObject(obj[field]).length > 0;
                }
                return obj[field] !== undefined && obj[field] !== '';
            });
        };

        Object.assign(this, Object.keys(this)
            .filter(key => {
                if (this[key] instanceof Function) {
                    return false;
                }
                if (isPlainObject(this[key])) {
                    return cleanObject(this[key]).length > 0;
                }
                return this[key] !== undefined && this[key] !== '';
            })
            .reduce((p, c) => {
                if (this[c] instanceof Function) {
                    return p;
                } else if (isPlainObject(this[c])) {
                    p[c] = Object.assign({}, Object.keys(this[c]).reduce((p2, c2) => {
                        if (this[c][c2] && this[c][c2] !== '') {
                            p2[c2] = this[c][c2];
                        }
                        return p2;
                    }, {}));
                } else {
                    p[c] = this[c];
                }
                return p;
            }, {}));

        return this;
    }


    getJSON() {
        return JSON.stringify(this, null, 2);
    }


    write(filename, ugly) {
        log.info('Writing manifest to:'.cyan, filename);
        try {
            fs.writeFileSync(filename, JSON.stringify(this, null, ugly ? 0 : 2));
            log.info('Success!'.green);
        } catch (e) {
            log.error('Failed to write to file:'.red, e.message);
        }
    }


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


    static parseAuthor(data) {
        if (data instanceof Object) {
            return {
                name: data.name,
                email: data.email,
                url: data.url
            };
        }

        const author = getAuthorRegex().exec(data);
        if (!author) return {};
        const out = {name: author[1]};
        if (author[2]) out.email = author[2];
        if (author[3]) out.url = author[3];
        return out;
    }


    static isrequiredField(field) {
        return requiredFields.indexOf(field) >= 0;
    }
}

module.exports = Manifest;
