document.addEventListener('DOMContentLoaded', () => {

    // ------------------------------------
    // 1. 全域變數與初始化 (確保順序正確)
    // ------------------------------------
    const departureDate = new Date('2026-03-21T00:00:00'); 
    let currentExchangeRate = 750; // 預設值
    const TRAVELERS = ['A', 'B']; 

    // 從 localStorage 載入資料 (先載入資料，後面的 function 才能用)
    let expenseItems = JSON.parse(localStorage.getItem('expenseItems')) || [];
    let packingItems = JSON.parse(localStorage.getItem('packingListItems')) || [];
    let exchangeHistory = JSON.parse(localStorage.getItem('exchangeHistory')) || [];

let myChart = null; // 放在 DOMContentLoaded 外層或函式上層

    // ------------------------------------
    // 2. 核心計算：加權平均匯率與總額
    // ------------------------------------
    function updateAverageRate() {
        if (exchangeHistory.length === 0) {
            currentExchangeRate = 750;
            return;
        }
        let totalTWD = 0;
        let totalVND = 0;
        exchangeHistory.forEach(record => {
            totalTWD += parseFloat(record.rmbAmount || 0); 
            totalVND += parseFloat(record.vndAmount || 0);
        });
        if (totalTWD > 0) currentExchangeRate = totalVND / totalTWD;
    }

    function calculateTotal() {
        updateAverageRate(); // 運算前先更新匯率

        let totalVNDExpense = 0;
        let publicFundExpense = 0;
        let publicFundIncome = 0;

        // 計算公費收入
        exchangeHistory.forEach(record => publicFundIncome += parseFloat(record.vndAmount || 0));

        // 計算支出
        expenseItems.forEach(item => {
            const v = item.currency === 'TWD' ? item.amount * currentExchangeRate : item.amount;
            totalVNDExpense += v;
// 修改這裡：只要 payer 是 '公費' 或 'A+B' 都算進公費餘額
    if (item.payer === '公費' || item.payer === 'A+B') {
        publicFundExpense += v;
    }
});
        const publicFundBalance = publicFundIncome - publicFundExpense;

        // 更新首頁與儀表板介面
        const totalExpEl = document.getElementById('totalExpense'); // 首頁總花費
        const totalTWDEl = document.getElementById('totalTWD');     // 記帳頁總花費 (TWD)
        const poolBalEl = document.getElementById('poolBalance');    // 首頁餘額
        const dashboardPoolEl = document.getElementById('publicFundBalance'); // 記帳頁餘額

        if (totalExpEl) totalExpEl.innerText = Math.round(totalVNDExpense).toLocaleString();
        if (totalTWDEl) totalTWDEl.innerText = (totalVNDExpense / currentExchangeRate).toFixed(0).toLocaleString();
        
        const balance = Math.round(publicFundBalance);
        if (poolBalEl) poolBalEl.innerText = balance.toLocaleString();
        if (dashboardPoolEl) {
            dashboardPoolEl.innerText = balance.toLocaleString() + ' ₫';
            dashboardPoolEl.style.color = balance >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)';
        }

        const rateEl = document.getElementById('avgRateDisplay');
        if (rateEl) rateEl.innerText = `參考匯率：1 TWD ≈ ${Math.round(currentExchangeRate)} VND`;
    }

    // ------------------------------------
    // 3. 頁面導航
    // ------------------------------------
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    function switchPage(targetId) {
        navButtons.forEach(btn => btn.classList.remove('active'));
        pages.forEach(page => page.classList.remove('active'));
        
        const btn = document.querySelector(`.nav-btn[data-page="${targetId}"]`);
        const page = document.getElementById(targetId);
        if (btn) btn.classList.add('active');
        if (page) page.classList.add('active');

        // 切換時同步更新該頁面內容
        if (targetId === 'budgetPage') {
            renderExchangeList();
            renderExpenseList();
// 使用 setTimeout 確保 DOM 已經顯示出來，Chart.js 才能抓到寬度
        setTimeout(() => {
            updateChart();
        }, 50);        }
        if (targetId === 'packingPage') {
            renderPackingList();
        }
    }

    navButtons.forEach(button => {
        button.addEventListener('click', (e) => switchPage(e.currentTarget.dataset.page));
    });

    // ------------------------------------
    // 4. 行程手風琴 (修復點擊無反應)
    // ------------------------------------
    document.querySelectorAll('.day-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isCurrentlyActive = header.classList.contains('active');

            // 收起全部
            document.querySelectorAll('.day-header').forEach(h => {
                h.classList.remove('active');
                if (h.nextElementSibling) h.nextElementSibling.style.display = 'none';
                const icon = h.querySelector('.icon');
                if (icon) icon.style.transform = 'rotate(0deg)';
            });

            // 展開點擊的那一個
            if (!isCurrentlyActive && content) {
                header.classList.add('active');
                content.style.display = 'block';
                const icon = header.querySelector('.icon');
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        });
    });

    // ------------------------------------
    // 5. 即時匯率換算器 (改為連動 currentExchangeRate)
    // ------------------------------------
    const twdInput = document.getElementById('twdInput');
    const vndInput = document.getElementById('vndInput');

    if (twdInput && vndInput) {
        twdInput.addEventListener('input', () => {
            const val = parseFloat(twdInput.value);
            vndInput.value = !isNaN(val) ? Math.round(val * currentExchangeRate) : '';
        });
        vndInput.addEventListener('input', () => {
            const val = parseFloat(vndInput.value);
            twdInput.value = !isNaN(val) ? (val / currentExchangeRate).toFixed(2) : '';
        });
    }

    // ------------------------------------
    // 6. 行李清單功能 (完整修復版本)
    // ------------------------------------
    function renderPackingList() {
        const pendingList = document.getElementById('pendingList');
        const checkedList = document.getElementById('checkedList');
        if (!pendingList || !checkedList) return;

        pendingList.innerHTML = '';
        checkedList.innerHTML = '';

        packingItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = item.checked ? 'checked-item' : '';
            li.innerHTML = `
                <div class="item-name">
                    <input type="checkbox" ${item.checked ? 'checked' : ''}>
                    <span class="item-text" style="${item.checked ? 'text-decoration:line-through;color:#ccc' : ''}">${item.name}</span>
                </div>
                <button class="remove-btn">🗑️</button>
            `;
            
            li.querySelector('input').onchange = () => {
                packingItems[index].checked = !packingItems[index].checked;
                saveAndRenderPacking();
            };
            li.querySelector('.remove-btn').onclick = () => {
                packingItems.splice(index, 1);
                saveAndRenderPacking();
            };

            item.checked ? checkedList.appendChild(li) : pendingList.appendChild(li);
        });
    }

    function saveAndRenderPacking() {
        localStorage.setItem('packingListItems', JSON.stringify(packingItems));
        renderPackingList();
    }

    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.onsubmit = (e) => {
            e.preventDefault();
            const input = document.getElementById('packingItemInput');
            if (input.value.trim()) {
                packingItems.push({ name: input.value.trim(), checked: false });
                input.value = '';
                saveAndRenderPacking();
            }
        };
    }

// ------------------------------------
// 7. 記帳與換匯邏輯 (完整修復與補齊版)
// ------------------------------------

// 統一刷新畫面所有數字與清單的函式
function refreshAll() {
    updateAverageRate();  // 1. 重新計算匯率
    calculateTotal();     // 2. 重新計算總額與餘額
    renderExchangeList(); // 3. 刷新換匯紀錄 (之前漏掉這個函式內容)
    renderExpenseList();  // 4. 刷新支出明細
    updateChart();        // 新增這行：確保數字變動時圖表跟著變
}

// [修正] 補上漏掉的換匯紀錄渲染函式
function renderExchangeList() {
    const listElement = document.getElementById('exchangeList');
    if (!listElement) return;

    listElement.innerHTML = `
        <table id="exchangeTable">
            <thead>
                <tr>
                    <th class="ex-date">日期</th>
                    <th class="ex-process">換匯過程</th>
                    <th class="ex-action">操作</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;

    const tbody = listElement.querySelector('tbody');
    // 確保讀取的是全域變數 exchangeHistory
    const records = exchangeHistory || [];

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">尚無換匯紀錄</td></tr>';
        return;
    }

tbody.innerHTML = records.map((rec, index) => {
        let dateShow = '';
        if (rec.date) {
            const dateParts = rec.date.split('-');
            dateShow = dateParts.length === 3 ? `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}` : rec.date;
        }

        const rate = (rec.vndAmount / rec.rmbAmount).toFixed(0);

        return `
            <tr>
                <td class="ex-date">${dateShow}</td>
                <td class="ex-process">
                    <div>
                        ${rec.rmbAmount.toLocaleString()} RMB
                        <span class="exchange-arrow">➔</span>
                        ${rec.vndAmount.toLocaleString()} VND
                    </div>
                    <div class="remain-label" style="color: var(--primary-color);">
                        匯率：1 RMB ≈ ${parseInt(rate).toLocaleString()} VND
                    </div>
                    <div class="remain-label" style="color: var(--subtle-text-color); font-style: italic;">
                        地點：${rec.location || '未註記'}
                    </div>
                </td>
                <td class="ex-action">
                    <button class="delete-btn" onclick="deleteExchange(${index})">×</button>
                </td>
            </tr>
        `;
    }).join('');
}

// [修正] 支出明細渲染：確保讀取變數並處理標籤
function renderExpenseList() {
    const tbody = document.querySelector('#expenseTable tbody');
    const thead = document.querySelector('#expenseTable thead');
    if (!tbody) return;

    // 加上標題列的 class (如果 HTML 原本沒有)
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th class="col-date">日期</th>
                <th class="col-desc">說明</th>
                <th class="col-amount">金額</th>
                <th class="col-action">操作</th>
            </tr>
        `;
    }
    
    const items = expenseItems || [];
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">尚無支出紀錄</td></tr>';
        return;
    }

    tbody.innerHTML = items.map((item, index) => {
        let dateShow = '';
        if (item.expenseDate) {
            const dateParts = item.expenseDate.split('-');
            dateShow = dateParts.length === 3 ? `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}` : '';
        }

        const isPublic = item.payer === '公費' || item.payer === 'A+B';
        const publicTag = isPublic ? `<br><span class="public-expense-tag">公費</span>` : '';
        const amountColor = isPublic ? 'color: var(--primary-color);' : '';

        return `
            <tr>
                <td class="col-date" style="color: var(--subtle-text-color); font-size: 0.8rem;">${dateShow}</td>
                <td class="col-desc"><span class="desc-text">${item.description}</span></td>
                <td class="col-amount" style="font-weight: bold; ${amountColor}">
                    ${Math.round(item.amount).toLocaleString()} ${item.currency}
                    ${publicTag} 
                </td>
                <td class="col-action">
                    <button class="delete-btn" onclick="deleteExpense(${index})">×</button>
                </td>
            </tr>
        `;
    }).join('');
}
// 刪除功能 (掛在 window 確保 HTML 呼叫得到)
window.deleteExchange = (index) => {
    if(confirm('確定要刪除這筆換匯嗎？')) {
        exchangeHistory.splice(index, 1);
        localStorage.setItem('exchangeHistory', JSON.stringify(exchangeHistory));
        refreshAll();
    }
};

window.deleteExpense = (index) => {
    if(confirm('確定要刪除這筆支出嗎？')) {
        expenseItems.splice(index, 1);
        localStorage.setItem('expenseItems', JSON.stringify(expenseItems));
        refreshAll();
    }
};

// 支出表單處理
const expForm = document.getElementById('addExpenseForm');
if (expForm) {
    expForm.onsubmit = (e) => {
        e.preventDefault();
        const newItem = {
            category: document.getElementById('expenseCategory').value,
            expenseDate: document.getElementById('expenseDate').value,
            description: document.getElementById('expenseDescription').value,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            currency: document.getElementById('expenseCurrency').value,
            payer: document.getElementById('expensePayer').value
        };
        
        expenseItems.push(newItem);
        localStorage.setItem('expenseItems', JSON.stringify(expenseItems));
        
        toggleModal('expenseModal', false);
        expForm.reset();
        refreshAll(); 
    };
}

// 換匯表單處理 (修正變數名與 ID)
const exchangeForm = document.getElementById('addExchangeForm');
if (exchangeForm) {
    exchangeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const date = document.getElementById('exchangeDateModal').value;
        // 新增：取得地點 (若沒填則預設為 '未註記')
        const location = document.getElementById('exchangeLocation')?.value || '未註記'; 
        const twd = parseFloat(document.getElementById('rmbAmount').value);
        const vnd = parseFloat(document.getElementById('vndAmount').value);

        if (!twd || !vnd) { alert("請輸入金額"); return; }

        // 存入全域變數 (包含地點)
        exchangeHistory.push({ 
            date: date, 
            location: location, // 儲存地點資訊
            rmbAmount: twd, 
            vndAmount: vnd 
        });
        
        localStorage.setItem('exchangeHistory', JSON.stringify(exchangeHistory));
        
        toggleModal('exchangeModal', false);
        exchangeForm.reset();
        refreshAll(); 
    });
}

    // ------------------------------------
// --- 8. 啟動 (請改為這個順序) ---
switchPage('homePage'); // 先定位頁面
refreshAll();          // 再刷新數據與圖表
renderPackingList();
initializeWeather();
setInterval(updateCountdown, 1000);


// --- 備忘錄邏輯 ---
const memoEl = document.getElementById('travelMemo');
const memoStatus = document.getElementById('memoStatus');

// 1. 載入已存的內容
if (memoEl) {
    memoEl.value = localStorage.getItem('travelMemo') || '';
    
    // 2. 監聽輸入行為 (使用輸入間隔存檔，避免頻繁寫入)
    let saveTimeout;
    memoEl.addEventListener('input', () => {
        memoStatus.innerText = '儲存中...';
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem('travelMemo', memoEl.value);
            memoStatus.innerText = '已自動儲存';
        }, 1000); // 停止打字 1 秒後才存檔
    });
}

function updateChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    // 1. 整理分類數據 (統一轉換為 VND 計算比例才精準)
    const categoryTotals = {};
    expenseItems.forEach(item => {
        // 統一轉為 VND 進行統計
        const valueVND = item.currency === 'TWD' ? item.amount * currentExchangeRate : item.amount;
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + valueVND;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    // 2. 判斷是否有數據
    if (data.length === 0) {
        ctx.style.display = 'none';
        // ... (顯示「尚無資料」的代碼維持不變) ...
        return;
    } else {
        ctx.style.display = 'block';
        if (document.getElementById('no-data-msg')) document.getElementById('no-data-msg').remove();
    }

    // 3. 銷毀舊圖表防止重疊
    if (myChart) { myChart.destroy(); }

    // 4. 繪製新圖表
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#8E9775', '#E28E8E', '#94B49F', '#D4BE96', '#A78BFA'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 12 } }
                },
                // 加個小功能：滑鼠移上去顯示金額
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${Math.round(context.raw).toLocaleString()} VND`;
                        }
                    }
                }
            }
        }
    });
}

});

// 工具函式
// 修改原本的 toggleModal 函式
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (!modal) return;
    
    modal.style.display = show ? 'block' : 'none';

    // 當彈窗開啟時，自動設定日期預設值
    if (show) {
        // 判斷是哪種彈窗，並對應其日期 input 的 ID
        const targetDateId = id === 'expenseModal' ? 'expenseDate' : 
                           id === 'exchangeModal' ? 'exchangeDateModal' : null;
        
        if (targetDateId) {
            const dateInput = document.getElementById(targetDateId);
            // 只有在 input 為空時才填入，避免覆蓋掉使用者已選的日期
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    }
}

// 3. 點選彈窗以外區域可以關閉彈窗
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

function initializeWeather() {
    if (document.getElementById('danang-temp')) {
        document.getElementById('danang-temp').textContent = '28°C';
        document.getElementById('updateTime').textContent = new Date().toLocaleTimeString();
    }
}

function updateCountdown() {
    const el = document.getElementById('countdownText');
    if (!el) return;
    const diff = new Date('2026-03-21T00:00:00') - new Date();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    el.textContent = diff > 0 ? `距離出發還有 ${days} 天` : '旅程進行中！';
}

    // 渲染清單前，檢查是否第一次開啟
    if (!localStorage.getItem('packingListItems') || packingItems.length === 0) {
        const defaultItems = [
            { name: '護照', checked: false },
            { name: '簽證', checked: false },
            { name: '手機充電器', checked: false },
            { name: '牙刷牙膏', checked: false },
            { name: '換洗衣物', checked: false },
            { name: '泳衣', checked: false },
            { name: '拖鞋', checked: false },
            { name: '防曬', checked: false },
            { name: '雨傘', checked: false },
            { name: '備用藥物', checked: false },
        ];
        packingItems = defaultItems;
        localStorage.setItem('packingListItems', JSON.stringify(packingItems)); // 只在第一次存
    }

    // 再渲染清單
    renderPackingList();
