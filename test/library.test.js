'use strict';

const assert = require('assert');
const Module = require('module');

const LIB_PATH = require.resolve('../library.js');

// --- Helpers ---

function makeMetaMock(overrides = {}) {
    return {
        settings: {
            get: overrides.settingsGet || (async () => null),
        },
        config: {
            title: overrides.title !== undefined ? overrides.title : 'Test Forum',
            minimumPostLength: overrides.minimumPostLength || 10,
        },
    };
}

function loadLibrary(mockMeta) {
    delete require.cache[LIB_PATH];
    const origMain = process.mainModule;
    process.mainModule = {
        filename: '/root/nodebb/app.js',
        paths: Module._nodeModulePaths('/root/nodebb'),
        require(p) {
            return p === './src/meta' ? mockMeta : require(p);
        },
    };
    const lib = require(LIB_PATH);
    process.mainModule = origMain;
    return lib;
}

// Strings long enough for franc to detect reliably
const ENGLISH = 'The quick brown fox jumps over the lazy dog and this is clearly written in the English language.';
const FRENCH  = 'Bonjour, comment allez-vous? Je suis très content de vous voir aujourd\'hui. La vie est vraiment belle.';
const GERMAN  = 'Guten Morgen, wie geht es Ihnen heute? Das Wetter ist sehr schön und ich freue mich sehr darüber.';

// --- Suites ---

describe('getSettings()', () => {
    it('returns defaults when meta.settings.get returns null', async () => {
        const lib = loadLibrary(makeMetaMock({ settingsGet: async () => null }));
        // Default allows English; short text always passes
        const result = await lib.filterTopicPost({ content: 'short' });
        assert.strictEqual(result.content, 'short');
    });

    it('parses allowedLangs JSON array correctly', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['fra', 'eng']), minLength: '10' }),
        }));
        // French should be allowed when fra is in the list
        const result = await lib.filterTopicPost({ content: FRENCH });
        assert.ok(result);
    });

    it('falls back to default allowedLangs for invalid JSON', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: 'not-valid-json', minLength: '10' }),
        }));
        // Default is eng only; French text should be blocked
        await assert.rejects(() => lib.filterTopicPost({ content: FRENCH }), { status: 403 });
    });

    it('falls back to default allowedLangs for empty array', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify([]), minLength: '10' }),
        }));
        // Empty array → falls back to ['eng']; French blocked
        await assert.rejects(() => lib.filterTopicPost({ content: FRENCH }), { status: 403 });
    });

    it('parses minLength as integer', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng']), minLength: '200' }),
        }));
        // FRENCH is < 200 chars so below minLength → always allowed
        const result = await lib.filterTopicPost({ content: FRENCH });
        assert.ok(result);
    });

    it('falls back to default minLength for non-numeric value', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng']), minLength: 'banana' }),
        }));
        // Default minLength=10; FRENCH is > 10 chars so it gets checked and blocked
        await assert.rejects(() => lib.filterTopicPost({ content: FRENCH }), { status: 403 });
    });

    it('returns defaults and does not throw when meta.settings.get throws', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => { throw new Error('DB down'); },
        }));
        // Defaults allow English
        const result = await lib.filterTopicPost({ content: ENGLISH });
        assert.ok(result);
    });

    it('caches settings — meta.settings.get called only once for two checks', async () => {
        let callCount = 0;
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => {
                callCount++;
                return { allowedLangs: JSON.stringify(['eng']), minLength: '10' };
            },
        }));
        await lib.filterTopicPost({ content: ENGLISH });
        await lib.filterTopicPost({ content: ENGLISH });
        assert.strictEqual(callCount, 1);
    });
});

describe('checkLanguage() (via filter hooks)', () => {
    let lib;
    before(() => {
        lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng']), minLength: '10' }),
        }));
    });

    it('allows text shorter than minLength', async () => {
        const result = await lib.filterTopicPost({ content: 'Hi' });
        assert.ok(result);
    });

    it('allows text exactly one char below minLength', async () => {
        const result = await lib.filterTopicPost({ content: '123456789' }); // 9 chars, minLength=10
        assert.ok(result);
    });

    it('allows clearly English text', async () => {
        const result = await lib.filterTopicPost({ content: ENGLISH });
        assert.ok(result);
    });

    it('blocks clearly French text when only English is allowed', async () => {
        await assert.rejects(() => lib.filterTopicPost({ content: FRENCH }), { status: 403 });
    });

    it('allows French text when fra is in allowedLangs', async () => {
        const libFra = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng', 'fra']), minLength: '10' }),
        }));
        const result = await libFra.filterTopicPost({ content: FRENCH });
        assert.ok(result);
    });

    it('allows text when franc returns und (undetermined)', async () => {
        // Pure numbers that franc cannot detect as any language
        const result = await lib.filterTopicPost({ content: '12345678901234567890' });
        assert.ok(result);
    });

    it('strips HTML tags before language detection', async () => {
        const htmlFrench = `<p><strong>${FRENCH}</strong></p>`;
        await assert.rejects(() => lib.filterTopicPost({ content: htmlFrench }), { status: 403 });
    });

    it('strips HTML such that remaining text is below minLength → allowed', async () => {
        // "Bonjour" = 7 chars after stripping, less than minLength=10
        const result = await lib.filterTopicPost({ content: '<p>Bonjour</p>' });
        assert.ok(result);
    });

    it('handles null content without throwing', async () => {
        const result = await lib.filterTopicPost({ content: null });
        assert.ok(result);
    });

    it('handles missing content key without throwing', async () => {
        const result = await lib.filterTopicPost({});
        assert.ok(result);
    });
});

describe('filterTopicPost()', () => {
    let lib;
    before(() => {
        lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng']), minLength: '10', moreInfoUrl: 'https://example.com/why' }),
            title: 'My Forum',
        }));
    });

    it('returns data unchanged for an allowed post (content)', async () => {
        const data = { content: ENGLISH };
        const result = await lib.filterTopicPost(data);
        assert.strictEqual(result, data);
    });

    it('returns data unchanged for an allowed post (title only)', async () => {
        const data = { title: ENGLISH };
        const result = await lib.filterTopicPost(data);
        assert.strictEqual(result, data);
    });

    it('throws a 403 error for a blocked post', async () => {
        await assert.rejects(
            () => lib.filterTopicPost({ content: FRENCH }),
            (err) => { assert.strictEqual(err.status, 403); return true; }
        );
    });

    it('error message contains allowed language name', async () => {
        await assert.rejects(
            () => lib.filterTopicPost({ content: FRENCH }),
            (err) => {
                assert.ok(err.message.includes('English'), `Expected 'English' in: ${err.message}`);
                return true;
            }
        );
    });

    it('error message contains site title', async () => {
        await assert.rejects(
            () => lib.filterTopicPost({ content: FRENCH }),
            (err) => {
                assert.ok(err.message.includes('My Forum'), `Expected 'My Forum' in: ${err.message}`);
                return true;
            }
        );
    });

    it('error message contains moreInfoUrl link', async () => {
        await assert.rejects(
            () => lib.filterTopicPost({ content: FRENCH }),
            (err) => {
                assert.ok(err.message.includes('https://example.com/why'), `Expected URL in: ${err.message}`);
                return true;
            }
        );
    });

    it('prefers content over title for language detection', async () => {
        // Content is French (blocked), title is English
        await assert.rejects(
            () => lib.filterTopicPost({ content: FRENCH, title: ENGLISH }),
            (err) => err.status === 403
        );
    });

    it('allows post when data is empty object (text below minLength)', async () => {
        const result = await lib.filterTopicPost({});
        assert.deepStrictEqual(result, {});
    });
});

describe('filterTopicReply()', () => {
    let lib;
    before(() => {
        lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng']), minLength: '10' }),
            title: 'Test Forum',
        }));
    });

    it('returns data unchanged for an allowed reply', async () => {
        const data = { content: ENGLISH };
        const result = await lib.filterTopicReply(data);
        assert.strictEqual(result, data);
    });

    it('throws a 403 error for a blocked reply', async () => {
        await assert.rejects(
            () => lib.filterTopicReply({ content: FRENCH }),
            (err) => err.status === 403
        );
    });

    it('does not inspect title — only content', async () => {
        // Title is French but content is missing → empty string < minLength → allowed
        const result = await lib.filterTopicReply({ title: FRENCH });
        assert.deepStrictEqual(result, { title: FRENCH });
    });

    it('allows reply when data is empty object', async () => {
        const result = await lib.filterTopicReply({});
        assert.deepStrictEqual(result, {});
    });
});

describe('buildBlockedMessage() (via filterTopicPost error)', () => {
    it('uses LANGUAGE_LABELS for known lang codes', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['fra']), minLength: '10' }),
        }));
        await assert.rejects(
            () => lib.filterTopicPost({ content: ENGLISH }),
            (err) => {
                assert.ok(err.message.includes('French'), `Expected 'French' in: ${err.message}`);
                return true;
            }
        );
    });

    it('falls back to raw code for unknown lang codes', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['xyz']), minLength: '10' }),
        }));
        await assert.rejects(
            () => lib.filterTopicPost({ content: ENGLISH }),
            (err) => {
                assert.ok(err.message.includes('xyz'), `Expected 'xyz' in: ${err.message}`);
                return true;
            }
        );
    });

    it('joins multiple allowed langs with " and "', async () => {
        // Only eng+fra allowed; German text should be blocked, showing both lang names
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng', 'fra']), minLength: '10' }),
        }));
        await assert.rejects(
            () => lib.filterTopicPost({ content: GERMAN }),
            (err) => {
                assert.ok(err.message.includes('English and French'), `Expected 'English and French' in: ${err.message}`);
                return true;
            }
        );
    });

    it('falls back to "this forum" when meta.config.title is absent', async () => {
        const mock = makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng']), minLength: '10' }),
        });
        mock.config = {}; // no title property
        const lib = loadLibrary(mock);
        await assert.rejects(
            () => lib.filterTopicPost({ content: FRENCH }),
            (err) => {
                assert.ok(err.message.includes('this forum'), `Expected 'this forum' in: ${err.message}`);
                return true;
            }
        );
    });

    it('includes moreInfoUrl as an href in the message', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng']), minLength: '10', moreInfoUrl: 'https://policy.example.com' }),
        }));
        await assert.rejects(
            () => lib.filterTopicPost({ content: FRENCH }),
            (err) => {
                assert.ok(err.message.includes('href="https://policy.example.com"'), `Expected href in: ${err.message}`);
                return true;
            }
        );
    });

    it('renders empty href when moreInfoUrl is not set', async () => {
        const lib = loadLibrary(makeMetaMock({
            settingsGet: async () => ({ allowedLangs: JSON.stringify(['eng']), minLength: '10' }),
        }));
        await assert.rejects(
            () => lib.filterTopicPost({ content: FRENCH }),
            (err) => {
                assert.ok(err.message.includes('href=""'), `Expected empty href in: ${err.message}`);
                return true;
            }
        );
    });
});
