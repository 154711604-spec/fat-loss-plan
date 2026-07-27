// ===== 全局状态 =====
let appData = {
    user: {
        name: '小王必瘦',
        height: 157,
        weight: 60,
        targetLoss: 4,
        theme: 'cute',
        avatar: ''
    },
    weightRecords: [
        { date: '2026-07-27', weight: 60 }
    ],
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

// 从localStorage加载数据
function loadData() {
    let saved = localStorage.getItem('fatLossData');
    if (!saved) {
        saved = localStorage.getItem('fatLossData_bak');
    }
    if (saved) {
        try {
            appData = JSON.parse(saved);
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
            if (page === 'plan') renderDailySummary();
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

// 点击修改当前体重
function editCurrentWeight() {
    const current = getLatestWeight();
    const input = prompt('修改当前体重（kg）：', current);
    if (input === null) return;
    const weight = parseFloat(input);
    if (!weight || weight <= 0) {
        alert('请输入有效的体重数值');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const existingIndex = appData.weightRecords.findIndex(r => r.date === today);
    if (existingIndex >= 0) {
        appData.weightRecords[existingIndex].weight = weight;
    } else {
        appData.weightRecords.push({ date: today, weight });
    }
    
    saveData();
    updateHomePage();
    updateWeightPage();
    showToast('体重已更新');
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
// 外卖菜单池
const mealPool = {
    breakfast: [
        { emoji: '🥪', name: '全麦三明治+黑咖啡', cal: 350 },
        { emoji: '🥣', name: '燕麦粥+水煮蛋', cal: 280 },
        { emoji: '🥛', name: '低脂牛奶+全麦面包', cal: 320 },
        { emoji: '🍳', name: '水煮蛋+蒸红薯+豆浆', cal: 260 },
        { emoji: '🌽', name: '玉米+水煮蛋+牛奶', cal: 290 },
        { emoji: '🥯', name: '全麦贝果+酸奶+水果', cal: 340 },
        { emoji: '🥟', name: '素馅蒸饺+黑咖啡', cal: 300 },
        { emoji: '🍞', name: '吐司煎蛋+小番茄+牛奶', cal: 380 },
        { emoji: '🥒', name: '蔬菜鸡肉卷+柠檬水', cal: 310 },
        { emoji: '🍌', name: '香蕉燕麦奶昔+坚果', cal: 330 },
    ],
    lunch: [
        { emoji: '🥗', name: '轻食沙拉+鸡胸肉', cal: 450 },
        { emoji: '🍜', name: '清汤荞麦面+蔬菜', cal: 400 },
        { emoji: '🍚', name: '糙米饭+清蒸鱼+青菜', cal: 500 },
        { emoji: '🥩', name: '牛肉沙拉碗+藜麦', cal: 480 },
        { emoji: '🍱', name: '日式便当(烤三文鱼+蔬菜)', cal: 520 },
        { emoji: '🌯', name: '鸡肉全麦卷饼+沙拉', cal: 460 },
        { emoji: '🍲', name: '番茄牛肉汤+小份米饭', cal: 430 },
        { emoji: '🥘', name: '韩式拌饭(少酱)+泡菜', cal: 490 },
        { emoji: '🍝', name: '番茄意面+蔬菜沙拉', cal: 440 },
        { emoji: '🫕', name: '虾仁豆腐煲+杂粮饭', cal: 420 },
    ],
    dinner: [
        { emoji: '🥒', name: '蔬菜汤+水煮虾', cal: 300 },
        { emoji: '🥗', name: '水果沙拉+酸奶', cal: 250 },
        { emoji: '🍄', name: '菌菇豆腐汤+小份米饭', cal: 350 },
        { emoji: '🐟', name: '清蒸鲈鱼+白灼西兰花', cal: 280 },
        { emoji: '🥬', name: '上汤娃娃菜+凉拌鸡丝', cal: 320 },
        { emoji: '🍲', name: '番茄蛋花汤+蒸南瓜', cal: 260 },
        { emoji: '🦐', name: '白灼虾+凉拌黄瓜+玉米', cal: 310 },
        { emoji: '🥦', name: '蒜蓉西兰花+水煮鸡胸', cal: 290 },
        { emoji: '🍠', name: '蒸红薯+凉拌木耳+鸡蛋', cal: 270 },
        { emoji: '🥣', name: '紫菜蛋花汤+小份荞麦面', cal: 330 },
    ]
};

// 渲染外卖推荐
function renderMealRecommendation(mealType) {
    const container = document.getElementById(`${mealType}-recommend`);
    if (!container) return;

    const pool = mealPool[mealType];
    // 随机选4个
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 4);

    container.innerHTML = shuffled.map(item => `
        <div class="meal-item">
            <span class="meal-emoji">${item.emoji}</span>
            <div class="meal-info">
                <span class="meal-name">${item.name}</span>
                <span class="meal-cal">约${item.cal}kcal</span>
            </div>
            <button class="btn-select" onclick="selectMeal('${mealType}', '${item.name.replace(/'/g, "\\'")}', ${item.cal})">选这个</button>
        </div>
    `).join('');
}

// 换一批
function refreshMeals(mealType) {
    renderMealRecommendation(mealType);
    updateDietPage();
}

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

// 文字输入食物
function handleMealText(mealType) {
    const nameInput = document.getElementById(`${mealType}-text`);
    const calInput = document.getElementById(`${mealType}-cal`);
    const name = nameInput.value.trim();
    let cal = parseInt(calInput.value);

    // 如果输入了食物名但没有填热量，实时显示估算值
    if (name) {
        const estimated = estimateFoodCal(name);
        if (!cal || isNaN(cal)) {
            calInput.value = estimated;
            calInput.style.color = 'var(--success-color)';
        } else {
            calInput.style.color = '';
        }
    } else {
        calInput.value = '';
        calInput.style.color = '';
    }

    if (!name && !cal) return;

    if (name && (!cal || isNaN(cal))) {
        cal = estimateFoodCal(name);
        calInput.value = cal;
    }

    appData.todayMeals[mealType] = {
        name: name || `未命名${mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐'}`,
        cal: cal || 0
    };
    saveData();
    updateHomePage();

    // 自动勾选饮食打卡
    const dietCheckItem = document.querySelector('.check-item:nth-child(2)');
    if (dietCheckItem && !dietCheckItem.classList.contains('checked')) {
        dietCheckItem.classList.add('checked');
        updateCheckinProgress();
    }
}

// 根据食物名称估算热量
function estimateFoodCal(name) {
    const lower = name.toLowerCase();

    // 常见食物热量表（每份约热量 kcal）
    const foodCalTable = [
        // 主食类
        { keys: ['米饭', '白米饭', '大米饭'], cal: 200, note: '一碗(150g)' },
        { keys: ['糙米饭', '杂粮饭'], cal: 180, note: '一碗(150g)' },
        { keys: ['馒头', '白馒头'], cal: 220, note: '一个' },
        { keys: ['面条', '汤面', '清汤面'], cal: 250, note: '一碗' },
        { keys: ['全麦面包', '全麦吐司'], cal: 150, note: '两片' },
        { keys: ['面包'], cal: 250, note: '一个' },
        { keys: ['包子'], cal: 150, note: '一个' },
        { keys: ['饺子', '水饺'], cal: 40, note: '一个' },
        { keys: ['馄饨', '云吞'], cal: 250, note: '一碗(10个)' },
        { keys: ['燕麦', '燕麦粥', '麦片'], cal: 180, note: '一碗' },
        { keys: ['粥', '白粥', '小米粥'], cal: 120, note: '一碗' },
        { keys: ['红薯', '地瓜'], cal: 150, note: '一个(200g)' },
        { keys: ['玉米'], cal: 140, note: '一根' },
        { keys: ['饼', '煎饼', '大饼'], cal: 300, note: '一张' },
        { keys: ['油条'], cal: 250, note: '一根' },

        // 蛋白质类
        { keys: ['鸡蛋', '水煮蛋', '煮鸡蛋'], cal: 75, note: '一个' },
        { keys: ['煎蛋', '炒蛋', '煎鸡蛋'], cal: 120, note: '一个' },
        { keys: ['鸡胸肉'], cal: 150, note: '100g' },
        { keys: ['鸡腿'], cal: 180, note: '一个' },
        { keys: ['鸡肉'], cal: 200, note: '100g' },
        { keys: ['牛肉'], cal: 250, note: '100g' },
        { keys: ['猪肉'], cal: 300, note: '100g' },
        { keys: ['鱼', '清蒸鱼', '蒸鱼'], cal: 120, note: '100g' },
        { keys: ['虾', '水煮虾', '虾仁'], cal: 100, note: '100g' },
        { keys: ['豆腐'], cal: 80, note: '100g' },
        { keys: ['豆浆'], cal: 60, note: '一杯(250ml)' },
        { keys: ['牛奶', '低脂牛奶', '纯牛奶'], cal: 120, note: '一杯(250ml)' },
        { keys: ['酸奶'], cal: 150, note: '一杯(200ml)' },

        // 蔬菜类
        { keys: ['沙拉', '蔬菜沙拉', '轻食沙拉'], cal: 150, note: '一份' },
        { keys: ['青菜', '炒青菜', '蔬菜'], cal: 80, note: '一份' },
        { keys: ['西兰花', '花椰菜'], cal: 50, note: '100g' },
        { keys: ['番茄', '西红柿'], cal: 30, note: '一个' },
        { keys: ['黄瓜'], cal: 20, note: '一根' },
        { keys: ['菌菇', '蘑菇', '菌菇汤'], cal: 60, note: '一碗' },

        // 外卖/快餐
        { keys: ['黄焖鸡', '黄焖鸡米饭'], cal: 550, note: '一份' },
        { keys: ['麻辣烫'], cal: 500, note: '一碗' },
        { keys: ['沙县小吃', '拌面', '扁肉'], cal: 450, note: '一份' },
        { keys: ['汉堡'], cal: 500, note: '一个' },
        { keys: ['炸鸡'], cal: 400, note: '一块' },
        { keys: ['披萨'], cal: 300, note: '一片' },
        { keys: ['螺蛳粉'], cal: 600, note: '一碗' },
        { keys: ['酸辣粉'], cal: 500, note: '一碗' },
        { keys: ['米线', '过桥米线'], cal: 500, note: '一碗' },
        { keys: ['麻辣香锅'], cal: 600, note: '一份' },
        { keys: ['盖浇饭', '盖饭'], cal: 600, note: '一份' },
        { keys: ['炒饭', '蛋炒饭'], cal: 500, note: '一份' },
        { keys: ['炒面', '炒粉'], cal: 500, note: '一份' },
        { keys: ['寿司'], cal: 40, note: '一个' },

        // 水果
        { keys: ['苹果'], cal: 80, note: '一个' },
        { keys: ['香蕉'], cal: 100, note: '一根' },
        { keys: ['橙子', '橘子'], cal: 60, note: '一个' },
        { keys: ['葡萄'], cal: 100, note: '一串(200g)' },
        { keys: ['西瓜'], cal: 80, note: '一片(300g)' },

        // 饮品
        { keys: ['黑咖啡', '美式'], cal: 5, note: '一杯' },
        { keys: ['拿铁', '咖啡'], cal: 150, note: '一杯' },
        { keys: ['奶茶'], cal: 350, note: '一杯' },
        { keys: ['可乐', '汽水'], cal: 150, note: '一罐' },
        { keys: ['果汁'], cal: 120, note: '一杯' },
    ];

    let totalCal = 0;
    let matchCount = 0;

    for (const item of foodCalTable) {
        for (const key of item.keys) {
            if (lower.includes(key.toLowerCase())) {
                totalCal += item.cal;
                matchCount++;
                break;
            }
        }
    }

    // 如果识别到多种食物，累加；如果完全没识别到，给一个保守估算
    if (matchCount === 0) {
        return Math.round(name.length * 20 + 100); // 粗略估算
    }

    return Math.round(totalCal);
}

function updateDietPage() {
    // 渲染每顿饭的推荐
    renderMealRecommendation('breakfast');
    renderMealRecommendation('lunch');
    renderMealRecommendation('dinner');

    // 更新已选状态（延迟等 DOM 渲染完）
    setTimeout(() => {
        document.querySelectorAll('.meal-item').forEach(item => {
            const btn = item.querySelector('.btn-select');
            if (!btn) return;
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
    }, 50);
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
    const name = document.getElementById('custom-exercise-name').value.trim();
    const duration = parseInt(document.getElementById('custom-exercise-duration').value);
    let calories = parseInt(document.getElementById('custom-exercise-cal').value);

    if (!name || !duration) {
        alert('请填写运动项目和时长');
        return;
    }

    // 如果没填热量，自动估算
    if (!calories || isNaN(calories)) {
        calories = estimateCalories(name, duration);
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
    document.getElementById('cal-estimate-hint').innerHTML = '';

    // 自动勾选运动打卡
    const exerciseCheckItem = document.querySelector('.check-item:nth-child(3)');
    if (exerciseCheckItem && !exerciseCheckItem.classList.contains('checked')) {
        exerciseCheckItem.classList.add('checked');
        updateCheckinProgress();
    }
}

// 运动热量自动估算（MET值法：MET × 体重kg × 小时）
function estimateCalories(name, minutes) {
    const weight = getLatestWeight();
    const hours = minutes / 60;

    // MET 值参考表（常见运动）
    const metTable = {
        '跑步': 8.0, '慢跑': 7.0, '快跑': 11.0,
        '跳绳': 10.0, '快走': 5.0, '散步': 3.5,
        '骑车': 6.0, '骑行': 6.0, '游泳': 8.0,
        '瑜伽': 3.5, '普拉提': 3.0,
        'hiit': 12.0, 'tabata': 12.0, '高强度间歇': 12.0,
        '跳操': 7.0, '健身操': 7.0, '有氧操': 6.5,
        '力量训练': 5.0, '举重': 5.0, '深蹲': 5.0,
        '��楼梯': 8.0, '爬山': 7.0,
        '篮球': 7.0, '羽毛球': 5.5, '乒乓球': 4.5,
        '足球': 8.0, '网球': 7.0,
        '跳舞': 5.0, '广场舞': 4.0,
        '拉伸': 2.5, '平板支撑': 4.0, '仰卧起坐': 4.0,
        '俯卧撑': 5.0, '引体向上': 5.0,
        '拳击': 9.0, '搏击': 9.0,
        '椭圆机': 6.0, '划船机': 7.0,
    };

    let met = 6.0; // 默认中等强度
    const lower = name.toLowerCase();

    for (const [key, value] of Object.entries(metTable)) {
        if (lower.includes(key)) {
            met = value;
            break;
        }
    }

    return Math.round(met * weight * hours);
}

// 实时自动估算并显示
function autoEstimateCal() {
    const name = document.getElementById('custom-exercise-name').value.trim();
    const duration = parseInt(document.getElementById('custom-exercise-duration').value);
    const calInput = document.getElementById('custom-exercise-cal');
    const hint = document.getElementById('cal-estimate-hint');

    if (name && duration && duration > 0) {
        const estimated = estimateCalories(name, duration);
        calInput.value = estimated;
        hint.innerHTML = `🔥 根据你的体重（${getLatestWeight()}kg）自动估算：约 <strong>${estimated} kcal</strong>`;
    } else {
        calInput.value = '';
        hint.innerHTML = '';
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

    // 更新头像预览
    updateSettingsAvatar();

    // 更新主题选择状态
    document.querySelectorAll('.settings-theme .theme-option').forEach(o => {
        o.classList.toggle('active', o.dataset.theme === appData.user.theme);
    });
}

// 更新设置页头像
function updateSettingsAvatar() {
    const img = document.getElementById('settings-avatar-img');
    if (img) {
        img.src = getUserAvatar();
    }
}

// 获取当前头像URL
function getUserAvatar() {
    if (appData.user.avatar) return appData.user.avatar;
    const seed = appData.user._avatarSeed || appData.user.name.replace(/[^a-zA-Z0-9]/g, '') || 'fitness';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

// 上传自定义头像
function handleAvatarUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        appData.user.avatar = e.target.result;
        saveData();
        updateSettingsAvatar();
        updateHeaderAvatar();
        showToast('头像已更新');
    };
    reader.readAsDataURL(file);
}

// 随机生成头像
function refreshAvatar() {
    const seeds = ['fitness', 'happy', 'cool', 'smile', 'cute', 'sporty', 'sunny', 'luna', 'mia', 'aria', 'nova', 'ruby', 'jade'];
    const seed = seeds[Math.floor(Math.random() * seeds.length)];
    appData.user.avatar = ''; // 清空自定义头像
    appData.user._avatarSeed = seed;
    saveData();
    updateSettingsAvatar();
    updateHeaderAvatar();
    showToast('随机头像已生成');
}

// 更新顶部头像
function updateHeaderAvatar() {
    const headerImg = document.getElementById('header-avatar');
    if (headerImg) {
        headerImg.src = getUserAvatar();
    }
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
        localStorage.removeItem('fatLossData_bak');
        location.reload();
    }
}

// ===== 数据导出/导入 =====
function exportData() {
    const exportObj = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: appData
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `减脂计划备份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const imported = JSON.parse(event.target.result);
                if (!imported.data || !imported.data.user) {
                    throw new Error('无效的备份文件');
                }
                if (confirm('导入数据将覆盖当前所有记录，确定继续吗？')) {
                    appData = imported.data;
                    
                    // 保留原始开始日期，用于计算30天计划进度
                    // 但如果备份的日期比今天还晚，说明是跨天导入，用备份日期
                    const backupDate = new Date(imported.data.currentDate);
                    const today = new Date();
                    // 如果备份日期不是今天，保留原始日期用于计算天数进度
                    appData.currentDate = backupDate;
                    
                    // 体重记录保留原始日期，不改动
                    // 但如果今天的体重还没记录，提示用户
                    const todayStr = today.toISOString().split('T')[0];
                    const hasTodayRecord = appData.weightRecords.some(r => r.date === todayStr);
                    
                    saveData();
                    initTheme();
                    updateHomePage();
                    updateWeightPage();
                    updateDietPage();
                    updateExercisePage();
                    updateSettingsPage();
                    renderPlanCalendar();
                    renderDailySummary();
                    
                    if (!hasTodayRecord) {
                        showToast('数据导入成功，别忘了记录今日体重哦');
                    } else {
                        showToast('数据导入成功');
                    }
                }
            } catch(err) {
                alert('文件格式不正确，请选择正确的备份文件');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ===== 每日计划总结 =====
function renderDailySummary() {
    const summary = document.getElementById('daily-summary');
    const analysis = document.getElementById('calorie-analysis');
    if (!summary || !analysis) return;

    // 计算今日摄入
    let intake = 0;
    const mealsDone = [];
    if (appData.todayMeals.breakfast) { intake += appData.todayMeals.breakfast.cal; mealsDone.push('早餐'); }
    if (appData.todayMeals.lunch) { intake += appData.todayMeals.lunch.cal; mealsDone.push('午餐'); }
    if (appData.todayMeals.dinner) { intake += appData.todayMeals.dinner.cal; mealsDone.push('晚餐'); }

    // 计算今日消耗
    let burn = 0;
    const exerciseDone = [];
    appData.todayExercises.forEach(ex => { burn += ex.calories; exerciseDone.push(ex.name); });

    // 计算基础代谢 (Mifflin-St Jeor)
    const weight = getLatestWeight();
    const height = appData.user.height;
    const bmr = Math.round(10 * weight + 6.25 * height - 5 * 25 - 161); // 估算女性25岁
    const tdee = Math.round(bmr * 1.2); // 久坐
    const dailyTarget = Math.round(tdee - 500); // 每天赤字500kcal

    // 判断状态
    const weightRecorded = appData.weightRecords.length > 0 &&
        appData.weightRecords[appData.weightRecords.length - 1].date === new Date().toISOString().split('T')[0];

    let statusEmoji, statusText, statusClass;
    const completeness = weightRecorded ? 1 : 0 + mealsDone.length + exerciseDone.length;
    const totalTasks = 5; // 体重 + 3餐 + 运动

    if (mealsDone.length >= 3 && exerciseDone.length >= 1 && weightRecorded) {
        statusEmoji = '🌟'; statusText = '完美！今日计划全部完成'; statusClass = 'perfect';
    } else if (mealsDone.length >= 2 && (exerciseDone.length >= 1 || weightRecorded)) {
        statusEmoji = '👍'; statusText = '不错，再接再厉'; statusClass = 'good';
    } else if (mealsDone.length >= 1) {
        statusEmoji = '💪'; statusText = '还需努力，加油'; statusClass = 'ok';
    } else {
        statusEmoji = '🚀'; statusText = '今日计划尚未开始'; statusClass = 'pending';
    }

    // 热量判断
    let calStatus, calEmoji, calClass;
    if (intake === 0) {
        calStatus = '还没记录饮食'; calEmoji = '⏳'; calClass = 'pending';
    } else if (intake <= dailyTarget) {
        calStatus = `热量控制优秀！低于目标 ${dailyTarget - intake} kcal`; calEmoji = '🎉'; calClass = 'perfect';
    } else if (intake <= dailyTarget + 200) {
        calStatus = `热量略超，超出 ${intake - dailyTarget} kcal`; calEmoji = '⚠️'; calClass = 'ok';
    } else {
        calStatus = `热量超标！超出 ${intake - dailyTarget} kcal`; calEmoji = '🔴'; calClass = 'bad';
    }

    summary.innerHTML = `
        <div class="summary-status ${statusClass}">
            <span class="summary-emoji">${statusEmoji}</span>
            <span class="summary-text">${statusText}</span>
        </div>
        <div class="summary-grid">
            <div class="summary-item ${weightRecorded ? 'done' : ''}">
                <span class="summary-icon">⚖️</span>
                <span class="summary-label">体重记录</span>
                <span class="summary-check">${weightRecorded ? '✅' : '⬜'}</span>
            </div>
            <div class="summary-item ${mealsDone.includes('早餐') ? 'done' : ''}">
                <span class="summary-icon">🍳</span>
                <span class="summary-label">早餐</span>
                <span class="summary-check">${mealsDone.includes('早餐') ? '✅' : '⬜'}</span>
            </div>
            <div class="summary-item ${mealsDone.includes('午餐') ? 'done' : ''}">
                <span class="summary-icon">🍱</span>
                <span class="summary-label">午餐</span>
                <span class="summary-check">${mealsDone.includes('午餐') ? '✅' : '⬜'}</span>
            </div>
            <div class="summary-item ${mealsDone.includes('晚餐') ? 'done' : ''}">
                <span class="summary-icon">🍲</span>
                <span class="summary-label">晚餐</span>
                <span class="summary-check">${mealsDone.includes('晚餐') ? '✅' : '⬜'}</span>
            </div>
            <div class="summary-item ${exerciseDone.length > 0 ? 'done' : ''}">
                <span class="summary-icon">🏃</span>
                <span class="summary-label">运动</span>
                <span class="summary-check">${exerciseDone.length > 0 ? '✅' : '⬜'}</span>
            </div>
        </div>
    `;

    analysis.innerHTML = `
        <div class="cal-analysis-status ${calClass}">
            <span>${calEmoji}</span>
            <span>${calStatus}</span>
        </div>
        <div class="cal-bars">
            <div class="cal-bar-row">
                <span class="cal-bar-label">🍽️ 已摄入</span>
                <div class="cal-bar-track">
                    <div class="cal-bar-fill intake-fill" style="width:${Math.min(100, (intake / dailyTarget) * 100)}%"></div>
                </div>
                <span class="cal-bar-value">${intake}</span>
            </div>
            <div class="cal-bar-row">
                <span class="cal-bar-label">🎯 目标摄入</span>
                <div class="cal-bar-track">
                    <div class="cal-bar-fill target-fill" style="width:100%"></div>
                </div>
                <span class="cal-bar-value">${dailyTarget}</span>
            </div>
            <div class="cal-bar-row">
                <span class="cal-bar-label">🔥 已消耗</span>
                <div class="cal-bar-track">
                    <div class="cal-bar-fill burn-fill" style="width:${Math.min(100, (burn / 500) * 100)}%"></div>
                </div>
                <span class="cal-bar-value">${burn}</span>
            </div>
        </div>
        <div class="cal-detail">
            <div class="cal-detail-row">
                <span>基础代谢 (BMR)</span>
                <span><strong>${bmr}</strong> kcal</span>
            </div>
            <div class="cal-detail-row">
                <span>每日消耗 (TDEE)</span>
                <span><strong>${tdee}</strong> kcal</span>
            </div>
            <div class="cal-detail-row">
                <span>减脂目标 (赤字500)</span>
                <span><strong>${dailyTarget}</strong> kcal</span>
            </div>
            <div class="cal-detail-row">
                <span>净热量差</span>
                <span><strong style="color:${intake - burn <= dailyTarget ? 'var(--success-color)' : '#E74C3C'}">${intake - burn}</strong> kcal</span>
            </div>
        </div>
    `;
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

// ===== Toast 提示 =====
function showToast(msg) {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}
