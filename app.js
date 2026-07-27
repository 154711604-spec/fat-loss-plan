// ===== 全局状态 =====
let appData = {
    user: {
        name: '减脂小达人',
        height: 165,
        weight: 60,
        targetLoss: 5,
        theme: 'cute'
    },
    weightRecords: [],
    todayMeals: {
        breakfast: null,
        lunch: null,
        dinner: null
    },
    todayExercises: [],
    checkins: {
        weight: 0,
        diet: 0,
        exercise: 0
    },
    currentDate: new Date()
};

// 从localStorage加载数据（优先主key，fallback到备份key）
function loadData() {
    let saved = localStorage.getItem('fatLossData');
    if (!saved) {
        saved = localStorage.getItem('fatLossData_bak');
    }
    if (saved) {
        try {
            appData = JSON.parse(saved);
            // 恢复日期对象
            appData.currentDate = new Date(appData.currentDate);
        } catch(e) {
            console.error('数据解析失败，使用默认数据');
        }
    }
}

// 保存数据到localStorage（双key冗余备份 + 同步写入）
function saveData() {
    const jsonStr = JSON.stringify(appData);
    try {
        localStorage.setItem('fatLossData', jsonStr);
        localStorage.setItem('fatLossData_bak', jsonStr);
    } catch(e) {
        console.error('保存数据失败:', e);
    }
}

// 每次重要操作后强制保存
function forceSave() {
    saveData();
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDateDisplay();
    initTheme();
    initNavigation();
    initThemeSelection();
    renderPlanCalendar();
    updateHomePage();
    updateWeightPage();
    updateDietPage();
    updateExercisePage();
    updateSettingsPage();
});

// 更新日期显示
function updateDateDisplay() {
    const now = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
    document.getElementById('header-date').textContent = dateStr;

    // 更新时间
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.querySelector('.status-bar .time').textContent = `${hours}:${minutes}`;
}

// 每分钟更新时间
setInterval(updateDateDisplay, 60000);

// ===== 主题管理 =====
function initTheme() {
    document.documentElement.setAttribute('data-theme', appData.user.theme);
}

function initThemeSelection() {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            appData.user.theme = this.dataset.theme;
        });
    });
}

function changeTheme(theme) {
    appData.user.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.settings-theme .theme-option').forEach(o => {
        o.classList.toggle('active', o.dataset.theme === theme);
    });
    saveData();
}

// ===== 导航管理 =====
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            if (!page) return;

            // 更新导航状态
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');

            // 切换页面
            document.querySelectorAll('.content-page').forEach(p => p.classList.add('hidden'));
            document.getElementById(`page-${page}`).classList.remove('hidden');

            // 更新页面内容
            if (page === 'home') updateHomePage();
            if (page === 'weight') updateWeightPage();
            if (page === 'diet') updateDietPage();
            if (page === 'exercise') updateExercisePage();
        });
    });
}

// ===== 开始计划 =====
function startPlan() {
    const name = document.getElementById('user-name').value || '减脂小达人';
    const height = parseFloat(document.getElementById('user-height').value) || 165;
    const weight = parseFloat(document.getElementById('user-weight').value) || 60;
    const targetLoss = parseFloat(document.getElementById('target-loss').value) || 5;
    const theme = document.querySelector('.theme-option.active')?.dataset.theme || 'cute';

    appData.user = { name, height, weight, targetLoss, theme };
    appData.currentDate = new Date();

    // 初始化体重记录
    if (appData.weightRecords.length === 0) {
        appData.weightRecords.push({
            date: new Date().toISOString().split('T')[0],
            weight: weight
        });
    }

    saveData();
    initTheme();

    // 切换到主页面
    document.getElementById('welcome-page').classList.add('hidden');
    document.getElementById('main-page').classList.remove('hidden');

    updateHomePage();
    updateSettingsPage();
}

// ===== 更新首页 =====
function updateHomePage() {
    document.getElementById('header-name').textContent = appData.user.name;
    document.getElementById('current-weight').textContent = getLatestWeight();
    document.getElementById('target-weight').textContent = (appData.user.weight - appData.user.targetLoss).toFixed(1);

    // 计算剩余天数
    const startDate = new Date(appData.currentDate);
    const today = new Date();
    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, 30 - diffDays);
    document.getElementById('days-left').textContent = daysLeft;

    // 计算进度
    const latestWeight = getLatestWeight();
    const lost = appData.user.weight - latestWeight;
    const progress = Math.min(100, Math.max(0, (lost / appData.user.targetLoss) * 100));
    document.getElementById('progress-percent').textContent = `${Math.round(progress)}%`;

    // 更新进度环
    const circle = document.getElementById('progress-circle');
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    // 更新打卡连续天数
    document.getElementById('streak-weight').textContent = appData.checkins.weight;
    document.getElementById('streak-diet').textContent = appData.checkins.diet;
    document.getElementById('streak-exercise').textContent = appData.checkins.exercise;

    // 更新热量概览
    updateCalorieOverview();

    // 更新打卡进度
    updateCheckinProgress();
}

function getLatestWeight() {
    if (appData.weightRecords.length === 0) return appData.user.weight;
    return appData.weightRecords[appData.weightRecords.length - 1].weight;
}

function updateCalorieOverview() {
    let intake = 0;
    if (appData.todayMeals.breakfast) intake += appData.todayMeals.breakfast.cal;
    if (appData.todayMeals.lunch) intake += appData.todayMeals.lunch.cal;
    if (appData.todayMeals.dinner) intake += appData.todayMeals.dinner.cal;

    let burn = 0;
    appData.todayExercises.forEach(ex => burn += ex.calories);

    document.getElementById('intake-cal').textContent = intake;
    document.getElementById('burn-cal').textContent = burn;
    document.getElementById('net-cal').textContent = intake - burn;
}

function updateCheckinProgress() {
    let completed = 0;
    document.querySelectorAll('.check-item').forEach(item => {
        if (item.classList.contains('checked')) completed++;
    });
    document.getElementById('completed-count').textContent = completed;
    document.getElementById('daily-progress').style.width = `${(completed / 3) * 100}%`;
}

function toggleCheck(element) {
    element.classList.toggle('checked');
    updateCheckinProgress();

    // 更新连续打卡天数
    const text = element.querySelector('.check-text').textContent;
    if (element.classList.contains('checked')) {
        if (text.includes('体重')) appData.checkins.weight++;
        if (text.includes('饮食')) appData.checkins.diet++;
        if (text.includes('运动')) appData.checkins.exercise++;
    } else {
        if (text.includes('体重') && appData.checkins.weight > 0) appData.checkins.weight--;
        if (text.includes('饮食') && appData.checkins.diet > 0) appData.checkins.diet--;
        if (text.includes('运动') && appData.checkins.exercise > 0) appData.checkins.exercise--;
    }

    document.getElementById('streak-weight').textContent = appData.checkins.weight;
    document.getElementById('streak-diet').textContent = appData.checkins.diet;
    document.getElementById('streak-exercise').textContent = appData.checkins.exercise;

    saveData();
}

// ===== 体重记录 =====
function recordWeight() {
    const input = document.getElementById('today-weight');
    const weight = parseFloat(input.value);

    if (!weight || weight <= 0) {
        alert('请输入有效的体重数值');
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    // 检查今天是否已记录
    const existingIndex = appData.weightRecords.findIndex(r => r.date === today);
    if (existingIndex >= 0) {
        appData.weightRecords[existingIndex].weight = weight;
    } else {
        appData.weightRecords.push({ date: today, weight });
    }

    saveData();
    updateWeightPage();
    updateHomePage();
    input.value = '';

    // 自动勾选体重打卡
    const weightCheckItem = document.querySelector('.check-item:nth-child(1)');
    if (weightCheckItem && !weightCheckItem.classList.contains('checked')) {
        weightCheckItem.classList.add('checked');
        updateCheckinProgress();
    }
}

function updateWeightPage() {
    const compareDiv = document.getElementById('weight-compare');
    const historyDiv = document.getElementById('weight-history');

    if (appData.weightRecords.length === 0) {
        compareDiv.innerHTML = '<p>还没有记录哦，开始记录第一天吧！</p>';
        historyDiv.innerHTML = '';
        return;
    }

    // 显示与昨天的对比
    const latest = appData.weightRecords[appData.weightRecords.length - 1];
    if (appData.weightRecords.length >= 2) {
        const previous = appData.weightRecords[appData.weightRecords.length - 2];
        const diff = (latest.weight - previous.weight).toFixed(1);
        const isDown = diff < 0;
        const diffText = diff > 0 ? `+${diff}` : diff;
        const diffClass = isDown ? 'down' : 'up';
        const emoji = isDown ? '👏' : '💪';

        compareDiv.innerHTML = `
            <p>与昨天相比</p>
            <span class="compare-value ${diffClass}">${diffText} kg</span>
            <p>${emoji} ${isDown ? '太棒了！继续加油！' : '别气馁，坚持就是胜利！'}</p>
        `;
    } else {
        compareDiv.innerHTML = `
            <p>第一次记录</p>
            <span class="compare-value">${latest.weight} kg</span>
            <p>🌟 开启你的减脂之旅吧！</p>
        `;
    }

    // 显示历史记录
    historyDiv.innerHTML = appData.weightRecords.slice().reverse().map((record, index) => {
        let changeHtml = '';
        if (index < appData.weightRecords.length - 1) {
            const nextRecord = appData.weightRecords[appData.weightRecords.length - 2 - index];
            const change = (record.weight - nextRecord.weight).toFixed(1);
            const changeClass = change < 0 ? 'down' : 'up';
            const changeText = change > 0 ? `+${change}` : change;
            changeHtml = `<span class="record-change ${changeClass}">${changeText}</span>`;
        }

        return `
            <div class="weight-record">
                <span class="record-date">${record.date}</span>
                <span class="record-value">${record.weight} kg</span>
                ${changeHtml}
            </div>
        `;
    }).join('');

    // 更新图表
    updateWeightChart();
}

function updateWeightChart() {
    const chartDiv = document.getElementById('weight-chart');
    if (appData.weightRecords.length < 2) {
        chartDiv.innerHTML = `
            <div class="chart-placeholder">
                <span>📊</span>
                <p>记录体重后这里会显示趋势图</p>
            </div>
        `;
        return;
    }

    // 简单的SVG折线图
    const records = appData.weightRecords;
    const weights = records.map(r => r.weight);
    const minWeight = Math.min(...weights) - 1;
    const maxWeight = Math.max(...weights) + 1;
    const range = maxWeight - minWeight;

    const width = 300;
    const height = 150;
    const padding = 20;

    const points = records.map((r, i) => {
        const x = padding + (i / (records.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((r.weight - minWeight) / range) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    chartDiv.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:400px;margin:0 auto;display:block;">
            <polyline
                fill="none"
                stroke="var(--primary-color)"
                stroke-width="3"
                points="${points}"
            />
            ${records.map((r, i) => {
                const x = padding + (i / (records.length - 1)) * (width - 2 * padding);
                const y = height - padding - ((r.weight - minWeight) / range) * (height - 2 * padding);
                return `<circle cx="${x}" cy="${y}" r="5" fill="var(--primary-color)" stroke="white" stroke-width="2"/>
                        <text x="${x}" y="${y - 10}" text-anchor="middle" font-size="10" fill="var(--text-secondary)">${r.weight}</text>`;
            }).join('')}
        </svg>
    `;
}

// ===== 饮食管理 =====
function selectMeal(mealType, name, calories) {
    appData.todayMeals[mealType] = { name, cal: calories };
    saveData();
    updateDietPage();
    updateHomePage();

    // 自动勾选饮食打卡
    const dietCheckItem = document.querySelector('.check-item:nth-child(2)');
    if (dietCheckItem && !dietCheckItem.classList.contains('checked')) {
        dietCheckItem.classList.add('checked');
        updateCheckinProgress();
    }
}

function handlePhotoUpload(input, mealType) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const resultDiv = document.getElementById(`${mealType}-result`);
        // 模拟热量估算
        const estimatedCal = Math.floor(Math.random() * 300 + 200);

        resultDiv.innerHTML = `
            <img src="${e.target.result}" alt="${mealType}">
            <p class="estimated-cal">🤖 估算热量：约 ${estimatedCal} kcal</p>
            <p style="font-size:12px;color:var(--text-secondary);">（此为估算值，仅供参考）</p>
        `;

        // 添加到今日饮食
        appData.todayMeals[mealType] = {
            name: `上传的${mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐'}`,
            cal: estimatedCal
        };
        saveData();
        updateHomePage();
    };
    reader.readAsDataURL(file);
}

function updateDietPage() {
    // 更新已选状态
    document.querySelectorAll('.meal-item').forEach(item => {
        const btn = item.querySelector('.btn-select');
        const mealName = item.querySelector('.meal-name').textContent;

        let isSelected = false;
        Object.values(appData.todayMeals).forEach(meal => {
            if (meal && meal.name === mealName) isSelected = true;
        });

        if (isSelected) {
            btn.textContent = '已选';
            btn.style.background = 'var(--success-color)';
        } else {
            btn.textContent = '选这个';
            btn.style.background = '';
        }
    });
}

// ===== 运动打卡 =====
function selectExercise(name, calories) {
    appData.todayExercises.push({
        name,
        calories,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });
    saveData();
    updateExercisePage();
    updateHomePage();

    // 自动勾选运动打卡
    const exerciseCheckItem = document.querySelector('.check-item:nth-child(3)');
    if (exerciseCheckItem && !exerciseCheckItem.classList.contains('checked')) {
        exerciseCheckItem.classList.add('checked');
        updateCheckinProgress();
    }
}

function addCustomExercise() {
    const name = document.getElementById('custom-exercise-name').value;
    const duration = parseInt(document.getElementById('custom-exercise-duration').value);
    const calories = parseInt(document.getElementById('custom-exercise-cal').value);

    if (!name || !duration || !calories) {
        alert('请填写完整的运动信息');
        return;
    }

    appData.todayExercises.push({
        name: `${name} ${duration}分钟`,
        calories,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });

    saveData();
    updateExercisePage();
    updateHomePage();

    // 清空输入
    document.getElementById('custom-exercise-name').value = '';
    document.getElementById('custom-exercise-duration').value = '';
    document.getElementById('custom-exercise-cal').value = '';

    // 自动勾选运动打卡
    const exerciseCheckItem = document.querySelector('.check-item:nth-child(3)');
    if (exerciseCheckItem && !exerciseCheckItem.classList.contains('checked')) {
        exerciseCheckItem.classList.add('checked');
        updateCheckinProgress();
    }
}

function updateExercisePage() {
    const listDiv = document.getElementById('exercise-list');

    if (appData.todayExercises.length === 0) {
        listDiv.innerHTML = '<p class="empty-tip">还没有记录运动，动起来吧！</p>';
        return;
    }

    listDiv.innerHTML = appData.todayExercises.map(ex => `
        <div class="exercise-record">
            <div>
                <span class="exercise-name-text">${ex.name}</span>
                <span class="exercise-detail">${ex.time}</span>
            </div>
            <span class="exercise-cal-burn">-${ex.calories} kcal</span>
        </div>
    `).join('');
}

// ===== 设置页 =====
function updateSettingsPage() {
    document.getElementById('setting-name').value = appData.user.name;
    document.getElementById('setting-height').value = appData.user.height;
    document.getElementById('setting-target').value = appData.user.targetLoss;

    // 更新主题选择状态
    document.querySelectorAll('.settings-theme .theme-option').forEach(o => {
        o.classList.toggle('active', o.dataset.theme === appData.user.theme);
    });
}

function saveSettings() {
    const name = document.getElementById('setting-name').value || appData.user.name;
    const height = parseFloat(document.getElementById('setting-height').value) || appData.user.height;
    const targetLoss = parseFloat(document.getElementById('setting-target').value) || appData.user.targetLoss;

    appData.user.name = name;
    appData.user.height = height;
    appData.user.targetLoss = targetLoss;

    saveData();
    updateHomePage();

    // 显示保存成功提示
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ 已保存';
    btn.style.background = 'var(--success-color)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
}

function resetData() {
    if (confirm('确定要重置所有数据吗？此操作不可恢复！')) {
        localStorage.removeItem('fatLossData');
        location.reload();
    }
}

// ===== 30天计划日历 =====
function renderPlanCalendar() {
    const calendar = document.getElementById('plan-calendar');
    const phases = [
        { name: '适应期', days: [1, 2, 3, 4, 5, 6, 7], color: '#A8E6CF' },
        { name: '加速期', days: [8, 9, 10, 11, 12, 13, 14], color: '#FFD3B6' },
        { name: '突破期', days: [15, 16, 17, 18, 19, 20, 21], color: '#FFAAA5' },
        { name: '巩固期', days: [22, 23, 24, 25, 26, 27, 28], color: '#FF8B94' },
        { name: '维持期', days: [29, 30], color: '#C7CEEA' }
    ];

    const startDate = new Date(appData.currentDate);
    const today = new Date();
    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

    let html = '';
    for (let day = 1; day <= 30; day++) {
        const phase = phases.find(p => p.days.includes(day));
        const isActive = day === diffDays;
        const isPast = day < diffDays;

        html += `
            <div class="plan-day ${isActive ? 'active' : ''}" style="${isPast ? 'opacity:0.6;' : ''}">
                <span class="day-num">${day}</span>
                <span class="day-label">${phase ? phase.name : ''}</span>
            </div>
        `;
    }

    calendar.innerHTML = html;
}

// 检查是否需要重置每日数据
function checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    const lastVisit = localStorage.getItem('lastVisit');

    if (lastVisit && lastVisit !== today) {
        // 新的一天，重置今日数据
        appData.todayMeals = { breakfast: null, lunch: null, dinner: null };
        appData.todayExercises = [];
    }
    // 无论如何更新最后访问日期
    localStorage.setItem('lastVisit', today);
    saveData();
}

// 页面加载时检查是否需要重置
checkDailyReset();
