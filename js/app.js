/**
 * Heptabase Journal Web - Full Hybrid Application with KPI Hierarchy & Daily Reflection
 * Seamlessly combining Mini Calendar + Heptabase Block Actions & "變成" Submenu
 * Fully implementing:
 * 1. Security Login Screen with fixed credentials: danner03060302 / a230060 and "Remember Me"
 * 2. Year KPI ➔ Month Goal ➔ Daily Task hierarchy, Deletion, Rollover
 * 3. Excel (.csv) Export
 * 4. Daily 3 Fixed Reflection Fields: 肯定 (Affirmation), 感謝 (Gratitude), 學習/反省 (Learning/Reflection)
 */

(function () {
  'use strict';

  // --- Fixed Authentication Credentials ---
  const AUTH_CONFIG = {
    account: 'danner03060302',
    password: 'a230060'
  };

  // --- Initial / Default KPI Hierarchy Data ---
  const defaultKpiData = [
    {
      id: 'kpi-year-115',
      year: '115年',
      title: '115年度 AI 賦能與業務流程自動化',
      description: '全處導入 AI 輔助會議、日誌管理與 KPI 自動化追蹤',
      color: '#3b82f6',
      monthlyGoals: [
        {
          id: 'mg-2026-11-1',
          month: '2026-11',
          title: '完成 Heptabase 視覺化日誌與 KPI 連動機制',
          completed: false,
          rolledOver: false
        },
        {
          id: 'mg-2026-11-2',
          month: '2026-11',
          title: '建立部門主管會議 AI 智慧摘要材料規格',
          completed: true,
          rolledOver: false
        },
        {
          id: 'mg-2026-12-1',
          month: '2026-12',
          title: '部門全員上線試行並產出初版施政成果追蹤',
          completed: false,
          rolledOver: false
        }
      ]
    },
    {
      id: 'kpi-year-admin',
      year: '115年',
      title: '施政成果專刊與跨組專案管制',
      description: '落實施政成果提報準時率 100% 與專案管考',
      color: '#10b981',
      monthlyGoals: [
        {
          id: 'mg-2026-11-3',
          month: '2026-11',
          title: '初稿彙整與各業務科室初審',
          completed: true,
          rolledOver: false
        },
        {
          id: 'mg-2026-12-2',
          month: '2026-12',
          title: '專刊排版印刷及成果提報主管會報',
          completed: false,
          rolledOver: false
        }
      ]
    }
  ];

  // --- State ---
  const state = {
    theme: localStorage.getItem('heptabase_theme') || 'light',
    selectedDate: getTodayString(), // 'YYYY-MM-DD'
    currentMonth: new Date(),
    journalData: {}, // { 'YYYY-MM-DD': { blocks: [...], reflection: { affirmation, gratitude, learning }, tags: [] } }
    kpiYears: JSON.parse(localStorage.getItem('heptabase_kpi_years')) || defaultKpiData,
    activeBlock: null,
    menuSearchQuery: ''
  };

  // --- Date Helpers ---
  function getTodayString() {
    const d = new Date();
    return formatDateKey(d);
  }

  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(key) {
    const parts = key.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  function formatDisplayDate(dateKey) {
    const d = parseDateKey(dateKey);
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const weekday = weekdays[d.getDay()];
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return {
      title: `${y}年${m}月${day}日`,
      weekday: weekday,
      full: `${y}年${m}月${day}日 ${weekday}`,
      isToday: dateKey === getTodayString()
    };
  }

  function getDayAbbr(date) {
    const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return letters[date.getDay()];
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // --- Local Storage Management ---
  const STORAGE_KEY = 'heptabase_journal_v2_db';

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state.journalData = JSON.parse(raw);
      } else {
        initSampleData();
      }
    } catch (e) {
      console.error('Failed to load data:', e);
      initSampleData();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.journalData));
      localStorage.setItem('heptabase_kpi_years', JSON.stringify(state.kpiYears));
      renderCalendar();
      renderRecentList();
      renderKpiTree();
      renderDateStrip();
      updateDayFooterMetrics();
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  }

  function initSampleData() {
    const today = getTodayString();
    const yesterday = formatDateKey(new Date(Date.now() - 86400000));

    state.journalData[today] = {
      reflection: {
        affirmation: '今天成功釐清了年誌、月誌與日誌的邏輯結構，並完成系統核心架構調整！',
        gratitude: '感謝團隊夥伴在主管會議資料準備上的即時協作與各業務科室的配合。',
        learning: '在規劃目標時，先定義好頂層指標 (KPI) 再向下拆解至每日任務，推動起來目標最清晰。'
      },
      blocks: [
        {
          id: 'b1',
          type: 'h1',
          content: '今日部門工作推動與 KPI 連動日誌',
          checked: false
        },
        {
          id: 'b2',
          type: 'todo',
          content: '建置日誌系統「年誌(KPI) ➔ 月誌目標 ➔ 日誌工作」關聯邏輯',
          checked: true,
          kpiRef: { yearId: 'kpi-year-115', monthGoalId: 'mg-2026-11-1' }
        },
        {
          id: 'b3',
          type: 'todo',
          content: '確認施政成果專刊各業務科室初審進度',
          checked: true,
          kpiRef: { yearId: 'kpi-year-admin', monthGoalId: 'mg-2026-11-3' }
        },
        {
          id: 'b4',
          type: 'todo',
          content: '規劃主管會議 KPI 達成率儀表板材料並匯出 Excel',
          checked: false,
          kpiRef: { yearId: 'kpi-year-115', monthGoalId: 'mg-2026-11-2' }
        },
        {
          id: 'b5',
          type: 'quote',
          content: '「以年度 KPI 為燈塔，按月落實，每日扎實記錄推進。」',
          checked: false
        }
      ],
      tags: ['115年KPI', 'AI應用']
    };

    state.journalData[yesterday] = {
      reflection: {
        affirmation: '準時完成會議簡報初稿審核。',
        gratitude: '感謝長官與同仁提供寶貴的修改建議。',
        learning: '提早確認跨組共識可以大幅減少後續重複修改的時間。'
      },
      blocks: [
        { id: 'by1', type: 'h2', content: '主管會議準備', checked: false },
        { id: 'by2', type: 'paragraph', content: '整理會議材料與專案進度追蹤。', checked: false }
      ],
      tags: ['會議']
    };

    saveData();
  }

  // --- Elements ---
  const els = {
    // Login Screen
    loginOverlay: document.getElementById('login-overlay'),
    loginForm: document.getElementById('login-form'),
    loginAccount: document.getElementById('login-account'),
    loginPassword: document.getElementById('login-password'),
    loginRemember: document.getElementById('login-remember'),
    loginErrorMsg: document.getElementById('login-error-msg'),
    loginErrorText: document.getElementById('login-error-text'),
    btnDoLogin: document.getElementById('btn-do-login'),
    btnLogout: document.getElementById('btn-logout'),

    // Left Calendar & Navigation
    calendarMonthTitle: document.getElementById('calendar-month-title'),
    calendarDays: document.getElementById('calendar-days'),
    calendarPrevBtn: document.getElementById('cal-prev-btn'),
    calendarNextBtn: document.getElementById('cal-next-btn'),
    recentList: document.getElementById('recent-list'),
    kpiYearList: document.getElementById('kpi-year-list'),
    btnAddYearKpi: document.getElementById('btn-add-year-kpi'),
    btnOpenKpiReport: document.getElementById('btn-open-kpi-report'),
    btnTopKpiReport: document.getElementById('btn-top-kpi-report'),
    btnTopExportExcel: document.getElementById('btn-top-export-excel'),
    btnModalExportExcel: document.getElementById('btn-modal-export-excel'),
    searchInput: document.getElementById('search-input'),
    navToday: document.getElementById('nav-today'),
    navYesterday: document.getElementById('nav-yesterday'),
    navTomorrow: document.getElementById('nav-tomorrow'),

    // Top Bar
    dateStrip: document.getElementById('date-strip'),
    dateStripPrev: document.getElementById('date-strip-prev'),
    dateStripNext: document.getElementById('date-strip-next'),
    btnTodayDropdown: document.getElementById('btn-today-dropdown'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),

    // Main Content
    journalContentBox: document.getElementById('journal-content-box'),

    // Menu Popup
    blockMenuContainer: document.getElementById('block-menu-container'),
    primaryMenu: document.getElementById('primary-menu'),
    submenuTurnInto: document.getElementById('submenu-turn-into'),
    submenuLinkKpi: document.getElementById('submenu-link-kpi'),
    kpiPickerOptions: document.getElementById('kpi-picker-options'),
    menuSearchInput: document.getElementById('menu-search-input'),

    // Modal Report
    modalKpiReport: document.getElementById('modal-kpi-report'),
    kpiReportContent: document.getElementById('kpi-report-content'),
    btnCloseKpiReport: document.getElementById('btn-close-kpi-report'),

    // Backup & Space
    btnExportBackup: document.getElementById('btn-export-backup'),
    btnImportBackup: document.getElementById('btn-import-backup'),
    fileInput: document.getElementById('file-input'),
    spaceNameDisplay: document.getElementById('space-name-display'),
    toast: document.getElementById('toast')
  };

  // =========================================================
  // AUTHENTICATION LOGIC (登入畫面與記憶帳密)
  // =========================================================
  function initAuth() {
    const isRemembered = localStorage.getItem('heptabase_remember') === 'true';
    const savedAcc = localStorage.getItem('heptabase_saved_acc') || '';
    const savedPwd = localStorage.getItem('heptabase_saved_pwd') || '';
    const isLoggedInLocal = localStorage.getItem('heptabase_logged_in') === 'true';
    const isLoggedInSession = sessionStorage.getItem('heptabase_logged_in') === 'true';

    if (isRemembered && savedAcc) {
      els.loginAccount.value = savedAcc;
      els.loginPassword.value = savedPwd;
      els.loginRemember.checked = true;
    }

    // Auto-login if remembered and was previously logged in
    if ((isRemembered && isLoggedInLocal) || isLoggedInSession) {
      els.loginOverlay.classList.add('hidden');
    } else {
      els.loginOverlay.classList.remove('hidden');
      setTimeout(() => {
        if (!els.loginAccount.value) els.loginAccount.focus();
        else els.loginPassword.focus();
      }, 100);
    }

    // Submit handler
    els.btnDoLogin.addEventListener('click', handleLogin);
    els.loginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    els.loginAccount.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });

    // Logout handler
    els.btnLogout.addEventListener('click', handleLogout);
  }

  function handleLogin() {
    const acc = els.loginAccount.value.trim();
    const pwd = els.loginPassword.value.trim();
    const remember = els.loginRemember.checked;

    if (acc === AUTH_CONFIG.account && pwd === AUTH_CONFIG.password) {
      // Login Success
      els.loginErrorMsg.classList.remove('active');

      if (remember) {
        localStorage.setItem('heptabase_logged_in', 'true');
        localStorage.setItem('heptabase_remember', 'true');
        localStorage.setItem('heptabase_saved_acc', acc);
        localStorage.setItem('heptabase_saved_pwd', pwd);
      } else {
        sessionStorage.setItem('heptabase_logged_in', 'true');
        localStorage.removeItem('heptabase_logged_in');
        localStorage.removeItem('heptabase_remember');
        localStorage.removeItem('heptabase_saved_acc');
        localStorage.removeItem('heptabase_saved_pwd');
      }

      els.loginOverlay.classList.add('hidden');
      showToast('登入成功，歡迎回來！');
    } else {
      // Login Failed
      els.loginErrorMsg.classList.add('active');
      els.loginErrorText.textContent = '帳號或密碼錯誤，請重新輸入';
      els.loginPassword.focus();
      els.loginPassword.select();
    }
  }

  function handleLogout() {
    if (confirm('確定要登出系統嗎？')) {
      sessionStorage.removeItem('heptabase_logged_in');
      localStorage.removeItem('heptabase_logged_in');
      els.loginOverlay.classList.remove('hidden');
      showToast('已安全登出');
    }
  }

  // --- Theme Management ---
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('heptabase_theme', theme);
  }

  // --- Calendar Component ---
  function renderCalendar() {
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();

    els.calendarMonthTitle.textContent = `${year}年 ${month + 1}月`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    let html = '';

    for (let x = firstDayIndex; x > 0; x--) {
      const d = prevLastDate - x + 1;
      const prevDateKey = formatDateKey(new Date(year, month - 1, d));
      html += `<div class="calendar-day other-month" data-date="${prevDateKey}">${d}</div>`;
    }

    const todayKey = getTodayString();
    for (let i = 1; i <= lastDate; i++) {
      const dateKey = formatDateKey(new Date(year, month, i));
      const isToday = dateKey === todayKey;
      const isSelected = dateKey === state.selectedDate;
      const dayData = state.journalData[dateKey];
      const hasEntry = !!(dayData && ((dayData.blocks && dayData.blocks.some(b => b.content && b.content.trim())) || (dayData.reflection && (dayData.reflection.affirmation || dayData.reflection.gratitude || dayData.reflection.learning))));

      let classes = ['calendar-day'];
      if (isToday) classes.push('today');
      if (isSelected) classes.push('selected');
      if (hasEntry) classes.push('has-entry');

      html += `<div class="${classes.join(' ')}" data-date="${dateKey}">${i}</div>`;
    }

    const totalCells = firstDayIndex + lastDate;
    const remaining = (totalCells > 35 ? 42 : 35) - totalCells;
    for (let j = 1; j <= remaining; j++) {
      const nextDateKey = formatDateKey(new Date(year, month + 1, j));
      html += `<div class="calendar-day other-month" data-date="${nextDateKey}">${j}</div>`;
    }

    els.calendarDays.innerHTML = html;

    els.calendarDays.querySelectorAll('.calendar-day').forEach(el => {
      el.addEventListener('click', () => {
        selectDate(el.getAttribute('data-date'));
      });
    });
  }

  // --- Recent Days List ---
  function renderRecentList() {
    const dates = Object.keys(state.journalData).sort().reverse();
    if (dates.length === 0) {
      els.recentList.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:4px 6px;">尚無日誌記錄</div>`;
      return;
    }

    let html = '';
    const today = getTodayString();
    dates.slice(0, 6).forEach(dateKey => {
      const info = formatDisplayDate(dateKey);
      const isActive = dateKey === state.selectedDate;
      const badge = dateKey === today ? '<span style="font-size:10px; background:var(--accent-light); color:var(--accent); padding:1px 5px; border-radius:10px;">今天</span>' : '';

      html += `
        <div class="recent-item ${isActive ? 'active' : ''}" data-date="${dateKey}">
          <span>${info.title} (${info.weekday})</span>
          ${badge}
        </div>
      `;
    });

    els.recentList.innerHTML = html;

    els.recentList.querySelectorAll('.recent-item').forEach(el => {
      el.addEventListener('click', () => {
        selectDate(el.getAttribute('data-date'));
      });
    });
  }

  // =========================================================
  // KPI HIERARCHY TREE
  // =========================================================
  function renderKpiTree() {
    if (!els.kpiYearList) return;
    if (!state.kpiYears || state.kpiYears.length === 0) {
      els.kpiYearList.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px;text-align:center;">點擊上方「＋」新增年度 KPI</div>`;
      return;
    }

    let html = '';
    state.kpiYears.forEach((kpi, kpiIdx) => {
      const totalGoals = kpi.monthlyGoals.length;
      const completedGoals = kpi.monthlyGoals.filter(m => m.completed).length;
      const progressPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

      html += `
        <div class="kpi-year-card open" data-kpi-id="${kpi.id}" data-idx="${kpiIdx}">
          <div class="kpi-year-header">
            <div class="kpi-year-title-box" title="點擊展開/收合月目標">
              <span class="kpi-year-toggle">▶</span>
              <span class="kpi-year-name">${escapeHtml(kpi.title)}</span>
            </div>
            <div class="kpi-year-actions">
              <span class="kpi-badge-tag">${escapeHtml(kpi.year || '年度')}</span>
              <button class="btn-kpi-action btn-kpi-edit" title="修改年度 KPI 名稱" data-kpi-idx="${kpiIdx}">✏️</button>
              <button class="btn-kpi-action btn-kpi-delete" title="刪除此年度 KPI (年誌工作)" data-kpi-idx="${kpiIdx}">🗑️</button>
            </div>
          </div>

          <div class="kpi-progress-bar-bg" title="達成率 ${progressPercent}%">
            <div class="kpi-progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
          
          <div class="kpi-year-meta">
            <span>月目標：${completedGoals} / ${totalGoals} 完成</span>
            <span style="font-weight: 600; color: var(--accent);">${progressPercent}%</span>
          </div>

          <div class="kpi-months-list">
      `;

      kpi.monthlyGoals.forEach((mg, mgIdx) => {
        const monthLabel = mg.month ? mg.month.split('-')[1] + '月' : '本月';
        const isRolled = mg.rolledOver ? '<span style="color:#f59e0b;font-size:10px;">(展延)</span>' : '';

        html += `
          <div class="kpi-month-item ${mg.completed ? 'completed' : ''}" data-mg-id="${mg.id}">
            <input type="checkbox" class="kpi-month-check" ${mg.completed ? 'checked' : ''} title="標記完成">
            <div class="kpi-month-content">
              <span class="kpi-month-badge">${monthLabel}</span>
              <span class="kpi-month-text">${escapeHtml(mg.title)} ${isRolled}</span>
            </div>
            <div class="kpi-month-actions">
              ${!mg.completed ? `<button class="btn-rollover-month" title="未完成：一鍵展延至下月繼續完成" data-kpi-idx="${kpiIdx}" data-mg-idx="${mgIdx}">↪ 展延</button>` : ''}
              <button class="project-tab-action-btn btn-del-month" title="刪除此月目標" data-kpi-idx="${kpiIdx}" data-mg-idx="${mgIdx}">✕</button>
            </div>
          </div>
        `;
      });

      html += `
            <button class="btn-add-month-goal" data-kpi-idx="${kpiIdx}">+ 新增月誌工作目標</button>
          </div>
        </div>
      `;
    });

    els.kpiYearList.innerHTML = html;
    setupKpiTreeListeners();
  }

  function setupKpiTreeListeners() {
    document.querySelectorAll('.kpi-year-title-box').forEach(box => {
      box.addEventListener('click', () => {
        const card = box.closest('.kpi-year-card');
        card.classList.toggle('open');
      });
    });

    document.querySelectorAll('.btn-kpi-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kpiIdx = parseInt(btn.getAttribute('data-kpi-idx'), 10);
        const kpi = state.kpiYears[kpiIdx];
        const newTitle = prompt('請修改年度 KPI (年誌工作) 名稱：', kpi.title);
        if (newTitle && newTitle.trim()) {
          kpi.title = newTitle.trim();
          saveData();
          showToast('已更新年度 KPI');
        }
      });
    });

    document.querySelectorAll('.btn-kpi-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kpiIdx = parseInt(btn.getAttribute('data-kpi-idx'), 10);
        const kpi = state.kpiYears[kpiIdx];
        if (confirm(`確定要刪除「${kpi.title}」這項年度 KPI 及其所有月目標嗎？\n（相關日誌紀錄仍會保留，僅解除該 KPI 的鏈結）`)) {
          const removedId = kpi.id;
          state.kpiYears.splice(kpiIdx, 1);

          Object.keys(state.journalData).forEach(dateKey => {
            const day = state.journalData[dateKey];
            if (day.blocks) {
              day.blocks.forEach(b => {
                if (b.kpiRef && b.kpiRef.yearId === removedId) {
                  b.kpiRef = null;
                }
              });
            }
          });

          saveData();
          renderJournalDay();
          showToast('已成功刪除年度 KPI');
        }
      });
    });

    document.querySelectorAll('.kpi-month-check').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const item = e.target.closest('.kpi-month-item');
        const card = e.target.closest('.kpi-year-card');
        const kpiIdx = parseInt(card.getAttribute('data-idx'), 10);
        const mgId = item.getAttribute('data-mg-id');

        const kpi = state.kpiYears[kpiIdx];
        const mg = kpi.monthlyGoals.find(m => m.id === mgId);
        if (mg) {
          mg.completed = e.target.checked;
          saveData();
          showToast(mg.completed ? `已完成月目標：${mg.title}` : `設為進行中`);
        }
      });
    });

    document.querySelectorAll('.btn-rollover-month').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kpiIdx = parseInt(btn.getAttribute('data-kpi-idx'), 10);
        const mgIdx = parseInt(btn.getAttribute('data-mg-idx'), 10);
        const kpi = state.kpiYears[kpiIdx];
        const mg = kpi.monthlyGoals[mgIdx];

        if (mg && !mg.completed) {
          const curMonth = mg.month || '2026-11';
          const parts = curMonth.split('-');
          let y = parseInt(parts[0], 10);
          let m = parseInt(parts[1], 10);
          m++;
          if (m > 12) { m = 1; y++; }
          const nextMonthStr = `${y}-${String(m).padStart(2, '0')}`;

          const confirmMove = confirm(`將未完成的月目標「${mg.title}」\n展延至下個月 (${m}月) 繼續完成？`);
          if (confirmMove) {
            mg.month = nextMonthStr;
            mg.rolledOver = true;
            saveData();
            showToast(`已成功將工作移至 ${m} 月繼續執行！`);
          }
        }
      });
    });

    document.querySelectorAll('.btn-del-month').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kpiIdx = parseInt(btn.getAttribute('data-kpi-idx'), 10);
        const mgIdx = parseInt(btn.getAttribute('data-mg-idx'), 10);
        if (confirm('確定要刪除此月目標嗎？')) {
          state.kpiYears[kpiIdx].monthlyGoals.splice(mgIdx, 1);
          saveData();
          showToast('已刪除月目標');
        }
      });
    });

    document.querySelectorAll('.btn-add-month-goal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kpiIdx = parseInt(btn.getAttribute('data-kpi-idx'), 10);
        const kpi = state.kpiYears[kpiIdx];
        const title = prompt(`【${kpi.title}】\n請輸入新增的月誌工作目標：`);
        if (title && title.trim()) {
          const monthStr = prompt('請輸入月份（如 2026-11 或 11）：', '2026-11');
          const cleanMonth = (monthStr && monthStr.includes('-')) ? monthStr.trim() : `2026-${String(monthStr || '11').padStart(2, '0')}`;

          kpi.monthlyGoals.push({
            id: 'mg-' + Date.now(),
            month: cleanMonth,
            title: title.trim(),
            completed: false,
            rolledOver: false
          });
          saveData();
          showToast(`已新增月目標：${title.trim()}`);
        }
      });
    });
  }

  // --- Top Date Strip Navigation ---
  function renderDateStrip() {
    els.dateStrip.innerHTML = '';
    const center = parseDateKey(state.selectedDate);
    const daysToShow = [];

    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(center.getTime() + offset * 86400000);
      daysToShow.push(d);
    }

    daysToShow.forEach(date => {
      const key = formatDateKey(date);
      const isSelected = key === state.selectedDate;
      const dayNum = date.getDate();
      const dayLetter = getDayAbbr(date);
      const hasContent = state.journalData[key] && ((state.journalData[key].blocks && state.journalData[key].blocks.some(b => b.content && b.content.trim())) || (state.journalData[key].reflection && (state.journalData[key].reflection.affirmation || state.journalData[key].reflection.gratitude || state.journalData[key].reflection.learning)));

      const btn = document.createElement('div');
      btn.className = `date-strip-item ${isSelected ? 'active' : ''} ${hasContent ? 'has-content' : ''}`;
      btn.setAttribute('data-date', key);
      btn.textContent = `${dayLetter} ${dayNum}`;

      btn.addEventListener('click', () => {
        selectDate(key);
      });

      els.dateStrip.appendChild(btn);
    });
  }

  // --- Select Date ---
  function selectDate(dateKey) {
    state.selectedDate = dateKey;
    state.currentMonth = parseDateKey(dateKey);

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (dateKey === getTodayString()) els.navToday.classList.add('active');

    renderCalendar();
    renderRecentList();
    renderDateStrip();
    renderJournalDay();
  }

  // =========================================================
  // RENDER DAY CONTENT + 每日三個固定欄位 (肯定、感謝、學習/反省)
  // =========================================================
  function renderJournalDay() {
    closeMenu();
    const dateKey = state.selectedDate;
    const dateObj = parseDateKey(dateKey);
    const dayNum = dateObj.getDate();

    if (!state.journalData[dateKey]) {
      state.journalData[dateKey] = {
        reflection: { affirmation: '', gratitude: '', learning: '' },
        blocks: [{ id: 'b-' + Date.now(), type: 'paragraph', content: '', checked: false }],
        tags: []
      };
    }

    const dayData = state.journalData[dateKey];
    if (!dayData.reflection) {
      dayData.reflection = { affirmation: '', gratitude: '', learning: '' };
    }

    els.journalContentBox.innerHTML = `
      <div class="day-section" id="day-section-${dateKey}">
        <div class="day-header">
          <h1 class="day-title">${dayNum}日</h1>
          <button class="ai-badge-btn" id="btn-day-kpi-filter" style="font-size:11.5px; padding:3px 8px;" title="點擊檢視今日與年度KPI的關聯">
            <span>🎯 檢視今日 KPI 關聯</span>
          </button>
        </div>

        <!-- 每日固定三個核心欄位：肯定、感謝、學習(反省) -->
        <div class="daily-reflection-container">
          <div class="daily-reflection-header">
            <span>🌱 每日覆盤與心態沉澱 (Daily Reflection)</span>
            <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">自動儲存</span>
          </div>
          <div class="daily-reflection-grid">
            <!-- 1. 肯定 -->
            <div class="reflection-card">
              <div class="reflection-card-title card-affirmation">
                <span>🌟</span>
                <span>1. 肯定 (Affirmation)</span>
              </div>
              <textarea class="reflection-input" data-field="affirmation" placeholder="寫下今天值得肯定自己的一件事...">${escapeHtml(dayData.reflection.affirmation || '')}</textarea>
            </div>

            <!-- 2. 感謝 -->
            <div class="reflection-card">
              <div class="reflection-card-title card-gratitude">
                <span>🙏</span>
                <span>2. 感謝 (Gratitude)</span>
              </div>
              <textarea class="reflection-input" data-field="gratitude" placeholder="寫下今天由衷感謝的人事物...">${escapeHtml(dayData.reflection.gratitude || '')}</textarea>
            </div>

            <!-- 3. 學習(反省) -->
            <div class="reflection-card">
              <div class="reflection-card-title card-learning">
                <span>💡</span>
                <span>3. 學習 (反省)</span>
              </div>
              <textarea class="reflection-input" data-field="learning" placeholder="寫下今天的心得學習或改進反省...">${escapeHtml(dayData.reflection.learning || '')}</textarea>
            </div>
          </div>
        </div>

        <!-- Freeform Blocks Editor -->
        <div class="day-editor" id="day-editor">
          <!-- Blocks rendered here -->
        </div>

        <div class="day-footer">
          <div class="day-footer-left">
            <button class="btn-add-tag" id="btn-add-tag">+ 新增標籤...</button>
            <div id="tags-container" style="display:inline-flex; gap:6px;"></div>
          </div>
          <div class="day-footer-right">
            <span id="word-count-metrics">0個字 0個字符</span>
            <button class="btn-hide-day" id="btn-hide-day">隱藏</button>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.reflection-input').forEach(textarea => {
      textarea.addEventListener('input', debounce((e) => {
        const field = e.target.getAttribute('data-field');
        dayData.reflection[field] = e.target.value;
        saveData();
      }, 300));
    });

    const editorEl = document.getElementById('day-editor');
    if (!dayData.blocks || dayData.blocks.length === 0) {
      dayData.blocks = [{ id: 'b-' + Date.now(), type: 'paragraph', content: '', checked: false }];
    }

    dayData.blocks.forEach(blockData => {
      const row = createBlockElement(blockData);
      editorEl.appendChild(row);
    });

    renderTags(dayData.tags || []);
    updateDayFooterMetrics();

    document.getElementById('btn-add-tag').addEventListener('click', () => {
      const tag = prompt('請輸入標籤名稱：');
      if (tag && tag.trim()) {
        if (!dayData.tags) dayData.tags = [];
        if (!dayData.tags.includes(tag.trim())) {
          dayData.tags.push(tag.trim());
          saveData();
          renderTags(dayData.tags);
        }
      }
    });

    document.getElementById('btn-day-kpi-filter').addEventListener('click', () => {
      openKpiReportModal();
    });

    document.getElementById('btn-hide-day').addEventListener('click', () => {
      showToast('日誌已收合');
    });
  }

  function renderTags(tags) {
    const container = document.getElementById('tags-container');
    if (!container) return;
    container.innerHTML = '';
    tags.forEach(t => {
      const chip = document.createElement('span');
      chip.className = 'tag-badge';
      chip.textContent = `#${t}`;
      chip.title = '點擊移除標籤';
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', () => {
        const dayData = state.journalData[state.selectedDate];
        if (dayData && dayData.tags) {
          dayData.tags = dayData.tags.filter(x => x !== t);
          saveData();
          renderTags(dayData.tags);
        }
      });
      container.appendChild(chip);
    });
  }

  function updateDayFooterMetrics() {
    const metricsEl = document.getElementById('word-count-metrics');
    if (!metricsEl) return;
    const dayData = state.journalData[state.selectedDate];
    if (!dayData) {
      metricsEl.textContent = '0個字 0個字符';
      return;
    }

    let totalChars = 0;
    let totalWords = 0;

    if (dayData.reflection) {
      const refText = `${dayData.reflection.affirmation || ''} ${dayData.reflection.gratitude || ''} ${dayData.reflection.learning || ''}`.trim();
      totalChars += refText.length;
      if (refText) totalWords += refText.split(/\s+/).filter(Boolean).length;
    }

    if (dayData.blocks) {
      dayData.blocks.forEach(b => {
        const text = (b.content || '').trim();
        totalChars += text.length;
        if (text) totalWords += text.split(/\s+/).filter(Boolean).length;
      });
    }

    metricsEl.textContent = `${totalWords}個字 ${totalChars}個字符`;
  }

  // --- Create Block Element with KPI Link Pill ---
  function createBlockElement(blockData) {
    const row = document.createElement('div');
    row.className = 'editor-block-row';
    row.setAttribute('data-id', blockData.id);
    row.setAttribute('data-type', blockData.type);
    if (blockData.checked) row.classList.add('checked');

    const gutter = document.createElement('div');
    gutter.className = 'block-gutter';
    gutter.innerHTML = `
      <button class="gutter-btn gutter-btn-add" title="在下方新增區塊">+</button>
      <button class="gutter-btn gutter-btn-handle" title="區塊選項與變成選單">⋮⋮</button>
    `;

    gutter.querySelector('.gutter-btn-add').addEventListener('click', (e) => {
      e.stopPropagation();
      addNewBlockAfter(row);
    });

    const handleBtn = gutter.querySelector('.gutter-btn-handle');
    handleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openBlockMenu(row, handleBtn);
    });

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'block-content-wrapper';

    renderBlockAdornment(row, contentWrapper, blockData);

    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.innerHTML = escapeHtml(blockData.content || '');

    content.addEventListener('input', () => {
      blockData.content = content.innerText;
      saveData();
    });

    setupBlockKeyboard(row, content, blockData);

    contentWrapper.appendChild(content);

    if (blockData.kpiRef && blockData.kpiRef.yearId) {
      const kpiPill = createKpiPill(blockData.kpiRef);
      if (kpiPill) contentWrapper.appendChild(kpiPill);
    }

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openBlockMenu(row, e);
    });

    row.appendChild(gutter);
    row.appendChild(contentWrapper);

    return row;
  }

  function createKpiPill(kpiRef) {
    const kpi = state.kpiYears.find(k => k.id === kpiRef.yearId);
    if (!kpi) return null;

    let mgTitle = '';
    if (kpiRef.monthGoalId) {
      const mg = kpi.monthlyGoals.find(m => m.id === kpiRef.monthGoalId);
      if (mg) mgTitle = ` / ${mg.month ? mg.month.split('-')[1] + '月' : '月目標'}`;
    }

    const pill = document.createElement('span');
    pill.className = 'block-kpi-pill';
    pill.innerHTML = `🎯 ${escapeHtml(kpi.title)}${mgTitle}`;
    pill.title = '點擊檢視此 KPI 與月目標進度報表';
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      openKpiReportModal(kpi.id);
    });
    return pill;
  }

  function renderBlockAdornment(row, wrapper, blockData) {
    const type = blockData.type;

    if (type === 'todo') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-check-input';
      checkbox.checked = !!blockData.checked;
      checkbox.addEventListener('change', () => {
        blockData.checked = checkbox.checked;
        if (checkbox.checked) row.classList.add('checked');
        else row.classList.remove('checked');
        saveData();
      });
      wrapper.appendChild(checkbox);
    } else if (type === 'bullet') {
      const dot = document.createElement('span');
      dot.className = 'bullet-dot';
      dot.textContent = '•';
      wrapper.appendChild(dot);
    } else if (type === 'number') {
      const num = document.createElement('span');
      num.className = 'number-prefix';
      const index = Array.from(row.parentElement ? row.parentElement.children : []).indexOf(row) + 1;
      num.textContent = `${index > 0 ? index : 1}.`;
      wrapper.appendChild(num);
    } else if (type === 'toggle' || type === 'toggle-h1' || type === 'toggle-h2' || type === 'toggle-h3') {
      const arrow = document.createElement('span');
      arrow.className = 'toggle-arrow';
      arrow.textContent = '▶';
      arrow.addEventListener('click', () => {
        row.classList.toggle('toggle-open');
      });
      wrapper.appendChild(arrow);
    }
  }

  function setupBlockKeyboard(row, content, blockData) {
    content.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addNewBlockAfter(row);
        return;
      }

      if (e.key === 'Backspace' && content.innerText.trim() === '') {
        const prevRow = row.previousElementSibling;
        if (prevRow && prevRow.classList.contains('editor-block-row')) {
          e.preventDefault();
          removeBlock(row);
          const prevContent = prevRow.querySelector('.block-content');
          if (prevContent) {
            prevContent.focus();
            setCursorToEnd(prevContent);
          }
        }
      }

      if (e.key === ' ' || e.key === 'Spacebar') {
        const text = content.innerText;
        if (text === '#') {
          e.preventDefault();
          content.innerText = '';
          transformBlockType(row, 'h1');
        } else if (text === '##') {
          e.preventDefault();
          content.innerText = '';
          transformBlockType(row, 'h2');
        } else if (text === '###') {
          e.preventDefault();
          content.innerText = '';
          transformBlockType(row, 'h3');
        } else if (text === '[]' || text === '- [ ]') {
          e.preventDefault();
          content.innerText = '';
          transformBlockType(row, 'todo');
        } else if (text === '-' || text === '*') {
          e.preventDefault();
          content.innerText = '';
          transformBlockType(row, 'bullet');
        } else if (text === '1.') {
          e.preventDefault();
          content.innerText = '';
          transformBlockType(row, 'number');
        } else if (text === '>') {
          e.preventDefault();
          content.innerText = '';
          transformBlockType(row, 'quote');
        }
      }
    });
  }

  function addNewBlockAfter(targetRow) {
    const dayData = state.journalData[state.selectedDate];
    const newId = 'b-' + Date.now();
    const newBlock = { id: newId, type: 'paragraph', content: '', checked: false };

    const targetId = targetRow.getAttribute('data-id');
    const idx = dayData.blocks.findIndex(b => b.id === targetId);

    if (idx !== -1) {
      dayData.blocks.splice(idx + 1, 0, newBlock);
    } else {
      dayData.blocks.push(newBlock);
    }

    const newRow = createBlockElement(newBlock);
    targetRow.after(newRow);
    saveData();

    const newContent = newRow.querySelector('.block-content');
    if (newContent) newContent.focus();
  }

  function removeBlock(row) {
    const id = row.getAttribute('data-id');
    const dayData = state.journalData[state.selectedDate];
    dayData.blocks = dayData.blocks.filter(b => b.id !== id);
    row.remove();
    saveData();
    closeMenu();
  }

  // --- Transform Block Type ("變成") ---
  function transformBlockType(row, newType) {
    const id = row.getAttribute('data-id');
    const dayData = state.journalData[state.selectedDate];
    const blockData = dayData.blocks.find(b => b.id === id);
    if (!blockData) return;

    blockData.type = newType;
    row.setAttribute('data-type', newType);

    const wrapper = row.querySelector('.block-content-wrapper');
    const content = row.querySelector('.block-content');
    const existingContentText = content ? content.innerText : blockData.content;

    wrapper.innerHTML = '';
    renderBlockAdornment(row, wrapper, blockData);

    const newContentEl = document.createElement('div');
    newContentEl.className = 'block-content';
    newContentEl.contentEditable = 'true';
    newContentEl.innerText = existingContentText;

    newContentEl.addEventListener('input', () => {
      blockData.content = newContentEl.innerText;
      saveData();
    });

    setupBlockKeyboard(row, newContentEl, blockData);
    wrapper.appendChild(newContentEl);

    if (blockData.kpiRef && blockData.kpiRef.yearId) {
      const kpiPill = createKpiPill(blockData.kpiRef);
      if (kpiPill) wrapper.appendChild(kpiPill);
    }

    saveData();
    closeMenu();

    newContentEl.focus();
    setCursorToEnd(newContentEl);
    showToast(`已轉換為 ${getTypeDisplayName(newType)}`);
  }

  function getTypeDisplayName(type) {
    const map = {
      paragraph: '文字',
      h1: '標題 1',
      h2: '標題 2',
      h3: '標題 3',
      todo: '待辦事項清單',
      bullet: '重點清單',
      number: '號碼列表',
      toggle: '切換列表',
      quote: '引用',
      code: '程式碼區塊',
      math: '數學模組',
      'toggle-h1': '切換標題 1',
      'toggle-h2': '切換標題 2',
      'toggle-h3': '切換標題 3'
    };
    return map[type] || type;
  }

  // --- Block Context Menu & KPI Selector Submenu ---
  function openBlockMenu(row, triggerEventOrElement) {
    document.querySelectorAll('.editor-block-row.highlighted').forEach(el => el.classList.remove('highlighted'));

    row.classList.add('highlighted');
    state.activeBlock = row;

    const container = els.blockMenuContainer;
    const currentType = row.getAttribute('data-type') || 'paragraph';

    document.querySelectorAll('.submenu-checkmark').forEach(chk => chk.style.display = 'none');
    const activeChk = document.getElementById(`chk-${currentType}`);
    if (activeChk) activeChk.style.display = 'inline-block';

    let top, left;
    if (triggerEventOrElement.getBoundingClientRect) {
      const rect = triggerEventOrElement.getBoundingClientRect();
      top = rect.bottom + window.scrollY + 4;
      left = rect.left + window.scrollX;
    } else {
      top = triggerEventOrElement.clientY + window.scrollY + 4;
      left = triggerEventOrElement.clientX + window.scrollX;
    }

    const maxLeft = window.innerWidth - 460;
    if (left > maxLeft) left = maxLeft;

    container.style.top = `${top}px`;
    container.style.left = `${left}px`;
    container.classList.add('active');

    els.submenuTurnInto.style.display = 'block';
    els.submenuLinkKpi.style.display = 'none';

    els.menuSearchInput.value = '';
    filterMenuItems('');

    populateKpiPickerSubmenu();
  }

  function populateKpiPickerSubmenu() {
    if (!els.kpiPickerOptions) return;
    let html = `
      <div class="submenu-item" id="opt-clear-kpi" style="color:var(--text-muted);">
        <span>❌ 取消關聯</span>
      </div>
    `;

    state.kpiYears.forEach(kpi => {
      html += `
        <div style="padding: 4px 10px; font-size:11px; font-weight:700; color:var(--accent); background:var(--bg-tertiary);">
          🎯 ${escapeHtml(kpi.title)}
        </div>
        <div class="submenu-item opt-select-kpi" data-year-id="${kpi.id}" data-mg-id="">
          <span>↳ 僅關聯年度 KPI</span>
        </div>
      `;

      kpi.monthlyGoals.forEach(mg => {
        const monthLabel = mg.month ? mg.month.split('-')[1] + '月' : '月目標';
        html += `
          <div class="submenu-item opt-select-kpi" data-year-id="${kpi.id}" data-mg-id="${mg.id}" style="padding-left: 20px;">
            <span>📅 [${monthLabel}] ${escapeHtml(mg.title)}</span>
          </div>
        `;
      });
    });

    els.kpiPickerOptions.innerHTML = html;

    document.getElementById('opt-clear-kpi')?.addEventListener('click', () => {
      assignKpiToActiveBlock(null);
    });

    document.querySelectorAll('.opt-select-kpi').forEach(item => {
      item.addEventListener('click', () => {
        const yearId = item.getAttribute('data-year-id');
        const monthGoalId = item.getAttribute('data-mg-id');
        assignKpiToActiveBlock({ yearId, monthGoalId });
      });
    });
  }

  function assignKpiToActiveBlock(kpiRef) {
    if (!state.activeBlock) return;
    const blockId = state.activeBlock.getAttribute('data-id');
    const dayData = state.journalData[state.selectedDate];
    const blockData = dayData.blocks.find(b => b.id === blockId);

    if (blockData) {
      blockData.kpiRef = kpiRef;
      saveData();

      const wrapper = state.activeBlock.querySelector('.block-content-wrapper');
      const oldPill = wrapper.querySelector('.block-kpi-pill');
      if (oldPill) oldPill.remove();

      if (kpiRef && kpiRef.yearId) {
        const newPill = createKpiPill(kpiRef);
        if (newPill) wrapper.appendChild(newPill);
        showToast('已成功關聯 KPI / 月目標');
      } else {
        showToast('已移除關聯');
      }
    }

    closeMenu();
  }

  function closeMenu() {
    els.blockMenuContainer.classList.remove('active');
    els.submenuTurnInto.style.display = 'none';
    els.submenuLinkKpi.style.display = 'none';
    if (state.activeBlock) {
      state.activeBlock.classList.remove('highlighted');
      state.activeBlock = null;
    }
  }

  function setupMenuActions() {
    document.getElementById('menu-opt-link-kpi').addEventListener('click', () => {
      els.submenuTurnInto.style.display = 'none';
      els.submenuLinkKpi.style.display = 'block';
    });

    document.getElementById('menu-opt-delete').addEventListener('click', () => {
      if (state.activeBlock) removeBlock(state.activeBlock);
    });

    document.getElementById('menu-opt-duplicate').addEventListener('click', () => {
      if (!state.activeBlock) return;
      const id = state.activeBlock.getAttribute('data-id');
      const dayData = state.journalData[state.selectedDate];
      const orig = dayData.blocks.find(b => b.id === id);
      if (orig) {
        const dup = {
          id: 'b-' + Date.now(),
          type: orig.type,
          content: orig.content,
          checked: orig.checked,
          kpiRef: orig.kpiRef ? Object.assign({}, orig.kpiRef) : null
        };
        const idx = dayData.blocks.indexOf(orig);
        dayData.blocks.splice(idx + 1, 0, dup);
        const newEl = createBlockElement(dup);
        state.activeBlock.after(newEl);
        saveData();
        closeMenu();
        showToast('已複製區塊');
      }
    });

    document.getElementById('menu-opt-turn-into').addEventListener('click', () => {
      els.submenuLinkKpi.style.display = 'none';
      els.submenuTurnInto.style.display = 'block';
    });

    document.getElementById('menu-opt-copy-link').addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href + '#block-' + (state.activeBlock ? state.activeBlock.getAttribute('data-id') : '')).then(() => {
        closeMenu();
        showToast('已複製區塊連結');
      });
    });

    document.getElementById('menu-opt-copy-md').addEventListener('click', () => {
      if (!state.activeBlock) return;
      const text = state.activeBlock.querySelector('.block-content')?.innerText || '';
      const type = state.activeBlock.getAttribute('data-type');
      let md = text;
      if (type === 'h1') md = `# ${text}`;
      else if (type === 'h2') md = `## ${text}`;
      else if (type === 'h3') md = `### ${text}`;
      else if (type === 'todo') md = `- [ ] ${text}`;
      else if (type === 'bullet') md = `- ${text}`;
      else if (type === 'quote') md = `> ${text}`;

      navigator.clipboard.writeText(md).then(() => {
        closeMenu();
        showToast('已複製為 Markdown');
      });
    });

    document.getElementById('menu-opt-template').addEventListener('click', () => {
      closeMenu();
      showToast('已將此區塊建立為模板');
    });

    document.getElementById('menu-opt-new-card').addEventListener('click', () => {
      closeMenu();
      showToast('已轉換為新卡片');
    });

    document.querySelectorAll('.submenu-item[data-turn]').forEach(item => {
      item.addEventListener('click', () => {
        const targetType = item.getAttribute('data-turn');
        if (state.activeBlock && targetType) {
          transformBlockType(state.activeBlock, targetType);
        }
      });
    });

    els.menuSearchInput.addEventListener('input', (e) => {
      filterMenuItems(e.target.value.trim().toLowerCase());
    });

    document.addEventListener('click', (e) => {
      if (!els.blockMenuContainer.contains(e.target) && !e.target.closest('.gutter-btn-handle')) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  function filterMenuItems(query) {
    document.querySelectorAll('.menu-item').forEach(item => {
      if (!query) {
        item.style.display = 'flex';
        return;
      }
      const text = item.innerText.toLowerCase();
      item.style.display = text.includes(query) ? 'flex' : 'none';
    });
  }

  // =========================================================
  // EXCEL EXPORT (包含 KPI 關聯與每日 肯定、感謝、學習/反省)
  // =========================================================
  function exportKpiToExcel() {
    const linkedDaysMap = {};

    Object.keys(state.journalData).forEach(dateKey => {
      const day = state.journalData[dateKey];
      if (day.blocks) {
        day.blocks.forEach(b => {
          if (b.kpiRef && b.kpiRef.yearId) {
            if (!linkedDaysMap[b.kpiRef.yearId]) linkedDaysMap[b.kpiRef.yearId] = [];
            linkedDaysMap[b.kpiRef.yearId].push({ date: dateKey, block: b, reflection: day.reflection });
          }
        });
      }
    });

    const headers = [
      '年度',
      '年度KPI(年誌)',
      'KPI目標說明',
      '年度達成率',
      '月份',
      '月誌目標',
      '月目標狀態',
      '日誌日期',
      '日誌工作內容',
      '工作完成狀態',
      '日誌【肯定】',
      '日誌【感謝】',
      '日誌【學習(反省)】'
    ];
    const rows = [headers];

    state.kpiYears.forEach(kpi => {
      const mGoals = kpi.monthlyGoals;
      const doneM = mGoals.filter(m => m.completed).length;
      const kpiProgress = mGoals.length > 0 ? `${Math.round((doneM / mGoals.length) * 100)}%` : '0%';
      const dayTasksForKpi = linkedDaysMap[kpi.id] || [];

      if (mGoals.length === 0) {
        rows.push([
          kpi.year || '115年',
          kpi.title,
          kpi.description || '',
          kpiProgress,
          '無月目標',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);
      } else {
        mGoals.forEach(mg => {
          const monthLabel = mg.month ? mg.month.split('-')[1] + '月' : '本月';
          const mgStatus = mg.completed ? '已達成' : (mg.rolledOver ? '展延中' : '進行中');
          const tasksUnderMg = dayTasksForKpi.filter(t => t.block.kpiRef.monthGoalId === mg.id);

          if (tasksUnderMg.length === 0) {
            rows.push([
              kpi.year || '115年',
              kpi.title,
              kpi.description || '',
              kpiProgress,
              monthLabel,
              mg.title,
              mgStatus,
              '',
              '（尚無具體日誌工作）',
              '',
              '',
              '',
              ''
            ]);
          } else {
            tasksUnderMg.forEach(t => {
              const ref = t.reflection || {};
              rows.push([
                kpi.year || '115年',
                kpi.title,
                kpi.description || '',
                kpiProgress,
                monthLabel,
                mg.title,
                mgStatus,
                t.date,
                t.block.content || '',
                t.block.checked ? '已完成' : '進行中',
                ref.affirmation || '',
                ref.gratitude || '',
                ref.learning || ''
              ]);
            });
          }
        });
      }

      const directTasks = dayTasksForKpi.filter(t => !t.block.kpiRef.monthGoalId);
      directTasks.forEach(t => {
        const ref = t.reflection || {};
        rows.push([
          kpi.year || '115年',
          kpi.title,
          kpi.description || '',
          kpiProgress,
          '年度直屬',
          '（直接關聯年度KPI）',
          '-',
          t.date,
          t.block.content || '',
          t.block.checked ? '已完成' : '進行中',
          ref.affirmation || '',
          ref.gratitude || '',
          ref.learning || ''
        ]);
      });
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `年度KPI與月誌日誌工作執行總表_${getTodayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已成功匯出 Excel 報表！');
  }

  // =========================================================
  // PROGRESS & TRACEABILITY REPORT MODAL
  // =========================================================
  function openKpiReportModal(targetKpiId = null) {
    let totalYearKpis = state.kpiYears.length;
    let totalMonthlyGoals = 0;
    let completedMonthlyGoals = 0;
    let totalDailyTasks = 0;
    let completedDailyTasks = 0;

    state.kpiYears.forEach(k => {
      totalMonthlyGoals += k.monthlyGoals.length;
      completedMonthlyGoals += k.monthlyGoals.filter(m => m.completed).length;
    });

    const linkedDaysMap = {};

    Object.keys(state.journalData).forEach(dateKey => {
      const day = state.journalData[dateKey];
      if (day.blocks) {
        day.blocks.forEach(b => {
          if (b.kpiRef && b.kpiRef.yearId) {
            totalDailyTasks++;
            if (b.checked) completedDailyTasks++;

            if (!linkedDaysMap[b.kpiRef.yearId]) linkedDaysMap[b.kpiRef.yearId] = [];
            linkedDaysMap[b.kpiRef.yearId].push({ date: dateKey, block: b });
          }
        });
      }
    });

    const monthPercent = totalMonthlyGoals > 0 ? Math.round((completedMonthlyGoals / totalMonthlyGoals) * 100) : 0;

    let bodyHtml = `
      <div class="report-summary-cards">
        <div class="summary-card">
          <div class="summary-card-label">年度 KPI 項目</div>
          <div class="summary-card-value">${totalYearKpis} <span style="font-size:14px;color:var(--text-muted);">項</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">月誌目標達成率</div>
          <div class="summary-card-value" style="color:#10b981;">${monthPercent}% <span style="font-size:13px;color:var(--text-muted);">(${completedMonthlyGoals}/${totalMonthlyGoals})</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">日誌工作完成數</div>
          <div class="summary-card-value" style="color:var(--accent);">${completedDailyTasks} <span style="font-size:13px;color:var(--text-muted);">/ 共${totalDailyTasks}個日誌關聯任務</span></div>
        </div>
      </div>

      <div class="report-section-title">
        <span>📑 年度 KPI ➔ 月誌目標 ➔ 日誌執行回溯總表</span>
        <button class="btn-excel-export" id="btn-inner-export-excel" style="font-size:11.5px; padding:3px 8px;">
          📥 點此匯出 Excel
        </button>
      </div>
      <div class="trace-tree">
    `;

    const kpiList = targetKpiId ? state.kpiYears.filter(k => k.id === targetKpiId) : state.kpiYears;

    kpiList.forEach(kpi => {
      const mGoals = kpi.monthlyGoals;
      const doneM = mGoals.filter(m => m.completed).length;
      const kpiProgress = mGoals.length > 0 ? Math.round((doneM / mGoals.length) * 100) : 0;
      const dayTasksForKpi = linkedDaysMap[kpi.id] || [];

      bodyHtml += `
        <div class="trace-node-year">
          <div>
            <span>🎯 [${escapeHtml(kpi.year || '115年')}] ${escapeHtml(kpi.title)}</span>
            <div style="font-size:11px;color:var(--text-muted);font-weight:normal;margin-top:2px;">${escapeHtml(kpi.description || '')}</div>
          </div>
          <span class="trace-status-pill ${kpiProgress === 100 ? 'done' : 'pending'}">${kpiProgress}% 完成 (${doneM}/${mGoals.length}月目標)</span>
        </div>
      `;

      mGoals.forEach(mg => {
        const monthLabel = mg.month ? mg.month.split('-')[1] + '月目標' : '月目標';
        const tasksUnderMg = dayTasksForKpi.filter(t => t.block.kpiRef.monthGoalId === mg.id);

        bodyHtml += `
          <div class="trace-node-month">
            <div>
              <span>📅 【${monthLabel}】${escapeHtml(mg.title)}</span>
              ${mg.rolledOver ? '<span style="color:#f59e0b;font-size:10px;margin-left:4px;">(自上月展延)</span>' : ''}
            </div>
            <span class="trace-status-pill ${mg.completed ? 'done' : 'pending'}">${mg.completed ? '✓ 已達成' : '進行中'}</span>
          </div>
        `;

        if (tasksUnderMg.length > 0) {
          tasksUnderMg.forEach(t => {
            const taskText = t.block.content || '（無工作內容）';
            const isDone = t.block.checked;
            bodyHtml += `
              <div class="trace-node-day">
                <div>
                  <span style="font-weight:600;color:var(--text-primary);margin-right:8px;">📌 ${t.date} 日誌：</span>
                  <span>${escapeHtml(taskText)}</span>
                </div>
                <span style="font-size:11px; color:${isDone ? '#10b981' : '#f59e0b'};">
                  ${isDone ? '● 已完成' : '○ 進行中'}
                </span>
              </div>
            `;
          });
        } else {
          bodyHtml += `
            <div class="trace-node-day" style="color:var(--text-muted);font-style:italic;">
              <span>（尚無具體關聯的日誌任務）</span>
            </div>
          `;
        }
      });

      const directYearTasks = dayTasksForKpi.filter(t => !t.block.kpiRef.monthGoalId);
      if (directYearTasks.length > 0) {
        bodyHtml += `
          <div class="trace-node-month" style="background:var(--bg-tertiary);">
            <span>📌 直接關聯年度之日誌工作：</span>
          </div>
        `;
        directYearTasks.forEach(t => {
          bodyHtml += `
            <div class="trace-node-day">
              <div>
                <span style="font-weight:600;margin-right:8px;">📌 ${t.date}：</span>
                <span>${escapeHtml(t.block.content || '')}</span>
              </div>
              <span style="font-size:11px; color:${t.block.checked ? '#10b981' : '#f59e0b'};">
                ${t.block.checked ? '● 已完成' : '○ 進行中'}
              </span>
            </div>
          `;
        });
      }
    });

    bodyHtml += `</div>`;

    els.kpiReportContent.innerHTML = bodyHtml;
    document.getElementById('btn-inner-export-excel')?.addEventListener('click', exportKpiToExcel);
    els.modalKpiReport.classList.add('active');
  }

  function closeKpiReportModal() {
    els.modalKpiReport.classList.remove('active');
  }

  // --- Search Input in Sidebar ---
  function setupSearch() {
    els.searchInput.addEventListener('input', debounce((e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        renderRecentList();
        return;
      }

      const matchedDates = [];
      Object.keys(state.journalData).forEach(dateKey => {
        const day = state.journalData[dateKey];
        const matchBlock = day.blocks && day.blocks.some(b => b.content && b.content.toLowerCase().includes(q));
        const matchRef = day.reflection && (
          (day.reflection.affirmation && day.reflection.affirmation.toLowerCase().includes(q)) ||
          (day.reflection.gratitude && day.reflection.gratitude.toLowerCase().includes(q)) ||
          (day.reflection.learning && day.reflection.learning.toLowerCase().includes(q))
        );

        if (matchBlock || matchRef) {
          matchedDates.push(dateKey);
        }
      });

      if (matchedDates.length === 0) {
        els.recentList.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:6px;">無符合 "${escapeHtml(q)}" 的結果</div>`;
      } else {
        let html = '';
        matchedDates.forEach(dateKey => {
          const info = formatDisplayDate(dateKey);
          html += `
            <div class="recent-item" data-date="${dateKey}">
              <span>🔍 ${info.title}</span>
            </div>
          `;
        });
        els.recentList.innerHTML = html;
        els.recentList.querySelectorAll('.recent-item').forEach(el => {
          el.addEventListener('click', () => selectDate(el.getAttribute('data-date')));
        });
      }
    }, 250));
  }

  function setCursorToEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    setTimeout(() => {
      els.toast.classList.remove('show');
    }, 2200);
  }

  // --- Initial Bindings ---
  function initEvents() {
    els.navToday.addEventListener('click', () => selectDate(getTodayString()));
    els.navYesterday.addEventListener('click', () => {
      const yesterday = formatDateKey(new Date(Date.now() - 86400000));
      selectDate(yesterday);
    });
    els.navTomorrow.addEventListener('click', () => {
      const tomorrow = formatDateKey(new Date(Date.now() + 86400000));
      selectDate(tomorrow);
    });

    els.calendarPrevBtn.addEventListener('click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
      renderCalendar();
    });
    els.calendarNextBtn.addEventListener('click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
      renderCalendar();
    });

    els.btnAddYearKpi.addEventListener('click', () => {
      const title = prompt('請輸入年度 KPI (年誌工作) 名稱：');
      if (title && title.trim()) {
        const year = prompt('請輸入所屬年度（例如：115年）：', '115年') || '115年';
        const desc = prompt('請輸入 KPI 核心目標說明（可略過）：', '') || '';

        state.kpiYears.push({
          id: 'kpi-year-' + Date.now(),
          year: year.trim(),
          title: title.trim(),
          description: desc.trim(),
          color: '#3b82f6',
          monthlyGoals: []
        });
        saveData();
        showToast(`已新增年度 KPI：${title.trim()}`);
      }
    });

    els.btnTopExportExcel.addEventListener('click', exportKpiToExcel);
    els.btnModalExportExcel.addEventListener('click', exportKpiToExcel);

    els.btnOpenKpiReport.addEventListener('click', () => openKpiReportModal());
    els.btnTopKpiReport.addEventListener('click', () => openKpiReportModal());
    els.btnCloseKpiReport.addEventListener('click', closeKpiReportModal);
    els.modalKpiReport.addEventListener('click', (e) => {
      if (e.target === els.modalKpiReport) closeKpiReportModal();
    });

    els.themeToggleBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    els.dateStripPrev.addEventListener('click', () => {
      const cur = parseDateKey(state.selectedDate);
      const prevKey = formatDateKey(new Date(cur.getTime() - 86400000));
      selectDate(prevKey);
    });

    els.dateStripNext.addEventListener('click', () => {
      const cur = parseDateKey(state.selectedDate);
      const nextKey = formatDateKey(new Date(cur.getTime() + 86400000));
      selectDate(nextKey);
    });

    els.btnTodayDropdown.addEventListener('click', () => {
      selectDate(getTodayString());
    });

    document.getElementById('btn-ai-assistant').addEventListener('click', () => {
      showToast('AI 助手已就緒：可提供 KPI 與日誌進度智慧分析');
    });

    els.btnExportBackup.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({
        journalData: state.journalData,
        kpiYears: state.kpiYears
      }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `heptabase-kpi-backup-${getTodayString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('備份已匯出');
    });

    els.btnImportBackup.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const parsed = JSON.parse(evt.target.result);
            if (parsed.journalData) {
              state.journalData = parsed.journalData;
              if (parsed.kpiYears) state.kpiYears = parsed.kpiYears;
            } else {
              state.journalData = parsed;
            }
            saveData();
            renderCalendar();
            renderRecentList();
            renderKpiTree();
            renderJournalDay();
            showToast('成功匯入備份');
          } catch (err) {
            alert('匯入失敗：' + err.message);
          }
        };
        reader.readAsText(e.target.files[0]);
      }
    });

    els.spaceNameDisplay.addEventListener('click', () => {
      const newName = prompt('請輸入空間名稱：', els.spaceNameDisplay.textContent);
      if (newName && newName.trim()) {
        els.spaceNameDisplay.textContent = newName.trim();
      }
    });

    setupSearch();
    setupMenuActions();
  }

  // --- Start App ---
  function init() {
    initAuth();
    applyTheme(state.theme);
    loadData();
    renderCalendar();
    renderRecentList();
    renderKpiTree();
    renderDateStrip();
    renderJournalDay();
    initEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
