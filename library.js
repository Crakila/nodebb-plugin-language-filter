'use strict';

const franc = require('franc-min');
const meta = require.main.require('./src/meta');

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

let settingsCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 60000;

async function getSettings() {
    const now = Date.now();
    if (settingsCache && now < cacheExpiry) {
        return settingsCache;
    }
    try {
        const stored = await meta.settings.get('language-filter');
        let allowedLangs = DEFAULTS.allowedLangs;
        let minLength = DEFAULTS.minLength;
        let moreInfoUrl = DEFAULTS.moreInfoUrl;
        if (stored && stored.allowedLangs) {
            try {
                const parsed = JSON.parse(stored.allowedLangs);
                allowedLangs = (Array.isArray(parsed) && parsed.length > 0) ? parsed : DEFAULTS.allowedLangs;
            } catch (e) { allowedLangs = DEFAULTS.allowedLangs; }
        }
        if (stored && stored.minLength) {
            minLength = parseInt(stored.minLength, 10) || DEFAULTS.minLength;
        }
        if (stored && stored.moreInfoUrl) {
            moreInfoUrl = stored.moreInfoUrl;
        }
        settingsCache = { allowedLangs, minLength, moreInfoUrl };
        cacheExpiry = now + CACHE_TTL;
        return settingsCache;
    } catch (e) {
        return DEFAULTS;
    }
}

// Error message that appears on the front-end. 
function buildBlockedMessage(settings) {
    const siteTitle = (meta.config && meta.config.title) || 'this forum';
    const langList = settings.allowedLangs.map(c => LANGUAGE_LABELS[c] || c).join(' and ');
    return `Only ${langList} posts are allowed on ${siteTitle}. <a href="${settings.moreInfoUrl}">Why?</a>`;
}

async function checkLanguage(textContent) {
    const settings = await getSettings();
    const cleaned = String(textContent || '').replace(/<[^>]*>/g, '').trim();
    if (cleaned.length < settings.minLength) {
        return { allowed: true };
    }
    const detectedLang = franc(cleaned);
    if (detectedLang === 'und') return { allowed: true };
    return { allowed: settings.allowedLangs.includes(detectedLang), settings };
}

const LanguageFilter = {

    filterTopicPost: async function (data) {
        const { allowed, settings } = await checkLanguage(data.content || data.title || '');
        if (!allowed) {
            const error = new Error(buildBlockedMessage(settings));
            error.status = 403;
            throw error;
        }
        return data;
    },

    filterTopicReply: async function (data) {
        const { allowed, settings } = await checkLanguage(data.content || '');
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
            await meta.settings.set('language-filter', {
                allowedLangs: req.body.allowedLangs,
                minLength: req.body.minLength,
                moreInfoUrl: req.body.moreInfoUrl || DEFAULTS.moreInfoUrl,
            });
            settingsCache = null;
            cacheExpiry = 0;
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    },

    addAdminNavigation: async function (custom_header) {
        custom_header.plugins.push({
            route: '/plugins/language-filter',
            icon: 'fa-language',
            name: 'Language Filter',
        });
        return custom_header;
    },

    checkLanguageApi: async function (req, res) {
        const text = req.query.text || '';
        const result = await checkLanguage(text);
        if (!result.allowed) {
            res.json({ allowed: false, message: buildBlockedMessage(result.settings) });
        } else {
            res.json({ allowed: true });
        }
    },

    addRoutes: async function ({ router, middleware }) {
        const middlewares = [
            middleware.ensureLoggedIn,
            middleware.admin.checkPrivileges,
        ];
        router.get('/api/language-filter/check', LanguageFilter.checkLanguageApi);
        router.get('/admin/plugins/language-filter', middleware.admin.buildHeader, LanguageFilter.renderAdminPage);
        router.get('/api/admin/plugins/language-filter', middlewares, LanguageFilter.renderAdminPage);
        router.post('/admin/plugins/language-filter/save', middlewares, LanguageFilter.saveSettings);
    },
};

module.exports = LanguageFilter;
