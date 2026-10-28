//内置金句庫
let quoteList = [
    "今日嘅努力，係為了明日更好嘅自己！💪",
    "一步一步嚟，最緊要係唔好停落嚟。👣",
    "做完好過做完美，先完成，再完美！✨",
    "休息係為了走更遠嘅路，加油！☕",
    "每日進步 1%，一年後你就進步 37 倍！📈",
    "不怕慢，只怕站；堅持係最酷嘅事！🔥",
    "相信自己，你遠比想像中更強大。🌟",
    "不必完美，只要開始。🚀",
    "再小的習慣，乘以 365 天都會變成奇蹟。🌱",
    "給自己 5 分鐘，完成今天的小承諾。⏱️",
    "別讓昨天的猶豫，耽誤了今天的自己。⏳",
    "自律，即自由。🔓",
    "莫等明天，就趁現在。⚡",
    "積跬步，以至千里。🛤️",
    "每天一點點，改變大不同。🌈",
    "今天的努力，是明天自信的來源。💡",
    "習慣已成自然，你正在重新定義自己。🦋",
    "時間會證明，你的堅持絕不白費。⏰"
];

// 全局變數 
let userGoals = [];
let checkInRecords = {};
let confirmActionType = '';
let targetDeleteId = null;
let loggedInUser = null;
let authMode = 'login';
let timerId = null;
let defaultTimerSecs = 25 * 60;
let currentTimerSecs = defaultTimerSecs;
let viewMode = 'week';
//*********************************
//輔助函數區
//*********************************

//取得完成率，例如"75%"
function formatRate(done, total) {
    if (total <= 0) return '0%';
    return Math.round(done / total * 100) + '%';
}



//*********************************
//核心邏輯區
//*********************************

function getUsers() {
    try {
        let raw = localStorage.getItem('habitUsers');
        if (raw) return JSON.parse(raw) || [];
    } catch (error) { return []; }
}

//登入/註冊：將用戶列表寫入localStorage
function saveUsers(list) {
    try {
        localStorage.setItem('habitUsers', JSON.stringify(list));
    } catch (error) { showAuthError('帳戶儲存失敗：' + error.message); }
}

function goalsKey() { return 'habitGoals_' + loggedInUser; }
function quotesKey() { return 'habitQuotes_' + loggedInUser; }
function recordsKey() { return 'habitRecords_' + loggedInUser; }


function pad2(n) {
    if (n < 10) return '0' + n;
    return '' + n;
}

//全域工具：格式控制
function dateKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

function getWeekDates() {
    let base = new Date();
    let day = base.getDay();
    let diff = 1 - day;
    if (day === 0) diff = -6;

    let monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff);
    let days = [];
    for (let i = 0; i < 7; i++) {
        days.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
    }
    return days;
}

//全域工具：防止 XSS
function escapeHtml(text) {
    let s = '' + text;
    let result = '';
    for (let i = 0; i < s.length; i++) {
        let ch = s.charAt(i);
        if (ch === '<') result += '&lt;';
        else if (ch === '>') result += '&gt;';
        else if (ch === '&') result += '&amp;';
        else if (ch === '"') result += '&quot;';
        else result += ch;
    }
    return result;
}

//登入後載入：從localStorage 讀取目標、打卡記錄與自定義金句
function loadData() {
    try {
        let rawGoals = localStorage.getItem(goalsKey());
        if (rawGoals) {
            let storedGoals = JSON.parse(rawGoals);
            if (storedGoals) userGoals = storedGoals;
        }
    } catch (error) { userGoals = []; showTip('目標讀取失敗'); }

    try {
        let rawRecords = localStorage.getItem(recordsKey());
        if (rawRecords) {
            let storedRecords = JSON.parse(rawRecords);
            if (storedRecords) checkInRecords = storedRecords;
        }
    } catch (error) { checkInRecords = {}; showTip('記錄讀取失敗'); }

    try {
        let rawQuotes = localStorage.getItem(quotesKey());
        if (rawQuotes) {
            let storedQuotes = JSON.parse(rawQuotes);
            if (storedQuotes && storedQuotes.length > 0) {
                quoteList = storedQuotes;
            }
        }
    } catch (error) {
        console.log('金句讀取失敗', error);
    }
}

//目標管理：儲存目標列表到localStorage
function saveGoals() { localStorage.setItem(goalsKey(), JSON.stringify(userGoals)); }

function saveRecords() { localStorage.setItem(recordsKey(), JSON.stringify(checkInRecords)); }

//登入後載入：去除打卡記錄中重複的日期
function dedupeRecords() {
    Object.keys(checkInRecords).forEach(id => {
        if (Array.isArray(checkInRecords[id])) {
            checkInRecords[id] = [...new Set(checkInRecords[id])];
        }
    });
    saveRecords();
}

function showTip(text) {
    let toast = document.getElementById('tipToast');
    toast.message = text;
    toast.isOpen = true;
}

//全域確認視窗：開啟confirmAlert確認對話框
function openConfirm(title, message) {
    let alert = document.getElementById('confirmAlert');
    alert.header = title;
    alert.message = message;
    alert.buttons = [{ text: '取消', role: 'cancel' }, { text: '確定', role: 'confirm' }];
    alert.isOpen = true;
}

function showAuthError(text) { document.getElementById('authError').innerText = text; }

function clearAuthError() { document.getElementById('authError').innerText = ''; }

//登入/註冊：切換登入與註冊模式（Tab、標題、按鈕、確認密碼欄）
function switchAuthMode(mode) {
    authMode = mode;
    let tabLogin = document.getElementById('tabLogin');
    let tabRegister = document.getElementById('tabRegister');
    let confirmPwItem = document.getElementById('confirmPwItem');
    let title = document.getElementById('authPageTitle');
    let btn = document.getElementById('authSubmitBtn');

    if (mode === 'register') {
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
        confirmPwItem.style.display = 'block';
        title.innerText = '開個新帳戶啦!!';
        btn.innerText = '註冊';
    } else {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        confirmPwItem.style.display = 'none';
        title.innerText = '歡迎你返嚟呀!!';
        btn.innerText = '登入';
    }
    clearAuthError();
}

//登入/註冊：處理註冊流程（驗證+儲存用戶）
function handleRegisterSubmit() {
    let email = document.getElementById('authEmailInput').value.trim();
    let password = document.getElementById('authPwInput').value;
    let confirm = document.getElementById('authConfirmInput').value;
    clearAuthError();

    if (!email || !password || !confirm) return showAuthError('所有欄位都要填寫');
    if (email.indexOf('@') === -1 || email.indexOf('.') === -1) return showAuthError('電郵格式唔正確');
    if (password.length < 6) return showAuthError('密碼最少要 6 個字');
    if (password !== confirm) return showAuthError('兩次輸入嘅密碼唔一致');

    let users = getUsers();
    if (users.find(u => u.email === email)) return showAuthError('呢個電郵已經註冊咗');

    users.push({ email: email, password: password });
    saveUsers(users);
    showTip('註冊成功，請登入');

    document.getElementById('authEmailInput').value = email;

    switchAuthMode('login');

    document.getElementById('authPwInput').value = '';
    document.getElementById('authConfirmInput').value = '';

    setTimeout(() => {
        document.getElementById('authPwInput').setFocus();
    }, 300);
}

//登入/註冊：處理登入流程（驗證帳密、設定登入狀態、進入主畫面）
function handleLoginSubmit() {
    let email = document.getElementById('authEmailInput').value.trim();
    let password = document.getElementById('authPwInput').value;
    clearAuthError();

    if (!email || !password) return showAuthError('請填寫電郵同密碼');
    let users = getUsers();
    let user = users.find(u => u.email === email);
    if (!user) return showAuthError('電郵未註冊');
    if (user.password !== password) return showAuthError('密碼唔正確');

    loggedInUser = email;
    localStorage.setItem('habitLoggedIn', loggedInUser);
    document.getElementById('authEmailInput').value = '';
    document.getElementById('authPwInput').value = '';
    showMainScreen();
    showTip('歡迎返嚟：' + loggedInUser);
}

//帳戶資料：處理登出（清除登入狀態與記憶體資料、回到登入頁）
function logout() {
    loggedInUser = null;
    localStorage.removeItem('habitLoggedIn');
    userGoals = []; checkInRecords = {};
    document.getElementById('mainSegment').value = 'tabGoalPage';
    showPage('tabGoalPage');
    switchAuthMode('login');
    showAuthScreen();
    showTip('已登出');
}

//登入/註冊：顯示登入頁並隱藏主畫面與 Header
function showAuthScreen() {
    document.getElementById('appHeader').style.display = 'none';
    document.getElementById('appMainPage').style.display = 'none';
    document.getElementById('authPage').style.display = 'block';
}

//登入/註冊：顯示主畫面、載入資料、渲染全部內容並顯示隨機金句
function showMainScreen() {
    document.getElementById('appHeader').style.display = 'block';
    document.getElementById('authPage').style.display = 'none';
    document.getElementById('appMainPage').style.display = 'block';
    loadData();
    dedupeRecords();
    renderAll();
    displayRandomQuote();
}

//登入/註冊：初始化登入狀態，依localStorage 決定顯示登入頁或主畫面
function initAuth() {
    let saved = localStorage.getItem('habitLoggedIn');
    if (saved) loggedInUser = saved;
    if (loggedInUser) showMainScreen();
    else showAuthScreen();
}

//主程式導航：切換目標管理／每日打卡／帳戶資料頁面並觸發對應渲染
function showPage(pageId) {
    let pages = ['tabGoalPage', 'tabCheckInPage', 'tabAccountPage'];
    pages.forEach(p => {
        if (p === pageId) {
            document.getElementById(p).style.display = 'block';
        } else {
            document.getElementById(p).style.display = 'none';
        }
    });
    if (pageId === 'tabCheckInPage') renderDailyCheckIn();
    if (pageId === 'tabAccountPage') renderAccount();
}

function addCustomQuote() {
    let input = document.getElementById('customQuoteInput');
    let text = input.value.trim();

    if (!text) return showTip('請輸入金句內容');
    if (quoteList.includes(text)) return showTip('已經有呢句金句啦');

    quoteList.push(text);

    try {
        localStorage.setItem(quotesKey(), JSON.stringify(quoteList));
    } catch (error) {
        showTip('儲存失敗：' + error.message);
    }

    input.value = '';
    showTip('金句已加入！');
    displayRandomQuote();
}

//目標管理（新增目標）：驗證並新增目標，儲存後重新渲染
function addGoal() {
    let name = document.getElementById('goalNameInput').value.trim();
    let category = document.getElementById('goalCategorySelect').value;

    if (!name) return showTip('請輸入目標名稱');
    if (userGoals.find(g => g.name === name)) return showTip('已經有同名嘅目標啦');

    userGoals.push({ id: Date.now(), name: name, category: category });
    saveGoals();

    document.getElementById('goalNameInput').value = '';
    renderAll();
    showTip('已新增：' + name);
    document.getElementById('addGoalModal').dismiss();
}

//每日打卡／目標管理：切換指定目標某日期的打卡狀態，並檢查是否全部完成
//完成後若今日全部目標達標，會彈出祝賀Alert
function toggleTaskDone(goalId, key, checked) {
    if (key > dateKey(new Date())) return showTip('未到嘅日子唔可以打卡');

    let done = checkInRecords[goalId] || [];
    let index = done.indexOf(key);

    if (checked === true) {
        if (index === -1) {
            done.push(key);
        } else {
            return; //已存在，唔重複寫入
        }
    } else if (checked === false) {
        if (index !== -1) {
            done.splice(index, 1);
        } else {
            return; //本來就無，唔做任何事
        }
    } else {
        //向後兼容：無傳 checked 時沿用舊 toggle 行為
        if (index === -1) {
            done.push(key);
        } else {
            done.splice(index, 1);
        }
    }

    checkInRecords[goalId] = done;
    saveRecords();
    renderAll();

    let todayKey = dateKey(new Date());
    let totalGoals = userGoals.length;
    let todayDoneCount = 0;

    for (let i = 0; i < totalGoals; i++) {
        let recs = checkInRecords[userGoals[i].id] || [];
        if (recs.includes(todayKey)) {
            todayDoneCount++;
        }
    }

    if (totalGoals > 0 && todayDoneCount === totalGoals) {
        playApplause();
        const randomIndex = Math.floor(Math.random() * quoteList.length);
        const quote = quoteList[randomIndex];
        const streak = calculateStreak();

        let alert = document.createElement('ion-alert');
        alert.header = '🎉 任務全部完成！';
        alert.message = `太犀利啦！你今日完成咗所有目標！\n\n✨ 送你一句金句：\n「${quote}」`;
        alert.buttons = [
            {
                text: '稍後再說',
                role: 'cancel'
            },
            {
                text: '📋 複製文字',
                handler: () => {
                    copyToClipboard(todayDoneCount, streak, quote);
                }
            },
            {
                text: '📸 生成分享卡',
                handler: () => {
                    createShareImage(todayDoneCount, quote);
                }
            }
        ];
        document.body.appendChild(alert);
        alert.addEventListener('didDismiss', () => {
            alert.remove();
        });
        alert.present();
    }
}

function getGoalNameById(id) {
    let g = userGoals.find(g => g.id === id);
    if (g) return g.name;
    return '';
}


function deleteGoal(id) {
    userGoals = userGoals.filter(g => g.id !== id);
    delete checkInRecords[id];
    saveGoals(); saveRecords(); renderAll();
}

//危險動作
function clearAllData() {
    userGoals = []; checkInRecords = {};
    saveGoals(); saveRecords(); renderAll();
    showTip('已清除所有資料');
}

//目標管理（統計面板）：計算並渲染目標總數、今日完成數、本日與本週完成率
function renderDashboardStats() {
    let todayKey = dateKey(new Date());
    let week = getWeekDates();
    let weekStart = dateKey(week[0]);
    let weekEnd = dateKey(week[6]);

    let todayDone = 0;
    let totalGoals = userGoals.length;
    let weekDone = 0;

    for (let i = 0; i < totalGoals; i++) {
        let done = checkInRecords[userGoals[i].id] || [];

        if (done.includes(todayKey)) {
            todayDone++;
        }

        for (let k = 0; k < done.length; k++) {
            if (done[k] >= weekStart && done[k] <= weekEnd) {
                weekDone++;
            }
        }
    }

    let todayRateStr = formatRate(todayDone, totalGoals);
    let weekTotalChances = totalGoals * 7;
    let weekRateStr = formatRate(weekDone, weekTotalChances);

    document.getElementById('statTotalGoals').innerText = totalGoals;
    document.getElementById('statTodayDone').innerText = todayDone;
    document.getElementById('statTodayRate').innerText = todayRateStr;
    document.getElementById('statWeekRate').innerText = weekRateStr;
}

//目標管理：依週／月模式渲染目標清單、週日期列與月進度長條圖
function renderGoalList() {
    let monthBar = document.getElementById('monthSummaryBar');
    let weekBar = document.getElementById('weekProgressBar');

    if (viewMode === 'month') {
        weekBar.style.display = 'none';
        monthBar.style.display = 'block';

        let now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth();
        let daysPassed = now.getDate(); //本月已過天數（含今天）
        let totalChances = userGoals.length * daysPassed;
        let doneCount = 0;

        userGoals.forEach(g => {
            let recs = checkInRecords[g.id] || [];
            for (let d = 1; d <= daysPassed; d++) {
                if (recs.includes(dateKey(new Date(year, month, d)))) doneCount++;
            }
        });

        let rate = 0;
        if (totalChances > 0) {
            rate = Math.round(doneCount / totalChances * 100);
        } 
        monthBar.innerText = `本月完成 ${doneCount}/${totalChances} 次（${rate}%）`;

        //每個目標一條長條圖
        let html = '';
        userGoals.forEach(goal => {
            let done = checkInRecords[goal.id] || [];
            let goalDone = 0;
            for (let d = 1; d <= daysPassed; d++) {
                if (done.includes(dateKey(new Date(year, month, d)))) goalDone++;
            }
            let goalRate = 0;
            if (daysPassed > 0) {
                goalRate = Math.round(goalDone / daysPassed * 100);
            }
            html += `
            <div class="goal-item-card">
                <div class="goal-card-header">
                    <span class="goal-name">${escapeHtml(goal.name)}</span>
                    <span class="goal-category-tag">${goal.category}</span>
                </div>
                <div class="month-bar-wrap">
                    <div class="month-bar-track">
                        <div class="month-bar-fill" style="width: ${goalRate}%;"></div>
                    </div>
                    <div class="month-bar-label">
                        <span>本月進度</span>
                        <span><b>${goalDone}/${daysPassed}</b>（${goalRate}%）</span>
                    </div>
                </div>
            </div>
        `;
        });

        document.getElementById('goalListContainer').innerHTML = html;
        return;
    }

    weekBar.style.display = 'flex';
    monthBar.style.display = 'none';
    let container = document.getElementById('goalListContainer');
    let dateBar = document.getElementById('weekProgressBar');
    let keyword = document.getElementById('searchInput').value;
    let filter = document.getElementById('filterSelect').value;
    let todayKey = dateKey(new Date());
    let week = getWeekDates();
    let weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    document.getElementById('displayTodayLabel').innerText = new Date().getFullYear() + '年 ' + (new Date().getMonth() + 1) + '月';

    let dateHtml = '';
    for (let i = 0; i < 7; i++) {
        let d = week[i];
        let key = dateKey(d);
        let isToday = (key === todayKey);
        let tickHtml = '';

        let dayDoneCount = 0;
        let totalGoals = userGoals.length;
        for (let g = 0; g < userGoals.length; g++) {
            let recs = checkInRecords[userGoals[g].id] || [];
            if (recs.includes(key)) dayDoneCount++;
        }

        if (totalGoals > 0 && dayDoneCount === totalGoals) {
            tickHtml = '<ion-icon name="checkmark-circle"></ion-icon>';
        }

        let textStyle = '';
        let numStyle = '';
        if (isToday) {
            textStyle = 'color:var(--primary-color);font-weight:bold;';
            numStyle = 'color:var(--primary-color);';
        }

        dateHtml += `
            <div class="checkin-date-item">
                <span class="checkin-date-text" style="${textStyle}">${weekDays[d.getDay()]}</span>
                <span class="checkin-date-num" style="${numStyle}">${d.getDate()}</span>
                <div class="checkin-date-tick">${tickHtml}</div>
            </div>
        `;
    }
    dateBar.innerHTML = dateHtml;

    if (userGoals.length === 0) {
        container.innerHTML = '<div class="empty-state-msg">暫時未有目標，快啲點擊右下角新增一個啦！</div>';
        return;
    }

    let html = '';
    let shown = 0;

    for (let i = 0; i < userGoals.length; i++) {
        let goal = userGoals[i];
        if (keyword && !goal.name.includes(keyword)) continue;
        if (filter !== 'all' && goal.category !== filter) continue;
        shown++;

        let done = checkInRecords[goal.id] || [];
        let cells = '';

        for (let d = 0; d < 7; d++) {
            let key = dateKey(week[d]);
            let isDone = done.includes(key);
            let isFuture = key > todayKey;

            let cls = 'progress-cell';
            if (isDone) cls += ' is-done';
            if (isFuture) cls += ' is-future';

            let mark = '';
            if (isDone) mark = '✓';

            cells += `<div class="${cls}">${mark}</div>`;
        }

        html += `
            <div class="goal-item-card">
                <div class="goal-card-header">
                    <span class="goal-name">${escapeHtml(goal.name)}</span>
                    <span class="goal-category-tag">${goal.category}</span>
                    <ion-button size="small" class="delete-btn" data-goal="${goal.id}" fill="clear">刪除</ion-button>
                </div>
                <div class="goal-week-progress">${cells}</div>
            </div>
        `;
    }

    if (shown === 0) {
        container.innerHTML = '<div class="empty-state-msg">搵唔到符合條件嘅目標。</div>';
    } else {
        container.innerHTML = html;
    }
}

//每日打卡：渲染今日打卡清單（checkbox 與完成狀態）
function renderDailyCheckIn() {
    let container = document.getElementById('checkInListContainer');
    let todayKey = dateKey(new Date());

    if (userGoals.length === 0) {
        container.innerHTML = '<div class="empty-state-msg">仲未有目標，去「目標管理」加返先啦！</div>';
        return;
    }

    let html = '';
    for (let i = 0; i < userGoals.length; i++) {
        let goal = userGoals[i];
        let done = checkInRecords[goal.id] || [];
        let isDone = done.includes(todayKey);

        let itemClass = '';
        let checkedAttr = '';
        if (isDone) {
            itemClass = 'is-done';
            checkedAttr = 'checked';
        }

        html += `
            <div class="checkin-task-item ${itemClass}" style="padding: 12px;">
                <ion-checkbox 
                    justify="start" 
                    label-placement="end" 
                    ${checkedAttr} 
                    class="task-checkbox" 
                    data-goal="${goal.id}">
                    <ion-label style="margin-left: 10px;">${escapeHtml(goal.name)}</ion-label>
                </ion-checkbox>
            </div>
        `;
    }
    container.innerHTML = html;
}


function renderAccount() {
    document.getElementById('accountEmailDisplay').innerText = loggedInUser || '（未登入）';
    let totalChecks = 0;
    userGoals.forEach(g => { totalChecks += (checkInRecords[g.id] || []).length; });
    document.getElementById('accountStatsDisplay').innerText = '目標總數：' + userGoals.length + ' 個 | 累積打卡：' + totalChecks + ' 次';
}

//主程式：一次渲染統計面板、目標清單與每日打卡清單
function renderAll() {
    renderDashboardStats();
    renderGoalList();
    renderDailyCheckIn();
}

//全域初始化：頁面載入後綁定所有事件監聽並初始化登入狀態
window.addEventListener('load', function () {
    document.getElementById('tabLogin').addEventListener('click', () => switchAuthMode('login'));
    document.getElementById('tabRegister').addEventListener('click', () => switchAuthMode('register'));
    document.getElementById('addQuoteBtn').addEventListener('click', addCustomQuote);
    document.getElementById('viewModeSegment').addEventListener('ionChange', function (event) {
        viewMode = event.detail.value;
        renderGoalList();
    });
    document.getElementById('authSubmitBtn').addEventListener('click', () => {
        if (authMode === 'register') handleRegisterSubmit();
        else handleLoginSubmit();
    });

    document.getElementById('googleLoginBtn').addEventListener('click', () => {
        showTip('🔧 Google 登入功能測試中，敬請期待！');
    });

    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.getElementById('mainSegment').addEventListener('ionChange', function (event) {
        showPage(event.detail.value);
    });

    document.getElementById('confirmAddGoalBtn').addEventListener('click', addGoal);
    document.getElementById('searchInput').addEventListener('ionInput', renderGoalList);
    document.getElementById('filterSelect').addEventListener('ionChange', renderGoalList);

    document.getElementById('closeAddModalBtn').addEventListener('click', () => document.getElementById('addGoalModal').dismiss());
    document.getElementById('closeTimerModalBtn').addEventListener('click', () => document.getElementById('timerModal').dismiss());

    document.getElementById('goalListContainer').addEventListener('click', function (event) {
        if (event.target.classList.contains('delete-btn')) {
            let id = parseInt(event.target.getAttribute('data-goal'));
            confirmActionType = 'delete';
            targetDeleteId = id;
            openConfirm('確認刪除', '確定要刪除「' + escapeHtml(getGoalNameById(id)) + '」同佢嘅所有打卡記錄嗎？');
            return;
        }
    });

    document.getElementById('checkInListContainer').addEventListener('ionChange', function (event) {
        if (event.target.classList.contains('task-checkbox')) {
            let id = parseInt(event.target.getAttribute('data-goal'));
            let checked = event.detail.checked;
            toggleTaskDone(id, dateKey(new Date()), checked);
        }
    });
    document.getElementById('clearAllDataBtn').addEventListener('click', function () {
        confirmActionType = 'clearAll';
        openConfirm('確認清除', '確定要清除所有目標同打卡記錄嗎？');
    });

    let confirmAlert = document.getElementById('confirmAlert');
    confirmAlert.addEventListener('didDismiss', function (event) {
        confirmAlert.isOpen = false;
        if (event.detail.role === 'confirm') {
            if (confirmActionType === 'delete') deleteGoal(targetDeleteId);
            else if (confirmActionType === 'clearAll') clearAllData();
        }
        confirmActionType = '';
        targetDeleteId = null;
    });

    let tipToast = document.getElementById('tipToast');
    tipToast.addEventListener('didDismiss', () => tipToast.isOpen = false);

    initAuth();
});

//登入/註冊：從金句庫隨機抽一句顯示在登入頁
function displayRandomQuote() {
    const quoteElement = document.querySelector('.login-quote');
    if (!quoteElement) return;
    const randomIndex = Math.floor(Math.random() * quoteList.length);
    quoteElement.innerText = quoteList[randomIndex];
}
displayRandomQuote();

// 番茄鐘邏輯 
//番茄鐘：套用預設分鐘數（25 或 5 分鐘）並更新計時器
function setTimerPreset(mins) {
    document.getElementById('timerInput').value = mins;
    applyCustomTime();
}

//番茄鐘：套用自訂輸入的分鐘數，重設計時器
function applyCustomTime() {
    pauseTimer();
    const minsInput = parseInt(document.getElementById('timerInput').value) || 1;
    defaultTimerSecs = minsInput * 60;
    currentTimerSecs = defaultTimerSecs;
    updateDisplay();
}

function startTimer() {
    if (timerId !== null || currentTimerSecs <= 0) return;
    timerId = setInterval(() => {
        currentTimerSecs--;
        updateDisplay();
        if (currentTimerSecs <= 0) {
            clearInterval(timerId);
            timerId = null;
            onTimerFinished();
        }
    }, 1000);
}

function pauseTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
        updateDisplay();
    }
}

function resetTimer() {
    pauseTimer();
    currentTimerSecs = defaultTimerSecs;
    updateDisplay();
}

//番茄鐘：計時結束時播放提示音並跳出「時間到」提示
function onTimerFinished() {
    playBeep();

    let timerAlert = document.createElement('ion-alert');
    timerAlert.header = '🎉 時間到！';
    timerAlert.message = '休息一下吧！做個深呼吸，飲杯水再繼續。';
    timerAlert.buttons = [
        {
            text: '知道',
            role: 'confirm'
        }
    ];

    document.body.appendChild(timerAlert);

    timerAlert.addEventListener('didDismiss', () => {
        timerAlert.remove();
    });

    timerAlert.present();
}


function playBeep() {
    const audio = new Audio('timer_audio.mp3');
    audio.currentTime = 0;
    audio.volume = 0.8;
    audio.play().catch(error => console.error("播放失敗", error));
}

function playApplause() {
    const audio = new Audio('applause_audio.mp3');
    audio.currentTime = 0;
    audio.volume = 0.8;
    audio.play().catch(error => console.error("掌聲播放失敗", error));
}

function updateDisplay() {
    const mins = Math.floor(currentTimerSecs / 60);
    const secs = currentTimerSecs % 60;
    const displayEl = document.getElementById('timerDisplay');
    if (displayEl) {
        displayEl.innerText = `${pad2(mins)}:${pad2(secs)}`;
    }
}

// 分享卡片 (Canvas 與 API) 

//分享卡片：計算連續全部目標達成的天數（連續打卡天數）
function calculateStreak() {
    let streak = 0;
    let today = new Date();
    let checkDate = new Date(today);

    let todayKey = dateKey(today);
    let isTodayDone = userGoals.length > 0 && userGoals.every(g => (checkInRecords[g.id] || []).includes(todayKey));

    if (!isTodayDone) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
        let key = dateKey(checkDate);
        let isAllDone = userGoals.length > 0 && userGoals.every(g => (checkInRecords[g.id] || []).includes(key));

        if (isAllDone) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

//分享卡片：用 Canvas 繪製成就分享卡並開啟預覽 Modal
//固定 1080x1920 直式畫布不要改動
function createShareImage(todayDoneCount, quote) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    //1. 畫背景漸層 (夢幻粉紫漸變)
    let gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#E0C3FC'); //淺紫
    gradient.addColorStop(0.5, '#F2D1F9'); //粉紫
    gradient.addColorStop(1, '#C2E9FB'); //夢幻藍
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //2. 畫裝飾性圓框
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 550, 260, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 10;
    ctx.stroke();

    //3. 畫獎盃
    let trophyGradient = ctx.createLinearGradient(440, 450, 640, 650);
    trophyGradient.addColorStop(0, '#A78BFA');
    trophyGradient.addColorStop(1, '#818CF8');
    ctx.fillStyle = trophyGradient;

    ctx.beginPath();
    ctx.moveTo(460, 450);
    ctx.lineTo(620, 450);
    ctx.quadraticCurveTo(620, 620, 540, 620);
    ctx.quadraticCurveTo(460, 620, 460, 450);
    ctx.fill();

    ctx.fillRect(515, 620, 50, 35);
    ctx.fillRect(470, 655, 140, 25);

    ctx.font = 'bold 70px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', 540, 560);

    //4. 畫文字資訊
    ctx.textAlign = 'center';

    let streak = calculateStreak();

    //標題
    ctx.fillStyle = '#4C1D95';
    ctx.font = 'bold 60px "Microsoft JhengHei", sans-serif';
    ctx.fillText('我的堅持紀錄', 540, 900);

    //天數
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(167, 139, 250, 0.8)';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 160px "Microsoft JhengHei", sans-serif';
    ctx.fillText(`${streak} 天`, 540, 1080);
    ctx.shadowBlur = 0;

    //副標題
    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 50px "Microsoft JhengHei", sans-serif';
    ctx.fillText(`已連續打卡`, 540, 1160);

    //完成任務數
    ctx.fillStyle = '#4C1D95';
    ctx.font = 'bold 45px "Microsoft JhengHei", sans-serif';
    ctx.fillText(`我已完成今天的 ${todayDoneCount} 個任務！`, 540, 1280);

    //金句
    ctx.fillStyle = '#4C1D95';
    ctx.font = 'italic 40px "Microsoft JhengHei", sans-serif';
    wrapCanvasText(ctx, `「${quote}」`, 540, 1400, 800, 55);

    //底部標語
    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 40px "Microsoft JhengHei", sans-serif';
    ctx.fillText('你也一起來用人生管理器吧！', 540, 1620);

    //底部品牌名
    ctx.fillStyle = 'rgba(76, 29, 149, 0.6)';
    ctx.font = '35px Arial';
    ctx.fillText('Life Manager App', 540, 1700);

    //5. 轉成圖片並顯示
    let dataUrl = canvas.toDataURL('image/png');
    document.getElementById('shareImagePreview').src = dataUrl;

    //將圖片存入臨時變數供下載/分享使用
    window.currentShareDataUrl = dataUrl;

    //彈出預覽 Modal
    document.getElementById('shareModal').present();
}

//分享卡片：在 Canvas 上將文字依最大寬度自動換行繪製
function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
    let words = text.split('');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n];
        let metrics = context.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = words[n];
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}

//分享卡片（關閉）：關閉分享卡片預覽 Modal
document.getElementById('closeShareModalBtn').addEventListener('click', () => {
    document.getElementById('shareModal').dismiss();
});

//分享卡片（儲存圖片）：將分享卡片下載為 PNG 檔
document.getElementById('downloadShareBtn').addEventListener('click', () => {
    let a = document.createElement('a');
    a.href = window.currentShareDataUrl;
    a.download = 'my_achievement.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

//分享卡片（直接分享）：使用 Web Share API 分享分享卡片圖片
document.getElementById('directShareBtn').addEventListener('click', async () => {
    try {
        let res = await fetch(window.currentShareDataUrl);
        let blob = await res.blob();
        let file = new File([blob], 'achievement.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: '我的打卡成就',
                text: '我喺「人生管理器」完成咗今日嘅任務，一起嚟挑戰啦！'
            });
        } else {
            showTip('你的瀏覽器不支援直接分享，請長按圖片儲存。');
        }
    } catch (error) {
        console.error('分享失敗', error);
        showTip('分享取消或失敗');
    }
});

//分享卡片（複製文字）：將戰報文字複製到剪貼簿,失敗會退回
function copyToClipboard(todayDoneCount, streak, quote) {
    let textToCopy = `🏆 我的堅持紀錄 🏆\n\n`;
    textToCopy += `🔥 我已完成今天的 ${todayDoneCount} 個任務！\n`;
    textToCopy += `✨ 我已經連續打卡 ${streak} 天！\n\n`;
    textToCopy += `💬 今日金句：\n「${quote}」\n\n`;
    textToCopy += `你也一起來用人生管理器吧！👇\n#人生管理器 #習慣養成`;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showTip('✅ 戰報文字已複製！快啲去分享啦！');
        }).catch(err => {
            console.error('複製失敗', err);
            showTip('❌ 複製失敗，請稍後再試');
        });
    } else {
        let textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showTip('✅ 戰報文字已複製！');
        } catch (error) {
            console.error('Fallback 複製失敗', error);
            showTip('❌ 複製失敗');
        }
        textArea.remove();
    }
}