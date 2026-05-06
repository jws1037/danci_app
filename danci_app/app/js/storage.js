const Storage = {
    PREFIX: 'danci_',

    _get(key) {
        try {
            return JSON.parse(localStorage.getItem(this.PREFIX + key));
        } catch(e) {
            return null;
        }
    },

    _set(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
        } catch(e) {
            console.warn('Storage full or unavailable:', e);
        }
    },

    _merge(key, updates) {
        const current = this._get(key) || {};
        Object.assign(current, updates);
        this._set(key, current);
        return current;
    },

    getSettings() {
        return this._get('settings') || { currentWordlist: 'cet4' };
    },

    setCurrentWordlist(wordlist) {
        const s = this.getSettings();
        s.currentWordlist = wordlist;
        this._set('settings', s);
    },

    getLearningRecords() {
        return this._get('learning') || {};
    },

    updateLearningRecord(wordId, updates) {
        return this._merge('learning', { [wordId]: this._buildRecord(wordId, updates) });
    },

    _buildRecord(wordId, updates) {
        const records = this.getLearningRecords();
        const existing = records[wordId] || { stage: 0, lastReview: '', reviewCount: 0, isMastered: false, wrongCount: 0 };
        return Object.assign(existing, updates);
    },

    getFavorites() {
        return this._get('favorites') || [];
    },

    addFavorite(wordId) {
        const favs = this.getFavorites();
        if (!favs.includes(wordId)) {
            favs.push(wordId);
            this._set('favorites', favs);
        }
    },

    removeFavorite(wordId) {
        let favs = this.getFavorites();
        favs = favs.filter(id => id !== wordId);
        this._set('favorites', favs);
    },

    isFavorite(wordId) {
        return this.getFavorites().includes(wordId);
    },

    getErrors() {
        return this._get('errors') || [];
    },

    addError(wordId) {
        const errors = this.getErrors();
        if (!errors.includes(wordId)) {
            errors.push(wordId);
            this._set('errors', errors);
        }
        const records = this.getLearningRecords();
        const r = records[wordId] || {};
        r.wrongCount = (r.wrongCount || 0) + 1;
        this._set('learning', Object.assign(records, { [wordId]: r }));
    },

    removeError(wordId) {
        let errors = this.getErrors();
        errors = errors.filter(id => id !== wordId);
        this._set('errors', errors);
    },

    clearErrors() {
        this._set('errors', []);
    },

    getCheckins() {
        return this._get('checkins') || {};
    },

    checkinToday(learnedCount, reviewedCount) {
        const today = new Date().toISOString().split('T')[0];
        const checkins = this.getCheckins();
        if (!checkins[today]) {
            checkins[today] = { learnedCount: 0, reviewedCount: 0 };
        }
        checkins[today].learnedCount += learnedCount;
        checkins[today].reviewedCount += reviewedCount;
        this._set('checkins', checkins);
    },

    getTodayLearnedWordIds() {
        const today = new Date().toISOString().split('T')[0];
        const dailyData = this._get('daily_' + today);
        return dailyData || [];
    },

    addTodayLearned(wordId) {
        const today = new Date().toISOString().split('T')[0];
        const dailyData = this._get('daily_' + today) || [];
        if (!dailyData.includes(wordId)) {
            dailyData.push(wordId);
            this._set('daily_' + today, dailyData);
        }
    },

    getAllLearnedWordIds() {
        const records = this.getLearningRecords();
        return Object.keys(records).map(Number);
    },

    getMasteredCount(category) {
        const records = this.getLearningRecords();
        const words = Storage.getWordsByCategory(category);
        let count = 0;
        for (let w of words) {
            if (records[w.id] && records[w.id].isMastered) count++;
        }
        return count;
    },

    calcStreak() {
        const checkins = this.getCheckins();
        const dates = Object.keys(checkins).sort().reverse();
        if (dates.length === 0) return 0;
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < dates.length; i++) {
            const d = new Date(dates[i]);
            d.setHours(0, 0, 0, 0);
            const expected = new Date(today);
            expected.setDate(expected.getDate() - i);
            expected.setHours(0, 0, 0, 0);
            if (d.getTime() === expected.getTime()) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    },

    calcLongestStreak() {
        const checkins = this.getCheckins();
        const dates = Object.keys(checkins).sort();
        if (dates.length === 0) return 0;
        let longest = 1;
        let current = 1;
        for (let i = 1; i < dates.length; i++) {
            const prev = new Date(dates[i-1]);
            const curr = new Date(dates[i]);
            if ((curr - prev) === 86400000) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 1;
            }
        }
        return longest;
    },

    getWordsByCategory(category) {
        const map = { cet4: WORD_DATA.cet4, cet6: WORD_DATA.cet6, postgrad: WORD_DATA.postgrad, daily: WORD_DATA.daily };
        return map[category] || WORD_DATA.cet4;
    },

    getCategoryName(category) {
        const map = { cet4: '四级词汇', cet6: '六级词汇', postgrad: '考研词汇', daily: '日常英语' };
        return map[category] || '四级词汇';
    },

    getProgress(category) {
        const records = this.getLearningRecords();
        const words = this.getWordsByCategory(category);
        if (words.length === 0) return 0;
        let learned = 0;
        for (let w of words) {
            if (records[w.id]) learned++;
        }
        return Math.round((learned / words.length) * 100);
    },

    resetAllData() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX));
        keys.forEach(k => localStorage.removeItem(k));
    }
};
