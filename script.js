document.addEventListener('DOMContentLoaded', () => {

    // ------------------------------------
    // 1. 全域變數與初始化
    // ------------------------------------
    
    // 旅遊出發日期 (請根據實際情況修改)
    const departureDate = new Date('2026-03-21T00:00:00'); 
    
    // 匯率 (手動設定，非即時)
    const EXCHANGE_RATE = 750; // 1 TWD = 750 VND
    
    // V2.6 NEW: 預設 RMB/VND 匯率 (用於參考)
    const RMB_TO_VND_RATE = 3500; // 模擬 1 RMB = 3500 VND

    // V2.5 NEW: 模擬旅客清單，用於公費分攤
    const TRAVELERS = ['A', 'B']; 

    // 從 localStorage 載入資料
    let expenseItems = JSON.parse(localStorage.getItem('expenseItems')) || [];
    let packingItems = JSON.parse(localStorage.getItem('packingListItems')) || []; // V2.6 FIX: 確保 packingItems 也被正確載入
    
    // V2.6 NEW: 載入換匯紀錄
    let exchangeHistory = JSON.parse(localStorage.getItem('exchangeHistory')) || []; 


    // 🚀 NEW: 設置日期輸入框的預設值為今天
    const expenseDateInput = document.getElementById('expenseDate');
    if (expenseDateInput) {
        const today = new Date().toISOString().split('T')[0];
        expenseDateInput.value = today;
    }


    // ------------------------------------
    // 2. 導航功能 (切換頁面)
    // ------------------------------------
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    function switchPage(targetId) {
        // 1. 移除所有按鈕的 active class
        navButtons.forEach(btn => btn.classList.remove('active'));
        // 2. 隱藏所有頁面
        pages.forEach(page => page.classList.remove('active'));
        
        // 3. 設置當前按鈕為 active
        const activeButton = document.querySelector(`.nav-btn[data-page="${targetId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // 4. 顯示目標頁面
        const targetPage = document.getElementById(targetId);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // 如果切換到記帳或行李清單頁面，重新渲染確保最新狀態
            if (targetId === 'budgetPage') {
                renderExchangeList(); // V2.6 NEW: 渲染換匯紀錄
                renderPieChart();    // V2.6 NEW: 渲染圓餅圖
                renderExpenseList(); 
            }
            if (targetId === 'packingPage') {
                renderPackingList();
            }
        }
    }

    // 綁定導航按鈕事件
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-page');
            switchPage(targetId);
        });
    });


    // ------------------------------------
    // 3. 倒數計時功能 (略，無改動)
    // ------------------------------------
    function updateCountdown() {
        const now = new Date();
        const diff = departureDate - now;
        const countdownElement = document.getElementById('countdownText');

        if (!countdownElement) return;

        if (diff < 0) {
            countdownElement.textContent = '旅程進行中！或已結束。';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        countdownElement.textContent = `${days} 天 ${hours} 小時 ${minutes} 分 ${seconds} 秒`;
    }

    if (document.getElementById('countdownText')) {
        // 每秒更新一次
        setInterval(updateCountdown, 1000);
        updateCountdown();
    }


    // ------------------------------------
    // 4. 即時匯率換算器 (固定匯率) (略，無改動)
    // ------------------------------------
    const twdInput = document.getElementById('twdInput');
    const vndInput = document.getElementById('vndInput');
    const resultText = document.getElementById('conversionResult');
    const rateDisplay = document.getElementById('exchangeRate'); // 顯示匯率的元素
    
    // TWD 轉 VND
    const twdToVndHandler = (e) => {
        const numAmount = parseFloat(e.target.value);
        if (isNaN(numAmount) || numAmount < 0) {
            vndInput.value = '';
            resultText.textContent = "請輸入有效金額";
            return;
        }
        // 避免無限循環觸發
        vndInput.removeEventListener('input', vndToTwdHandler);
        const convertedAmount = numAmount * EXCHANGE_RATE;
        vndInput.value = convertedAmount.toFixed(0); 
        resultText.textContent = `${numAmount.toLocaleString()} TWD ≈ ${convertedAmount.toLocaleString()} ₫`;
        vndInput.addEventListener('input', vndToTwdHandler);
    };

    // VND 轉 TWD
    const vndToTwdHandler = (e) => {
        const numAmount = parseFloat(e.target.value);
        if (isNaN(numAmount) || numAmount < 0) {
            twdInput.value = '';
            resultText.textContent = "請輸入有效金額";
            return;
        }
        // 避免無限循環觸發
        twdInput.removeEventListener('input', twdToVndHandler);
        const convertedAmount = numAmount / EXCHANGE_RATE;
        const displayTWD = convertedAmount.toFixed(2);
        twdInput.value = displayTWD;
        resultText.textContent = `${numAmount.toLocaleString()} ₫ ≈ ${displayTWD.toLocaleString()} TWD`;
        twdInput.addEventListener('input', twdToVndHandler);
    };

    if (twdInput && vndInput && resultText) {
        twdInput.addEventListener('input', twdToVndHandler);
        vndInput.addEventListener('input', vndToTwdHandler);
    }

    if (rateDisplay) {
        rateDisplay.textContent = `1 TWD = ${EXCHANGE_RATE} VND (手動設定)`;
    }


    // ------------------------------------
    // 5. 天氣資訊 (模擬數據，非即時) (略，無改動)
    // ------------------------------------
    function initializeWeather() {
        // 模擬天氣數據
        const danang = { temp: '28°C', condition: '☀️ 晴朗' };
        const hoian = { temp: '26°C', condition: '🌤️ 多雲時晴' };

        // 確保元素存在
        if (document.getElementById('danang-temp')) {
            document.getElementById('danang-temp').textContent = danang.temp;
            document.getElementById('danang-condition').textContent = danang.condition;
            document.getElementById('hoian-temp').textContent = hoian.temp;
            document.getElementById('hoian-condition').textContent = hoian.condition;
            
            // 由於是非即時數據，顯示當前頁面載入時間
            document.getElementById('updateTime').textContent = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        }
    }


    // ------------------------------------
    // 6. 行程：手風琴/摺疊功能 (略，無改動)
    // ------------------------------------
    document.querySelectorAll('.day-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            
            // 檢查當前點擊的項目是否已經展開
            const isCurrentlyActive = header.classList.contains('active');

            // 1. 先收起所有其他行程內容
            document.querySelectorAll('.day-header').forEach(h => {
                h.classList.remove('active');
                if (h.nextElementSibling) h.nextElementSibling.style.display = 'none';
                
                const icon = h.querySelector('.icon');
                if (icon) icon.style.transform = 'rotate(0deg)';
            });

            // 2. 如果當前項目原本是收起的，則展開它
            if (!isCurrentlyActive) {
                header.classList.add('active');
                if (content) content.style.display = 'block';
                
                const icon = header.querySelector('.icon');
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        });
    });


    // ------------------------------------
    // 7. 記帳功能 (儲存、渲染、計算) - V2.6 主要更新區
    // ------------------------------------

    const addExpenseForm = document.getElementById('addExpenseForm');
    const addExchangeForm = document.getElementById('addExchangeForm'); // V2.6 NEW
    
    let categoryChartInstance = null; // V2.6 NEW: 儲存 Chart 實例

    function saveExpenses() {
        localStorage.setItem('expenseItems', JSON.stringify(expenseItems));
    }
    
    // V2.6 NEW: 儲存換匯紀錄
    function saveExchangeHistory() {
        localStorage.setItem('exchangeHistory', JSON.stringify(exchangeHistory));
    }

    function calculateTotal() {
        let totalVNDExpense = 0;
        let publicFundExpense = 0; // V2.6 NEW
        
        // 1. 計算總支出和公費支出
        expenseItems.forEach(item => {
            let amountInVND = 0;
            // 統一換算成 VND 計算
            if (item.currency === 'VND') {
                amountInVND = item.amount;
            } else if (item.currency === 'TWD') {
                amountInVND = item.amount * EXCHANGE_RATE;
            }
            
            totalVNDExpense += amountInVND;
            
            // 判斷是否為公費支出
            if (item.payer === '公費') {
                publicFundExpense += amountInVND;
            }
        });
        
        // 2. 計算公費收入
        let publicFundIncome = 0; // V2.6 NEW
        exchangeHistory.forEach(record => {
             // 換匯紀錄只紀錄 VND 收入
             publicFundIncome += record.vndAmount; 
        });

        // 3. 計算公費餘額 (VND)
        const publicFundBalance = publicFundIncome - publicFundExpense;
        
        // 4. 渲染結果到儀表板
        const totalTWDElement = document.getElementById('totalTWD');
        const publicFundBalanceElement = document.getElementById('publicFundBalance');

        // 將總 VND 換算回 TWD (供參考)
        const overallTWD = totalVNDExpense / EXCHANGE_RATE;
        
        if (totalTWDElement) {
            totalTWDElement.textContent = overallTWD.toFixed(2).toLocaleString();
        }
        
        if (publicFundBalanceElement) {
            // 負數顯示紅色
            publicFundBalanceElement.textContent = Math.round(publicFundBalance).toLocaleString() + ' ₫';
            // 根據餘額決定顏色
            publicFundBalanceElement.style.color = publicFundBalance >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)';
        }
    }
    
    // V2.6 NEW: 渲染換匯紀錄列表
    function renderExchangeList() {
        const exchangeListUl = document.getElementById('exchangeList');
        if (!exchangeListUl) return;

        exchangeListUl.innerHTML = '';
        
        // 🚀 NEW: 自動依日期排序 (最新日期在最上面)
        exchangeHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        exchangeHistory.forEach((record, index) => {
            const formattedDate = record.date ? record.date.replace(/-/g, '/') : '--';
            const rate = (record.vndAmount / record.rmbAmount).toFixed(0);
            
            const li = document.createElement('li');
            li.innerHTML = `
                ${formattedDate} | ${record.location} | 
                <span style="color: var(--success-color); font-weight: bold;">+${Math.round(record.vndAmount).toLocaleString()} ₫</span>
                <small> (換入 ${record.rmbAmount.toLocaleString()} RMB, 匯率 ${rate})</small>
                <button class="delete-exchange-btn" data-index="${index}">x</button>
            `;
            exchangeListUl.appendChild(li);
        });
        
        // 重新綁定刪除按鈕事件
        document.querySelectorAll('.delete-exchange-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                exchangeHistory.splice(index, 1);
                saveExchangeHistory();
                renderExchangeList();
                calculateTotal();
            });
        });
    }

    // V2.6 NEW: 公費換匯表單提交邏輯
    if (addExchangeForm) {
        // 自動計算匯率
        document.getElementById('rmbAmount').addEventListener('input', updateCalculatedRate);
        document.getElementById('vndAmount').addEventListener('input', updateCalculatedRate);

        function updateCalculatedRate() {
            const rmb = parseFloat(document.getElementById('rmbAmount').value);
            const vnd = parseFloat(document.getElementById('vndAmount').value);
            const rateDisplay = document.getElementById('calculatedRate');
            
            if (rmb > 0 && vnd > 0) {
                const rate = vnd / rmb;
                rateDisplay.textContent = rate.toFixed(0);
            } else {
                rateDisplay.textContent = '--';
            }
        }
        
        // 設置換匯日期預設值
        const exchangeDateInput = document.getElementById('exchangeDate');
        if (exchangeDateInput) {
            const today = new Date().toISOString().split('T')[0];
            exchangeDateInput.value = today;
        }

        addExchangeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const date = document.getElementById('exchangeDate').value;
            const location = document.getElementById('exchangeLocation').value;
            const rmbAmount = parseFloat(document.getElementById('rmbAmount').value);
            const vndAmount = parseFloat(document.getElementById('vndAmount').value);
            
            if (isNaN(rmbAmount) || rmbAmount <= 0 || isNaN(vndAmount) || vndAmount <= 0) {
                alert('請輸入有效的金額');
                return;
            }

            const newRecord = {
                date,
                location,
                rmbAmount,
                vndAmount,
                timestamp: new Date().toISOString()
            };

            exchangeHistory.push(newRecord);
            saveExchangeHistory();
            renderExchangeList();
            calculateTotal();
            
// 🚀 關鍵：儲存後清空並關閉
        addExchangeForm.reset();
        toggleModal('exchangeModal', false); // 確保 ID 是正確的;
            // 清空表單
            document.getElementById('exchangeLocation').value = '';
            document.getElementById('rmbAmount').value = '';
            document.getElementById('vndAmount').value = '';
            document.getElementById('calculatedRate').textContent = '--';
        });
    }


    function renderExpenseList() {
        const expenseTableBody = document.querySelector('#expenseTable tbody');
        if (!expenseTableBody) return;

        expenseTableBody.innerHTML = '';
        
        // 🚀 NEW: 自動依日期排序 (最新日期在最上面)
        expenseItems.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));

        expenseItems.forEach((item, index) => {
            // 🚀 NEW: 格式化日期 (YYYY/MM/DD)
            const formattedDate = item.expenseDate ? item.expenseDate.replace(/-/g, '/') : '--';

            // 轉換為 VND 的金額
            let displayVND = item.currency === 'TWD' ? item.amount * EXCHANGE_RATE : item.amount;
            
            const row = expenseTableBody.insertRow();
            row.innerHTML = `
                <td>${formattedDate}</td> 
                <td>${item.category}</td>
                <td>${item.description}</td>
                <td>${item.payer || '未知'}</td> 
                <td>${Math.round(displayVND).toLocaleString()} ₫ (${item.currency === 'TWD' ? 'TWD' : ''})</td>
                <td><button class="delete-btn" data-index="${index}">刪除</button></td>
            `;
        });
        
        // 重新綁定刪除按鈕事件
        document.querySelectorAll('#expenseTable .delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                expenseItems.splice(index, 1);
                saveExpenses();
                renderExpenseList();
                calculateTotal();
                renderPieChart(); // V2.6 NEW: 刪除後更新圓餅圖
            });
        });

        calculateTotal();
        renderPieChart(); // V2.6 NEW: 確保在列表渲染後也更新圖表
    }
    
    // V2.6 NEW: 渲染圓餅圖
    function renderPieChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        // 1. 數據聚合：按類別統計 VND 總額
        const categoryData = expenseItems.reduce((acc, item) => {
            let amountInVND = item.currency === 'VND' ? item.amount : item.amount * EXCHANGE_RATE;
            // 確保類別存在
            const category = item.category || '未分類'; 
            acc[category] = (acc[category] || 0) + amountInVND;
            return acc;
        }, {});

        // 2. 格式化 Chart.js 所需數據
        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        
        if (data.length === 0 || data.every(amount => amount === 0)) {
            // 如果沒有數據，圖表不需要渲染或顯示提示
            if (categoryChartInstance) {
                categoryChartInstance.destroy();
                categoryChartInstance = null;
            }
            ctx.parentNode.innerHTML = '<canvas id="categoryChart"></canvas><p style="text-align: center; color: var(--subtle-text-color);">目前沒有支出紀錄</p>';
            return;
        } else {
             // 確保 canvas 元素存在
             if (ctx.parentNode.querySelector('p')) {
                 ctx.parentNode.querySelector('p').remove();
             }
        }

        // 3. 顏色配置 (確保顏色足夠多，並具有差異性)
        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', 
            '#E7E9ED', '#4CAF50', '#FF5722', '#00BCD4'
        ];
        
        // 銷毀舊圖表實例
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }

        // 4. 創建新的 Chart 實例
        categoryChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right', // 讓圖例顯示在右邊，節省垂直空間
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                    label += Math.round(value).toLocaleString() + ' ₫ (' + percentage + ')';
                                }
                                return label;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: '總支出類別分佈 (以越南盾計)'
                    }
                }
            }
        });
    }

    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const category = document.getElementById('expenseCategory').value;
            // 🚀 NEW: 獲取日期
            const expenseDate = document.getElementById('expenseDate').value; 
            const description = document.getElementById('expenseDescription').value;
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const currency = document.getElementById('expenseCurrency').value;
            
            // V2.5 NEW: 獲取付款人和分攤人 (公費實作)
            const payer = document.getElementById('expensePayer').value; 
            
            let shareWith = [];
            // 只有在付款人是 '公費' 時才收集分攤人
            if (payer === '公費') {
                 document.querySelectorAll('input[name="shareWith"]:checked').forEach(checkbox => {
                     shareWith.push(checkbox.value);
                 });
            }

            if (isNaN(amount) || amount <= 0) {
                alert('請輸入有效金額');
                return;
            }

            const newItem = {
                category,
                expenseDate, // 🚀 NEW: 儲存日期
                description,
                amount,
                currency,
                payer, // V2.5 NEW: 儲存付款人
                shareWith, // V2.5 NEW: 儲存分攤人 (公費時有效)
                timestamp: new Date().toISOString()
            };
const payerSelect = document.getElementById('expensePayer');
const shareSection = document.getElementById('shareWithSection');

if (payerSelect && shareSection) {
    payerSelect.addEventListener('change', () => {
        // 如果選中「公費」，顯示分擔區塊，否則隱藏
        shareSection.style.display = (payerSelect.value === '公費') ? 'block' : 'none';
    });
}

            expenseItems.push(newItem);
            saveExpenses();
            // 在新增後重新渲染清單
            renderExpenseList();
// 🚀 新增這行：儲存後自動關閉抽屜
        toggleModal('expenseModal', false);
            
            // 為了方便連續輸入，只重設 description 和 amount
            document.getElementById('expenseDescription').value = '';
            document.getElementById('expenseAmount').value = '';
            // 重設付款人為第一個選項（A）
            document.getElementById('expensePayer').selectedIndex = 0; 
        });
    }

    
    // ------------------------------------
    // 8. 行李清單功能 (儲存、渲染、新增、刪除) (略，無改動)
    // ------------------------------------
    const addItemForm = document.getElementById('addItemForm');
    
    function savePackingList() {
        localStorage.setItem('packingListItems', JSON.stringify(packingItems));
    }

    function initializePackingList() {
        const storedItems = localStorage.getItem('packingListItems');
        if (storedItems) {
            packingItems = JSON.parse(storedItems);
        } else {
            // 預設清單內容 (若 localStorage 為空)
            packingItems = [
                { name: '護照', checked: false },
                { name: '手機充電器', checked: false }
            ];
        }
        renderPackingList();
    }

    function renderPackingList() {
        const pendingList = document.getElementById('pendingList');
        const checkedList = document.getElementById('checkedList');
        if (!pendingList || !checkedList) return;

        pendingList.innerHTML = '';
        checkedList.innerHTML = '';

        packingItems.forEach((item, index) => {
            const list = item.checked ? checkedList : pendingList;
            
            const li = document.createElement('li');
            li.className = item.checked ? 'checked-item' : '';
            li.innerHTML = `
                <div class="item-name">
                    <input type="checkbox" data-index="${index}" ${item.checked ? 'checked' : ''}>
                    <span class="item-text">${item.name}</span>
                </div>
                <button class="remove-btn" data-index="${index}">🗑️</button>
            `;
            list.appendChild(li);
        });

        // 綁定事件監聽器
        document.querySelectorAll('.packing-list input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = e.target.getAttribute('data-index');
                packingItems[index].checked = e.target.checked;
                savePackingList();
                renderPackingList(); // 重新渲染以將項目移動到正確的清單
            });
        });
        
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                packingItems.splice(index, 1);
                savePackingList();
                renderPackingList();
            });
        });
        
        // 顯示/隱藏空清單訊息 (如果你的 HTML 有這個元素)
        const emptyMessage = document.getElementById('packingEmptyMessage');
        if (emptyMessage) {
            if (packingItems.length === 0) {
                emptyMessage.style.display = 'block';
            } else {
                emptyMessage.style.display = 'none';
            }
        }
    }

    if (addItemForm) {
        addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('packingItemInput');
            const itemName = input.value.trim();
            
            if (itemName) {
                packingItems.push({ name: itemName, checked: false });
                savePackingList();
                renderPackingList();
                input.value = '';
            }
        });
    }

    // ------------------------------------\
    // 9. 啟動所有初始化函式
    // ------------------------------------\
    
    initializePackingList();
    initializeWeather(); 
    // V2.6 啟動時先執行一次總花費計算，避免 dashboard 數據為空
    calculateTotal(); 
    switchPage('homePage'); 

});

// 打開或關閉彈窗的功能
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = show ? 'block' : 'none';
    } else {
        console.error("找不到 ID 為 " + id + " 的彈窗！");
    }
}

// 修正消費明細渲染 (改成清單式而非表格)
function renderExpenseList() {
    const listContainer = document.getElementById('expenseList');
    if (!listContainer) return;

    // 先根據日期排序
    expenseItems.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));

    listContainer.innerHTML = expenseItems.map((item, index) => {
        const isTWD = item.currency === 'TWD';
        const displayVND = isTWD ? item.amount * EXCHANGE_RATE : item.amount;
        const displayTWD = isTWD ? item.amount : item.amount / EXCHANGE_RATE;

        return `
            <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: white; border-radius: 12px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div>
                    <div style="font-weight: bold; color: var(--primary-color);">${item.category} - ${item.description}</div>
                    <div style="font-size: 0.8rem; color: var(--subtle-text-color);">${item.expenseDate} · 付款人: ${item.payer}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold; color: var(--secondary-color);">${Math.round(displayVND).toLocaleString()} ₫</div>
                    <div style="font-size: 0.75rem; color: var(--accent-color);">≈ ${Math.round(displayTWD).toLocaleString()} TWD</div>
                    <button class="delete-btn" data-index="${index}" style="background: none; border: none; color: var(--danger-color); cursor: pointer; font-size: 0.8rem; padding-top: 5px;">[刪除]</button>
                </div>
            </div>
        `;
    }).join('');

    // 重新綁定刪除事件
    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.dataset.index;
            expenseItems.splice(idx, 1);
            saveExpenses();
            renderExpenseList();
            calculateTotal();
            if (typeof renderPieChart === 'function') renderPieChart();
        });
    });
}

// 原有的 toggleModal
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = show ? 'block' : 'none';
    }
}

// 🚀 新增：點擊彈窗外部背景自動關閉
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}