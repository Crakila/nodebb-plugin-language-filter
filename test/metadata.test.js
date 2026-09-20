'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

describe('release metadata', () => {
    it('keeps the package and plugin versions and compatibility aligned', () => {
        const packageData = require('../package.json');
        const pluginData = require('../plugin.json');

        assert.strictEqual(packageData.version, pluginData.version);
        assert.deepStrictEqual(packageData.nbbpm, pluginData.nbbpm);
        assert.strictEqual(packageData.nbbpm.compatibility, '^4.0.0');
    });
});

describe('ACP language options', () => {
    it('shows native names for every non-English language', () => {
        let languages;
        const source = fs.readFileSync(require.resolve('../public/js/languages.js'), 'utf8');
        vm.runInNewContext(source, {
            define(moduleName, factory) {
                languages = factory();
            },
        });

        assert.strictEqual(languages.length, 30);
        assert.strictEqual(new Set(languages.map(language => language.code)).size, 30);
        assert.strictEqual(languages.find(language => language.code === 'eng').label, 'English');
        languages.filter(language => language.code !== 'eng').forEach((language) => {
            assert.match(language.label, /\(.+\)$/);
        });
        assert.strictEqual(languages.find(language => language.code === 'jpn').label, 'Japanese (日本語)');
        assert.strictEqual(languages.find(language => language.code === 'kor').label, 'Korean (한국어)');
    });
});
