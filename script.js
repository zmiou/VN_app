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
            if (item.payer === '公費') publicFundExpense += v;
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
            renderPieChart();
        }
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
    // 7. 記帳與換匯邏輯 (保留你的表單邏輯)
    // ------------------------------------
    function renderExchangeList() {
        const list = document.getElementById('exchangeList');
        if (!list) return;
        exchangeHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        list.innerHTML = exchangeHistory.map((record, index) => `
            <li>${record.date} | ${record.location} | 
                <span style="color:green">+${Math.round(record.vndAmount).toLocaleString()} ₫</span>
                <button onclick="deleteExchange(${index})">x</button>
            </li>`).join('');
    }

    window.deleteExchange = (index) => {
        exchangeHistory.splice(index, 1);
        localStorage.setItem('exchangeHistory', JSON.stringify(exchangeHistory));
        calculateTotal();
        renderExchangeList();
    };

    // 表單處理 (支出)
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
            calculateTotal();
            renderExpenseList();
        };
    }

    // ------------------------------------
    // 8. 啟動
    // ------------------------------------
    calculateTotal();
    renderPackingList();
    initializeWeather();
    setInterval(updateCountdown, 1000);
    switchPage('homePage');
});

// ------------------------------------
// 工具函式 (放在最外面)
// ------------------------------------
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = show ? 'block' : 'none';
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

// 補上遺漏的 renderExpenseList
function renderExpenseList() {
    const container = document.getElementById('expenseList');
    if (!container) return;
    const items = JSON.parse(localStorage.getItem('expenseItems')) || [];
    container.innerHTML = items.map(item => `
        <div class="list-item" style="padding:10px; border-bottom:1px solid #eee;">
            <b>${item.category}</b> - ${item.amount} ${item.currency} (${item.payer})
        </div>`).join('');
}