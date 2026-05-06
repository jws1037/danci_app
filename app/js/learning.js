const LearningEngine = {
    STAGES: [0, 1, 2, 4, 7, 15, 30],
    MAX_STAGE: 7,

    getDaysSinceReview(wordId) {
        const records = Storage.getLearningRecords();
        const r = records[wordId];
        if (!r || !r.lastReview) return Infinity;
        const lastReview = new Date(r.lastReview);
        const now = new Date();
        return Math.floor((now - lastReview) / 86400000);
    },

    getNextReviewDate(stage) {
        if (stage >= this.MAX_STAGE) return null;
        const interval = this.STAGES[stage] || 1;
        const next = new Date();
        next.setDate(next.getDate() + interval);
        return next.toISOString().split('T')[0];
    },

    getWordsForReview(category) {
        const records = Storage.getLearningRecords();
        const words = Storage.getWordsByCategory(category);
        const dueWords = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let w of words) {
            const r = records[w.id];
            if (!r || r.isMastered) continue;
            if (r.stage >= this.MAX_STAGE) continue;
            if (!r.lastReview) continue;

            const lastReview = new Date(r.lastReview);
            lastReview.setHours(0, 0, 0, 0);
            const interval = this.STAGES[r.stage] || 1;
            const nextReview = new Date(lastReview);
            nextReview.setDate(nextReview.getDate() + interval);

            if (today >= nextReview) {
                dueWords.push(w);
            }
        }
        return dueWords;
    },

    getNewWordsForLearn(category, count) {
        const records = Storage.getLearningRecords();
        const words = Storage.getWordsByCategory(category);
        const newWords = [];
        for (let w of words) {
            if (!records[w.id]) {
                newWords.push(w);
                if (newWords.length >= count) break;
            }
        }
        return newWords;
    },

    getShuffledWords(category, count) {
        const words = Storage.getWordsByCategory(category);
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    },

    getRandomUnlearnedWord(category) {
        const records = Storage.getLearningRecords();
        const words = Storage.getWordsByCategory(category);
        const unlearned = [];
        for (let w of words) {
            if (!records[w.id] || !records[w.id].lastReview) {
                unlearned.push(w);
            }
        }
        if (unlearned.length === 0) {
            const allWords = [...words];
            return allWords.sort(() => Math.random() - 0.5);
        }
        return unlearned.sort(() => Math.random() - 0.5);
    },

    answerWord(wordId, answer) {
        const records = Storage.getLearningRecords();
        const r = records[wordId] || { stage: 0, lastReview: '', reviewCount: 0, isMastered: false, wrongCount: 0 };
        r.lastReview = new Date().toISOString().split('T')[0];
        r.reviewCount = (r.reviewCount || 0) + 1;

        if (answer === 'forgot') {
            r.stage = 0;
            Storage.addError(wordId);
        } else if (answer === 'vague') {
            r.stage = Math.max(0, (r.stage || 0) - 1);
        } else if (answer === 'remember') {
            r.stage = Math.min(this.MAX_STAGE, (r.stage || 0) + 1);
            if (r.stage >= this.MAX_STAGE) {
                r.isMastered = true;
            }
        }

        Storage.updateLearningRecord(wordId, r);
        Storage.addTodayLearned(wordId);
        return r;
    },

    getStatsOverview() {
        const records = Storage.getLearningRecords();
        let totalLearned = 0;
        let mastered = 0;
        let pendingReview = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let wid in records) {
            const r = records[wid];
            if (r.lastReview) totalLearned++;
            if (r.isMastered) mastered++;
            if (!r.isMastered && r.lastReview && r.stage < this.MAX_STAGE) {
                const lastReview = new Date(r.lastReview);
                lastReview.setHours(0, 0, 0, 0);
                const interval = this.STAGES[r.stage] || 1;
                const nextReview = new Date(lastReview);
                nextReview.setDate(nextReview.getDate() + interval);
                if (today >= nextReview) pendingReview++;
            }
        }

        return { totalLearned, mastered, pendingReview };
    }
};
