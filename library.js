'use strict';

const francModule = require('franc-min');
const franc = typeof francModule === 'function' ? francModule : francModule.franc;
const als = require.main.require('./src/als');
const meta = require.main.require('./src/meta');
const privileges = require.main.require('./src/privileges');

// Defaults
const DEFAULTS = {
    allowedLangs: ['eng'],
    minLength: 10,
    moreInfoUrl: '',
};

// Languages
const LANGUAGE_LABELS = {
    eng: 'English', gle: 'Irish (Gaeilge)', fra: 'French', deu: 'German',
    spa: 'Spanish', ita: 'Italian', por: 'Portuguese', nld: 'Dutch',
    pol: 'Polish', swe: 'Swedish', nor: 'Norwegian', dan: 'Danish',
    fin: 'Finnish', rus: 'Russian', ukr: 'Ukrainian', ara: 'Arabic',
    zho: 'Chinese', jpn: 'Japanese', kor: 'Korean', hin: 'Hindi',
    tur: 'Turkish', vie: 'Vietnamese', ind: 'Indonesian', ces: 'Czech',
    ron: 'Romanian', hun: 'Hungarian', ell: 'Greek', heb: 'Hebrew',
    cat: 'Catalan', slk: 'Slovak',
};
const LANGUAGE_CODES = new Set(Object.keys(LANGUAGE_LABELS));
const MIN_LENGTH_MIN = 1;
const MIN_LENGTH_MAX = 500;

let settingsCache = null;
let cacheExpiry = 0;
let settingsPromise = null;
const CACHE_TTL = 60000;
const MAX_DETECTION_LENGTH = 10000;

function defaultSettings() {
    return {
        allowedLangs: [...DEFAULTS.allowedLangs],
        minLength: DEFAULTS.minLength,
        moreInfoUrl: DEFAULTS.moreInfoUrl,
    };
}

async function getSettings() {
    const now = Date.now();
    if (settingsCache && now < cacheExpiry) {
        return settingsCache;
    }
    if (settingsPromise) return settingsPromise;
    settingsPromise = (async () => {
        try {
            const stored = await meta.settings.get('language-filter');
            let allowedLangs = [...DEFAULTS.allowedLangs];
            let minLength = DEFAULTS.minLength;
            let moreInfoUrl = DEFAULTS.moreInfoUrl;
            if (stored && stored.allowedLangs !== undefined) {
                try {
                    const parsed = JSON.parse(stored.allowedLangs);
                    allowedLangs = (Array.isArray(parsed) && parsed.length > 0 && parsed.every(code => LANGUAGE_CODES.has(code))) ? [...new Set(parsed)] : [...DEFAULTS.allowedLangs];
                } catch (e) { allowedLangs = [...DEFAULTS.allowedLangs]; }
            }
            if (stored && stored.minLength !== undefined) {
                const parsed = Number(stored.minLength);
                minLength = Number.isInteger(parsed) && parsed >= MIN_LENGTH_MIN && parsed <= MIN_LENGTH_MAX ? parsed : DEFAULTS.minLength;
            }
            if (stored && stored.moreInfoUrl !== undefined) {
                moreInfoUrl = validateMoreInfoUrl(stored.moreInfoUrl);
            }
            settingsCache = { allowedLangs, minLength, moreInfoUrl };
            cacheExpiry = Date.now() + CACHE_TTL;
            return settingsCache;
        } catch (e) {
            console.error('[language-filter] Failed to load settings:', e.message);
            settingsCache = defaultSettings();
            cacheExpiry = Date.now() + CACHE_TTL;
            return settingsCache;
        } finally {
            settingsPromise = null;
        }
    })();
    return settingsPromise;
}

function validateMoreInfoUrl(value) {
    const url = String(value || '').trim();
    if (!url) return '';
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (e) {
        return '';
    }
}

// Error message that appears on the front-end. 
function buildBlockedMessage(settings) {
    const siteTitle = (meta.config && meta.config.title) || 'this forum';
    const langList = settings.allowedLangs.map(c => LANGUAGE_LABELS[c] || c).join(' and ');
    return settings.moreInfoUrl ? `Only ${langList} posts are allowed on ${siteTitle}. Why? ${settings.moreInfoUrl}` : `Only ${langList} posts are allowed on ${siteTitle}.`;
}

// Script-based detection for languages with distinct Unicode ranges.
// These are checked before franc to handle short text reliably.
const SCRIPT_LANGS = [
    { pattern: /[\u3040-\u309F\u30A0-\u30FF]/, lang: 'jpn' }, // Hiragana/Katakana → Japanese
    { pattern: /[\uAC00-\uD7AF]/, lang: 'kor' },               // Hangul → Korean
    { pattern: /[\u0600-\u06FF]/, lang: 'ara' },               // Arabic script
    { pattern: /[\u0590-\u05FF]/, lang: 'heb' },               // Hebrew script
    { pattern: /[\u0900-\u097F]/, lang: 'hin' },               // Devanagari → Hindi
    { pattern: /[іІїЇєЄґҐ]/, lang: 'ukr' },                    // Ukrainian-specific Cyrillic
    { pattern: /[\u0400-\u04FF]/, lang: 'rus' },               // Cyrillic fallback
    { pattern: /[\u4E00-\u9FFF\u3400-\u4DBF]/, lang: 'zho' }, // CJK → Chinese (fallback if no kana)
];

function detectScriptLang(text) {
    for (const { pattern, lang } of SCRIPT_LANGS) {
        const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
        const matches = text.match(new RegExp(pattern.source, flags));
        if (matches && matches.length >= 2) return lang;
    }
    return null;
}

function cleanTextForLanguageDetection(textContent) {
    return String(textContent || '')
        .replace(/(^|[\s(])(?:https?:\/\/|www\.)\S+/gi, '$1')
        .replace(/(^|[^\w@])@[\w.-]+@(?:[\w-]+\.)+[\w-]+\b/g, '$1')
        .replace(/(^|[^\w@])@[\w.-]+\b/g, '$1')
        .replace(/<[^>]*>/g, '')
        .trim();
}

async function checkLanguage(textContent, data, settings = null) {
    settings = settings || await getSettings();
    const cleaned = cleanTextForLanguageDetection(textContent).slice(0, MAX_DETECTION_LENGTH);
    if (cleaned.length < settings.minLength) {
        return { allowed: true };
    }
    const detectedLang = detectScriptLang(cleaned) || franc(cleaned);
    if (detectedLang === 'und') return { allowed: true };
    return { allowed: settings.allowedLangs.includes(detectedLang), settings };
}

const LanguageFilter = {

    filterTopicPost: async function (data) {
        const { allowed, settings } = await checkLanguage(data.sourceContent || data.content || data.title || '');
        if (!allowed) {
            const error = new Error(buildBlockedMessage(settings));
            error.status = 403;
            throw error;
        }
        return data;
    },

    filterTopicReply: async function (data) {
        const { allowed, settings } = await checkLanguage(data.sourceContent || data.content || '');
        if (!allowed) {
            const error = new Error(buildBlockedMessage(settings));
            error.status = 403;
            throw error;
        }
        return data;
    },

    renderAdminPage: async function (req, res) {
        const settings = await getSettings();
        res.render('admin/plugins/language-filter', {
            title: 'Language Filter',
            allowedLangs: settings.allowedLangs.join(','),
            minLength: settings.minLength,
            moreInfoUrl: settings.moreInfoUrl,
            minPostLength: parseInt(meta.config.minimumPostLength, 10) || 0,
        });
    },

    saveSettings: async function (req, res) {
        try {
            const body = req.body || {};
            let allowedLangs;
            try {
                allowedLangs = JSON.parse(body.allowedLangs);
            } catch (e) {
                return res.status(400).json({ success: false, error: 'Allowed languages must be valid JSON.' });
            }
            const minLength = Number(body.minLength);
            const moreInfoUrl = validateMoreInfoUrl(body.moreInfoUrl);
            if (!Array.isArray(allowedLangs) || allowedLangs.length === 0 || !allowedLangs.every(code => LANGUAGE_CODES.has(code))) {
                return res.status(400).json({ success: false, error: 'Select at least one supported language.' });
            }
            const minPostLength = Number(meta.config.minimumPostLength) || 0;
            if (!Number.isInteger(minLength) || minLength < Math.max(MIN_LENGTH_MIN, minPostLength) || minLength > MIN_LENGTH_MAX) {
                return res.status(400).json({ success: false, error: `Minimum text length must be between ${Math.max(MIN_LENGTH_MIN, minPostLength)} and ${MIN_LENGTH_MAX}.` });
            }
            if (body.moreInfoUrl && !moreInfoUrl) {
                return res.status(400).json({ success: false, error: 'More info URL must use HTTP or HTTPS.' });
            }
            await meta.settings.set('language-filter', {
                allowedLangs: JSON.stringify(allowedLangs),
                minLength,
                moreInfoUrl,
            });
            settingsCache = null;
            cacheExpiry = 0;
            res.json({ success: true });
        } catch (e) {
            console.error('[language-filter] Failed to save settings:', e.message);
            res.status(500).json({ success: false, error: 'Unable to save language filter settings.' });
        }
    },

    addAdminNavigation: async function (custom_header) {
        const store = als.getStore();
        const uid = store && store.uid;
        if (!uid || !await privileges.admin.can('admin:settings', uid)) {
            return custom_header;
        }

        custom_header.plugins = custom_header.plugins || [];
        custom_header.plugins.push({
            route: '/plugins/language-filter',
            icon: 'fa-language',
            name: 'Language Filter',
        });
        return custom_header;
    },

    checkLanguageApi: async function (req, res) {
        const text = req.query && typeof req.query.text === 'string' ? req.query.text.slice(0, MAX_DETECTION_LENGTH) : '';
        const settings = await getSettings();
        const result = await checkLanguage(text, null, settings);
        if (!result.allowed) {
            res.json({
                allowed: false,
                message: buildBlockedMessage({ ...(result.settings || settings), moreInfoUrl: '' }),
                moreInfoUrl: settings.moreInfoUrl,
                minLength: settings.minLength,
            });
        } else {
            res.json({ allowed: true, minLength: settings.minLength });
        }
    },

    addRoutes: async function ({ router, middleware }) {
        const middlewares = [
            middleware.ensureLoggedIn,
            middleware.admin.checkPrivileges,
        ];
        router.get('/api/language-filter/check', LanguageFilter.checkLanguageApi);
        router.get('/plugins/language-filter', middleware.admin.buildHeader, LanguageFilter.renderAdminPage);
        router.get('/admin/plugins/language-filter', middleware.admin.buildHeader, LanguageFilter.renderAdminPage);
        router.get('/api/admin/plugins/language-filter', middlewares, LanguageFilter.renderAdminPage);
        router.post('/admin/plugins/language-filter/save', middlewares, LanguageFilter.saveSettings);
    },
};

LanguageFilter.init = LanguageFilter.addRoutes;

module.exports = LanguageFilter;
