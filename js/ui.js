const UI = {
    currentCategory: 'cet4',
    learnQueue: [],
    reviewQueue: [],
    currentLearnIndex: 0,
    currentReviewIndex: 0,
    isLearnCardFlipped: false,
    isReviewCardFlipped: false,
    currentLearnWord: null,

    init() {
        this.currentCategory = Storage.getSettings().currentWordlist;
        document.getElementById('wordlist-select').value = this.currentCategory;
        this.bindEvents();
        this.refreshAll();
    },

    bindEvents() {
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const page = el.dataset.page;
                navigateTo(page);
                document.getElementById('sidebar').classList.remove('open');
            });
        });

        document.getElementById('wordlist-select').addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            Storage.setCurrentWordlist(this.currentCategory);
            this.refreshAll();
        });

        document.getElementById('word-card').addEventListener('click', () => {
            this.isLearnCardFlipped = !this.isLearnCardFlipped;
            document.getElementById('card-inner').classList.toggle('flipped', this.isLearnCardFlipped);
        });

        document.getElementById('review-card').addEventListener('click', () => {
            this.isReviewCardFlipped = !this.isReviewCardFlipped;
            document.getElementById('review-card-inner').classList.toggle('flipped', this.isReviewCardFlipped);
        });

        document.getElementById('word-search').addEventListener('input', (e) => {
            this.renderWordList(e.target.value);
        });

        document.getElementById('page-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('word-item')) {
                const wid = parseInt(e.target.closest('.word-item').dataset.wordId);
                this.showWordModal(wid);
            }
        });
    },

    refreshAll() {
        this.renderHome();
        this.renderLearnPage();
        this.renderReviewPage();
        this.renderWordList();
        this.renderFavorites();
        this.renderErrors();
        this.renderStats();
        this.updateBadges();
    },

    renderHome() {
        const stats = LearningEngine.getStatsOverview();
        const settings = Storage.getSettings();
        const category = settings.currentWordlist;

        document.getElementById('today-learned').textContent = Storage.getTodayLearnedWordIds().length;
        document.getElementById('pending-review').textContent = stats.pendingReview;
        document.getElementById('mastered-count').textContent = Storage.getMasteredCount(category);
        document.getElementById('streak-days').textContent = Storage.calcStreak() + '天';
        document.getElementById('sidebar-streak').textContent = Storage.calcStreak() + ' 天';

        const progress = Storage.getProgress(category);
        document.getElementById('progress-bar').style.width = progress + '%';
        document.getElementById('progress-text').textContent = `当前词库进度: ${progress}%`;

        this.renderCheckinCalendar();
    },

    renderCheckinCalendar() {
        const container = document.getElementById('checkin-calendar');
        const checkins = Storage.getCheckins();
        const today = new Date();
        const days = [];
        for (let i = 27; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            days.push(d);
        }

        let html = '';
        for (let d of days) {
            const dateStr = d.toISOString().split('T')[0];
            const isChecked = !!checkins[dateStr];
            const isToday = dateStr === today.toISOString().split('T')[0];
            let cls = 'checkin-day';
            if (isChecked) cls += ' checked';
            if (isToday) cls += ' today';
            html += `<div class="${cls}" title="${dateStr}">${d.getDate()}</div>`;
        }
        container.innerHTML = html;
    },

    renderLearnPage() {
        this.learnQueue = LearningEngine.getRandomUnlearnedWord(this.currentCategory);
        this.currentLearnIndex = 0;
        this.isLearnCardFlipped = false;

        if (this.learnQueue.length > 0) {
            this.showLearnWord(this.learnQueue[0]);
            document.getElementById('learn-progress').textContent = `第 1/${this.learnQueue.length} 个`;
        } else {
            document.getElementById('word-english').textContent = '🎉';
            document.getElementById('word-phonetic').textContent = '';
            document.getElementById('word-chinese').textContent = '太棒了！已经学完了所有单词';
            document.getElementById('word-example').textContent = '';
            document.getElementById('word-image').textContent = '🎊';
            document.getElementById('learn-progress').textContent = `第 0/0 个`;
        }
        document.getElementById('learn-category').textContent = Storage.getCategoryName(this.currentCategory);
        document.getElementById('card-inner').classList.remove('flipped');
        this.isReviewCardFlipped = false;
        document.getElementById('review-card-inner').classList.remove('flipped');
    },

    showLearnWord(word) {
        this.currentLearnWord = word;
        document.getElementById('word-image').textContent = word.emoji || '📖';
        document.getElementById('word-english').textContent = word.en;
        document.getElementById('word-phonetic').textContent = word.phonetic || '';
        document.getElementById('word-chinese').textContent = word.zh;
        document.getElementById('word-example').textContent = word.example || '';
        document.getElementById('word-pos').textContent = word.pos || '';
        document.getElementById('learn-progress').textContent = `第 ${this.currentLearnIndex + 1}/${this.learnQueue.length} 个`;

        this.isLearnCardFlipped = false;
        document.getElementById('card-inner').classList.remove('flipped');

        this.updateFavoriteBtn(word.id);
    },

    updateFavoriteBtn(wordId) {
        const btn = document.getElementById('btn-favorite');
        if (Storage.isFavorite(wordId)) {
            btn.innerHTML = '⭐ 已收藏';
            btn.style.borderColor = '#F5A623';
            btn.style.color = '#F5A623';
        } else {
            btn.innerHTML = '⭐ 收藏';
            btn.style.borderColor = '';
            btn.style.color = '';
        }
    },

    renderReviewPage() {
        this.reviewQueue = LearningEngine.getWordsForReview(this.currentCategory);
        this.reviewQueue.sort(() => Math.random() - 0.5);
        this.currentReviewIndex = 0;
        this.isReviewCardFlipped = false;

        if (this.reviewQueue.length > 0) {
            this.showReviewWord(this.reviewQueue[0]);
            document.getElementById('page-review').querySelector('.learn-container').style.display = '';
            document.getElementById('review-empty').style.display = 'none';
        } else {
            document.getElementById('page-review').querySelector('.learn-container').style.display = 'none';
            document.getElementById('review-empty').style.display = '';
        }
        document.getElementById('review-progress').textContent = `待复习: ${this.reviewQueue.length} 个`;
    },

    showReviewWord(word) {
        document.getElementById('review-english').textContent = word.en;
        document.getElementById('review-phonetic').textContent = word.phonetic || '';
        document.getElementById('review-chinese').textContent = word.zh;
        document.getElementById('review-example').textContent = word.example || '';
        document.getElementById('review-card-inner').querySelector('.review-image').textContent = word.emoji || '🔄';
        document.getElementById('review-progress').textContent = `复习: ${this.currentReviewIndex + 1}/${this.reviewQueue.length}`;
        this.isReviewCardFlipped = false;
        document.getElementById('review-card-inner').classList.remove('flipped');
    },

    renderWordList(query) {
        const container = document.getElementById('word-list');
        const words = Storage.getWordsByCategory(this.currentCategory);
        let filtered = words;
        if (query && query.trim()) {
            const q = query.trim().toLowerCase();
            filtered = words.filter(w => w.en.toLowerCase().includes(q) || w.zh.includes(q));
        }
        const records = Storage.getLearningRecords();
        let html = '';
        for (let w of filtered) {
            const r = records[w.id];
            let statusTag = '';
            if (r && r.isMastered) statusTag = '<span class="word-tag" style="background:#d4edda;color:#155724">已掌握</span>';
            else if (r && r.lastReview) statusTag = `<span class="word-tag" style="background:#fff3cd;color:#856404">阶段${r.stage}</span>`;
            html += `<div class="word-item" data-word-id="${w.id}">
                <div class="word-main">
                    <span class="word-en">${w.en}</span>
                    <span class="word-cn">${w.zh}</span>
                    ${statusTag}
                </div>
                <div class="word-actions">
                    <button onclick="event.stopPropagation();UI.showWordModal(${w.id})" title="详情">📋</button>
                    <button onclick="event.stopPropagation();toggleFavoriteById(${w.id});this.textContent=Storage.isFavorite(${w.id})?'⭐':'☆'" title="收藏">${Storage.isFavorite(w.id)?'⭐':'☆'}</button>
                </div>
            </div>`;
        }
        container.innerHTML = html || '<div class="empty-state"><p>没有找到匹配的单词</p></div>';
    },

    renderFavorites() {
        const container = document.getElementById('favorites-list');
        const favIds = Storage.getFavorites();
        const favWords = [];
        for (let id of favIds) {
            const word = this.findWordById(id);
            if (word) favWords.push(word);
        }
        if (favWords.length === 0) {
            document.getElementById('favorites-empty').style.display = '';
            container.innerHTML = '';
        } else {
            document.getElementById('favorites-empty').style.display = 'none';
            container.innerHTML = favWords.map(w => `<div class="word-item" data-word-id="${w.id}">
                <div class="word-main">
                    <span class="word-en">${w.en}</span>
                    <span class="word-cn">${w.zh}</span>
                </div>
                <div class="word-actions">
                    <button onclick="event.stopPropagation();UI.showWordModal(${w.id})" title="详情">📋</button>
                    <button onclick="event.stopPropagation();Storage.removeFavorite(${w.id});UI.renderFavorites();toast('已取消收藏')" title="取消">💔</button>
                </div>
            </div>`).join('');
        }
    },

    renderErrors() {
        const container = document.getElementById('errors-list');
        const errorIds = Storage.getErrors();
        const errorWords = [];
        for (let id of errorIds) {
            const word = this.findWordById(id);
            if (word) errorWords.push(word);
        }
        if (errorWords.length === 0) {
            document.getElementById('errors-empty').style.display = '';
            container.innerHTML = '';
        } else {
            document.getElementById('errors-empty').style.display = 'none';
            const records = Storage.getLearningRecords();
            container.innerHTML = errorWords.map(w => {
                const r = records[w.id];
                const wc = r ? r.wrongCount || 1 : 1;
                return `<div class="word-item" data-word-id="${w.id}">
                    <div class="word-main">
                        <span class="word-en">${w.en}</span>
                        <span class="word-cn">${w.zh}</span>
                        <span class="word-tag" style="background:#ffe0e0;color:#cc0000">错${wc}次</span>
                    </div>
                    <div class="word-actions">
                        <button onclick="event.stopPropagation();UI.showWordModal(${w.id})" title="详情">📋</button>
                        <button onclick="event.stopPropagation();Storage.removeError(${w.id});UI.renderErrors();toast('已移除')" title="移除">✅</button>
                    </div>
                </div>`;
            }).join('');
        }
    },

    renderStats() {
        const stats = LearningEngine.getStatsOverview();
        const favs = Storage.getFavorites().length;
        const errors = Storage.getErrors().length;
        document.getElementById('stat-total-learned').textContent = stats.totalLearned;
        document.getElementById('stat-mastered').textContent = stats.mastered;
        document.getElementById('stat-favorites').textContent = favs;
        document.getElementById('stat-errors').textContent = errors;
        document.getElementById('stat-streak').textContent = Storage.calcLongestStreak();
        document.getElementById('stat-total-days').textContent = Object.keys(Storage.getCheckins()).length;

        const container = document.getElementById('category-stats');
        const categories = [
            { key: 'cet4', name: '四级词汇' },
            { key: 'cet6', name: '六级词汇' },
            { key: 'postgrad', name: '考研词汇' },
            { key: 'daily', name: '日常英语' }
        ];
        let html = '';
        for (let c of categories) {
            const words = Storage.getWordsByCategory(c.key);
            const total = words.length;
            const mastered = Storage.getMasteredCount(c.key);
            const pct = total > 0 ? Math.round((mastered/total)*100) : 0;
            html += `<div style="margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                    <span>${c.name}</span><span>${mastered}/${total} (${pct}%)</span>
                </div>
                <div class="progress-bar-container" style="height:6px">
                    <div class="progress-bar" style="width:${pct}%"></div>
                </div>
            </div>`;
        }
        container.innerHTML = html;
    },

    updateBadges() {
        const reviewCount = LearningEngine.getWordsForReview(this.currentCategory).length;
        const badge = document.getElementById('review-badge');
        if (reviewCount > 0) {
            badge.style.display = 'inline';
            badge.textContent = reviewCount;
        } else {
            badge.style.display = 'none';
        }
    },

    findWordById(id) {
        for (let key of ['cet4','cet6','postgrad','daily']) {
            const words = WORD_DATA[key];
            for (let w of words) {
                if (w.id === id) return w;
            }
        }
        return null;
    },

    showWordModal(wordId) {
        const word = this.findWordById(wordId);
        if (!word) return;
        let modal = document.getElementById('word-detail-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'word-detail-modal';
            modal.innerHTML = `<div class="modal-content">
                <button class="modal-close" onclick="document.getElementById('word-detail-modal').classList.remove('show')">✕</button>
                <div class="modal-word" id="modal-word"></div>
                <div class="modal-phonetic" id="modal-phonetic"></div>
                <div class="modal-chinese" id="modal-chinese"></div>
                <div class="modal-example" id="modal-example"></div>
                <div class="modal-actions">
                    <button class="btn btn-sm btn-outline" id="modal-fav-btn" onclick="UI.toggleModalFav()"></button>
                </div>
            </div>`;
            document.body.appendChild(modal);
            modal.addEventListener('click', function(e) {
                if (e.target === modal) modal.classList.remove('show');
            });
        }
        document.getElementById('modal-word').textContent = word.en;
        document.getElementById('modal-phonetic').textContent = word.phonetic || '';
        document.getElementById('modal-chinese').textContent = word.zh;
        document.getElementById('modal-example').textContent = word.example || '';
        const favBtn = document.getElementById('modal-fav-btn');
        favBtn.dataset.wordId = wordId;
        favBtn.textContent = Storage.isFavorite(wordId) ? '⭐ 已收藏' : '☆ 收藏';
        modal.classList.add('show');
    },

    toggleModalFav() {
        const btn = document.getElementById('modal-fav-btn');
        const wordId = parseInt(btn.dataset.wordId);
        if (Storage.isFavorite(wordId)) {
            Storage.removeFavorite(wordId);
            btn.textContent = '☆ 收藏';
            toast('已取消收藏');
        } else {
            Storage.addFavorite(wordId);
            btn.textContent = '⭐ 已收藏';
            toast('已收藏');
        }
        this.renderFavorites();
        this.updateFavoriteBtn(wordId);
    },

    nextLearnWord() {
        this.currentLearnIndex++;
        if (this.currentLearnIndex < this.learnQueue.length) {
            this.showLearnWord(this.learnQueue[this.currentLearnIndex]);
        } else {
            this.learnQueue = LearningEngine.getRandomUnlearnedWord(this.currentCategory);
            this.currentLearnIndex = 0;
            if (this.learnQueue.length > 0) {
                this.showLearnWord(this.learnQueue[0]);
            } else {
                document.getElementById('word-english').textContent = '🎉';
                document.getElementById('word-phonetic').textContent = '';
                document.getElementById('word-chinese').textContent = '太棒了！已学完当前词库';
                document.getElementById('word-example').textContent = '换个词库继续吧~';
                document.getElementById('word-image').textContent = '🎊';
            }
        }
    },

    nextReviewWord() {
        this.currentReviewIndex++;
        if (this.currentReviewIndex < this.reviewQueue.length) {
            this.showReviewWord(this.reviewQueue[this.currentReviewIndex]);
        } else {
            document.getElementById('page-review').querySelector('.learn-container').style.display = 'none';
            document.getElementById('review-empty').style.display = '';
            document.getElementById('review-progress').textContent = '待复习: 0 个';
            toast('🎉 复习完成！');
            Storage.checkinToday(0, this.reviewQueue.length);
        }
    }
};

function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.remove('show'), 2000);
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    const bottomEl = document.querySelector(`.bottom-nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');
    if (bottomEl) bottomEl.classList.add('active');

    const titles = { home: '首页', learn: '背单词', review: '复习', wordlist: '词库', favorites: '收藏', errors: '错题本', stats: '统计' };
    document.getElementById('page-title').textContent = titles[page] || page;

    UI.refreshAll();
}

function answerWord(answer) {
    if (!UI.currentLearnWord) return;
    const wordId = UI.currentLearnWord.id;
    LearningEngine.answerWord(wordId, answer);
    Storage.checkinToday(1, 0);
    UI.nextLearnWord();
    UI.renderHome();
    UI.updateBadges();
    const msgs = { forgot: '已加入错题本，继续加油！', vague: '不太熟，下次再来~', remember: '很棒！继续前进！' };
    toast(msgs[answer] || '');
}

function reviewAnswer(answer) {
    if (UI.reviewQueue.length === 0 || !UI.reviewQueue[UI.currentReviewIndex]) return;
    const wordId = UI.reviewQueue[UI.currentReviewIndex].id;
    LearningEngine.answerWord(wordId, answer);
    UI.nextReviewWord();
    UI.renderHome();
    UI.updateBadges();
    const msgs = { forgot: '忘记了，重新记忆~', vague: '有点模糊，再复习~', remember: '记得很好！' };
    toast(msgs[answer] || '');
}

function toggleFavorite() {
    if (!UI.currentLearnWord) return;
    const wordId = UI.currentLearnWord.id;
    if (Storage.isFavorite(wordId)) {
        Storage.removeFavorite(wordId);
        toast('已取消收藏');
    } else {
        Storage.addFavorite(wordId);
        toast('已收藏 ⭐');
    }
    UI.updateFavoriteBtn(wordId);
    UI.renderFavorites();
}

function toggleFavoriteById(wordId) {
    if (Storage.isFavorite(wordId)) {
        Storage.removeFavorite(wordId);
    } else {
        Storage.addFavorite(wordId);
    }
    UI.renderFavorites();
    UI.renderWordList(document.getElementById('word-search').value);
}

function markAsMastered() {
    if (!UI.currentLearnWord) return;
    const wordId = UI.currentLearnWord.id;
    LearningEngine.answerWord(wordId, 'remember');
    toast('已标记为掌握 ✅');
    UI.nextLearnWord();
    UI.renderHome();
    UI.renderStats();
}

function clearErrorBook() {
    if (confirm('确定要清空错题本吗？此操作不可撤销。')) {
        Storage.clearErrors();
        UI.renderErrors();
        toast('错题本已清空');
    }
}
