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

  // --- Built-in Firebase Cloud Sync Configuration ---
  const BUILTIN_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDEjSPKvJuM4Fmw9Bu6Jyk0hjjaC2tgiD0",
    authDomain: "my-heptabase.firebaseapp.com",
    projectId: "my-heptabase",
    storageBucket: "my-heptabase.firebasestorage.app",
    messagingSenderId: "1093821621804",
    appId: "1:1093821621804:web:25a8e3dc9094e26c87d389",
    measurementId: "G-39ZHX604R6"
  };
  const FIREBASE_CONFIG_KEY = 'heptabase_firebase_config';
  let firebaseDb = null;
  let firestoreUnsubscribe = null;
  let isRemoteUpdate = false;

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

  function updateSaveIndicator(isSuccess) {
    const dot = document.getElementById('save-status-dot');
    const text = document.getElementById('save-status-text');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    if (dot) {
      dot.classList.remove('saving');
      dot.style.background = isSuccess ? '#10b981' : '#f59e0b';
    }
    if (text) {
      text.textContent = isSuccess ? `已儲存 ${timeStr}` : '儲存中...';
    }
  }

  function setSavingState() {
    const dot = document.getElementById('save-status-dot');
    const text = document.getElementById('save-status-text');
    if (dot) dot.classList.add('saving');
    if (text) text.textContent = '儲存中...';
  }

  function saveAllCurrentData(showToastFeedback = true) {
    setSavingState();

    const dateKey = state.selectedDate;
    const dayData = state.journalData[dateKey];
    if (dayData) {
      // 1. Gather all reflection textarea values from live DOM
      if (!dayData.reflection) dayData.reflection = { affirmation: '', gratitude: '', learning: '' };
      document.querySelectorAll('.reflection-input').forEach(textarea => {
        const field = textarea.getAttribute('data-field');
        if (field) {
          dayData.reflection[field] = textarea.value;
        }
      });

      // 2. Gather all block contents from live DOM to ensure 100% fidelity
      if (dayData.blocks) {
        document.querySelectorAll('.editor-block-row').forEach(row => {
          const id = row.getAttribute('data-id');
          const block = dayData.blocks.find(b => b.id === id);
          const contentEl = row.querySelector('.block-content');
          if (block && contentEl) {
            block.content = contentEl.innerText;
          }
        });
      }
    }

    // 3. Persist to localStorage & trigger cloud sync
    saveData();
    if (firebaseDb && !isRemoteUpdate) {
      syncDataToCloud(true);
    }

    // 4. Update status indicator
    setTimeout(() => {
      updateSaveIndicator(true);
      if (showToastFeedback) {
        showToast('💾 所有日誌、覆盤與 KPI 已成功儲存！');
      }
    }, 120);
  }

  function saveData() {
    try {
      const curDay = state.journalData[state.selectedDate];
      if (curDay) {
        curDay.lastModified = Date.now();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.journalData));
      localStorage.setItem('heptabase_kpi_years', JSON.stringify(state.kpiYears));
      renderCalendar();
      renderRecentList();
      renderKpiTree();
      renderDateStrip();
      updateDayFooterMetrics();
      syncDataToCloud();
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

  // =========================================================
  // FIREBASE CLOUD SYNC LOGIC (Google Firebase 跨裝置雲端即時同步)
  // =========================================================

  function parseFirebaseConfig(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();

    // 1. Try pure JSON parse directly
    try {
      const p = JSON.parse(trimmed);
      if (p && p.apiKey && p.projectId) return p;
    } catch (e) {}

    // 2. Extract innermost / outermost object literal {...}
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const objStr = match[0];

    try {
      const p = JSON.parse(objStr);
      if (p && p.apiKey && p.projectId) return p;
    } catch (e) {}

    // 3. Evaluate JS object notation safely (supports const firebaseConfig = { apiKey: '...' })
    try {
      const fn = new Function('return (' + objStr + ');');
      const res = fn();
      if (res && typeof res === 'object' && res.apiKey && res.projectId) {
        return res;
      }
    } catch (err) {
      console.error('[Firebase] Failed to parse firebaseConfig expression:', err);
    }
    return null;
  }

  function initFirebaseCloudSync() {
    let config = BUILTIN_FIREBASE_CONFIG;
    const savedConfigStr = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (savedConfigStr) {
      const parsed = parseFirebaseConfig(savedConfigStr);
      if (parsed && parsed.apiKey && parsed.projectId) {
        config = parsed;
      }
    }

    if (!window.firebase) {
      console.warn('[Firebase] Firebase SDK 尚未就緒，1秒後自動重試');
      setTimeout(initFirebaseCloudSync, 1000);
      return;
    }

    try {
      let app;
      if (firebase.apps && firebase.apps.length > 0) {
        app = firebase.apps[0];
      } else {
        app = firebase.initializeApp(config);
      }
      firebaseDb = firebase.firestore();
      updateCloudSyncUI(true);
      setupFirestoreListener();
    } catch (err) {
      console.error('[Firebase] 初始化連線失敗:', err);
      updateCloudSyncUI(false, err.message);
    }
  }

  function isUserCurrentlyTyping() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (el.isContentEditable) return true;
    if (el.classList && (el.classList.contains('reflection-input') || el.classList.contains('block-content'))) {
      return true;
    }
    return false;
  }

  function setupFirestoreListener() {
    if (!firebaseDb) return;
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      firestoreUnsubscribe = null;
    }

    const docRef = firebaseDb.collection('heptabase_users').doc(AUTH_CONFIG.account);

    firestoreUnsubscribe = docRef.onSnapshot((docSnap) => {
      if (!docSnap.exists) {
        console.log('[Firebase] 雲端尚未建立日誌紀錄，初次自動上傳本地資料...');
        syncDataToCloud(true);
        return;
      }

      // Ignore local optimistic writes while still pending
      if (docSnap.metadata && docSnap.metadata.hasPendingWrites) {
        return;
      }

      const remoteData = docSnap.data();
      if (!remoteData) return;

      let remoteJournal = null;
      let remoteKpi = null;

      if (remoteData.journalDataJson) {
        try { remoteJournal = JSON.parse(remoteData.journalDataJson); } catch (e) {}
      } else if (remoteData.journalData) {
        remoteJournal = remoteData.journalData;
      }

      if (remoteData.kpiYearsJson) {
        try { remoteKpi = JSON.parse(remoteData.kpiYearsJson); } catch (e) {}
      } else if (remoteData.kpiYears) {
        remoteKpi = remoteData.kpiYears;
      }

      if (!remoteJournal) return;

      const curJournalStr = localStorage.getItem(STORAGE_KEY) || JSON.stringify(state.journalData);
      const newJournalStr = remoteData.journalDataJson || JSON.stringify(remoteJournal);
      const curKpiStr = localStorage.getItem('heptabase_kpi_years') || JSON.stringify(state.kpiYears);
      const newKpiStr = remoteData.kpiYearsJson || JSON.stringify(remoteKpi || []);

      // If data is identical, return silently without touching UI or triggering writes
      if (curJournalStr === newJournalStr && curKpiStr === newKpiStr) {
        return;
      }

      console.log('[Firebase] 收到遠端雲端資料更新，靜音同步至本地...');
      isRemoteUpdate = true;
      try {
        state.journalData = remoteJournal;
        if (remoteKpi && Array.isArray(remoteKpi) && remoteKpi.length > 0) {
          state.kpiYears = remoteKpi;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.journalData));
        localStorage.setItem('heptabase_kpi_years', JSON.stringify(state.kpiYears));

        renderCalendar();
        renderRecentList();
        renderKpiTree();
        renderDateStrip();

        // 核心保護：若使用者當前正在輸入任何欄位，絕不重新渲染編輯區，保證游標與打字 100% 順暢不中斷！
        if (!isUserCurrentlyTyping()) {
          renderJournalDay();
        }

        // 靜音更新右上角狀態燈，絕不彈出干擾打字的 Toast 橫幅訊息
        updateSaveIndicator(true);
      } finally {
        isRemoteUpdate = false;
      }
    }, (error) => {
      console.error('[Firebase] Firestore onSnapshot 監聽中斷:', error);
      updateCloudSyncUI(false, error.message);
    });
  }

  const debouncedCloudSync = debounce(() => {
    doSyncDataToCloud();
  }, 3000);

  function syncDataToCloud(forceImmediate = false) {
    if (!firebaseDb || isRemoteUpdate) return;
    if (forceImmediate) {
      doSyncDataToCloud();
    } else {
      debouncedCloudSync();
    }
  }

  async function doSyncDataToCloud() {
    if (!firebaseDb || isRemoteUpdate) return;
    try {
      const docRef = firebaseDb.collection('heptabase_users').doc(AUTH_CONFIG.account);
      await docRef.set({
        journalDataJson: JSON.stringify(state.journalData),
        kpiYearsJson: JSON.stringify(state.kpiYears),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAtIso: new Date().toISOString(),
        userAccount: AUTH_CONFIG.account
      }, { merge: true });
      updateCloudSyncUI(true);
    } catch (err) {
      console.error('[Firebase] 雲端寫入失敗:', err);
      updateCloudSyncUI(false, err.message);
    }
  }

  function updateCloudSyncUI(isConnected, errorMsg) {
    if (els.btnTopCloudSync) {
      if (isConnected) {
        els.btnTopCloudSync.classList.add('connected');
        if (els.cloudSyncIcon) els.cloudSyncIcon.textContent = '🟢';
        if (els.cloudSyncText) els.cloudSyncText.textContent = '雲端已同步';
        els.btnTopCloudSync.title = 'Google Firebase 雲端連線正常，跨裝置日誌即時自動同步';
      } else {
        els.btnTopCloudSync.classList.remove('connected');
        if (els.cloudSyncIcon) els.cloudSyncIcon.textContent = '☁️';
        if (els.cloudSyncText) els.cloudSyncText.textContent = errorMsg ? '連線異常' : '雲端同步';
        els.btnTopCloudSync.title = errorMsg ? `雲端連線錯誤：${errorMsg}` : '點擊設定 Google Firebase 跨裝置雲端同步';
      }
    }

    if (els.cloudStatusBadge && els.cloudStatusBadgeDot && els.cloudStatusBadgeText) {
      if (isConnected) {
        els.cloudStatusBadge.style.background = 'rgba(16, 185, 129, 0.12)';
        els.cloudStatusBadge.style.color = '#10b981';
        els.cloudStatusBadgeDot.style.background = '#10b981';
        els.cloudStatusBadgeText.textContent = '✅ 已成功連線至 Firestore，全自動即時同步中';
        if (els.btnDisconnectCloud) els.btnDisconnectCloud.style.display = 'inline-block';
      } else {
        els.cloudStatusBadge.style.background = 'var(--bg-tertiary)';
        els.cloudStatusBadge.style.color = errorMsg ? '#ef4444' : 'var(--text-muted)';
        els.cloudStatusBadgeDot.style.background = errorMsg ? '#ef4444' : '#94a3b8';
        els.cloudStatusBadgeText.textContent = errorMsg ? `⚠️ 連線錯誤：${errorMsg}` : '尚未設定雲端連線';
        if (els.btnDisconnectCloud) {
          const hasSaved = !!localStorage.getItem(FIREBASE_CONFIG_KEY);
          els.btnDisconnectCloud.style.display = hasSaved ? 'inline-block' : 'none';
        }
      }
    }
  }

  function openCloudSyncModal() {
    const savedConfigStr = localStorage.getItem(FIREBASE_CONFIG_KEY);
    const input = els.firebaseConfigInput || document.getElementById('firebase-config-input');
    if (input && !input.value.trim()) {
      input.value = savedConfigStr || JSON.stringify(BUILTIN_FIREBASE_CONFIG, null, 2);
    }
    const modal = els.modalCloudSync || document.getElementById('modal-cloud-sync');
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
  }

  function closeCloudSyncModal() {
    const modal = els.modalCloudSync || document.getElementById('modal-cloud-sync');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  // Export to global window so inline onclick always works
  window.openCloudSyncModal = openCloudSyncModal;
  window.closeCloudSyncModal = closeCloudSyncModal;
  window.handleSaveCloudConfig = handleSaveCloudConfig;
  window.handleDisconnectCloud = handleDisconnectCloud;

  function handleSaveCloudConfig() {
    const rawInput = els.firebaseConfigInput.value.trim();
    if (!rawInput) {
      alert('請輸入或貼上 Firebase 設定代碼 (firebaseConfig)！');
      return;
    }

    const parsed = parseFirebaseConfig(rawInput);
    if (!parsed || !parsed.apiKey || !parsed.projectId) {
      alert('設定代碼格式無法識別，請確認已完整複製包含 apiKey 與 projectId 的代碼區塊！');
      return;
    }

    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(parsed, null, 2));
    showToast('已儲存 Firebase 設定，正在連線...');
    initFirebaseCloudSync();
    closeCloudSyncModal();
  }

  function handleDisconnectCloud() {
    if (!confirm('確定要清除此電腦上的 Firebase 雲端連線設定嗎？\n（本地已儲存的日誌資料仍會保留在電腦中）')) {
      return;
    }
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      firestoreUnsubscribe = null;
    }
    firebaseDb = null;
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
    if (els.firebaseConfigInput) els.firebaseConfigInput.value = '';
    updateCloudSyncUI(false);
    showToast('已中斷雲端連線');
    closeCloudSyncModal();
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
    btnClearSearch: document.getElementById('btn-clear-search'),
    searchResultsBox: document.getElementById('search-results-box'),
    searchResultsCount: document.getElementById('search-results-count'),
    searchResultsList: document.getElementById('search-results-list'),
    btnCloseSearch: document.getElementById('btn-close-search'),
    navToday: document.getElementById('nav-today'),
    navYesterday: document.getElementById('nav-yesterday'),
    navTomorrow: document.getElementById('nav-tomorrow'),

    // Top Bar
    btnTopSave: document.getElementById('btn-top-save'),
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
    toast: document.getElementById('toast'),

    // Cloud Sync Elements
    btnTopCloudSync: document.getElementById('btn-top-cloud-sync'),
    cloudSyncIcon: document.getElementById('cloud-sync-icon'),
    cloudSyncText: document.getElementById('cloud-sync-text'),
    modalCloudSync: document.getElementById('modal-cloud-sync'),
    btnCloseCloudSync: document.getElementById('btn-close-cloud-sync'),
    cloudStatusBadge: document.getElementById('cloud-status-badge'),
    cloudStatusBadgeDot: document.getElementById('cloud-status-badge-dot'),
    cloudStatusBadgeText: document.getElementById('cloud-status-badge-text'),
    firebaseConfigInput: document.getElementById('firebase-config-input'),
    btnDisconnectCloud: document.getElementById('btn-disconnect-cloud'),
    btnSaveCloudConfig: document.getElementById('btn-save-cloud-config')
  };

  // =========================================================
  // AUTHENTICATION LOGIC (登入畫面與記憶帳密)
  // =========================================================
  function initAuth() {
    const isRemembered = localStorage.getItem('heptabase_remember') === 'true';
    const savedAcc = localStorage.getItem('heptabase_saved_acc') || AUTH_CONFIG.account;
    const savedPwd = localStorage.getItem('heptabase_saved_pwd') || '';
    const isLoggedInLocal = localStorage.getItem('heptabase_logged_in') === 'true';
    const isLoggedInSession = sessionStorage.getItem('heptabase_logged_in') === 'true';

    // Prefill account by default
    els.loginAccount.value = savedAcc;
    if (savedPwd) els.loginPassword.value = savedPwd;
    els.loginRemember.checked = isRemembered || true;

    // Auto-login if remembered and was previously logged in
    if ((isRemembered && isLoggedInLocal) || isLoggedInSession) {
      els.loginOverlay.classList.add('hidden');
    } else {
      els.loginOverlay.classList.remove('hidden');
      setTimeout(() => {
        if (!els.loginPassword.value) els.loginPassword.focus();
        else els.loginAccount.focus();
      }, 100);
    }

    // Toggle password visibility (顯示 / 隱藏密碼)
    const btnTogglePwd = document.getElementById('btn-toggle-pwd');
    if (btnTogglePwd) {
      btnTogglePwd.addEventListener('click', () => {
        const type = els.loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        els.loginPassword.setAttribute('type', type);
        btnTogglePwd.textContent = type === 'password' ? '👁️' : '🙈';
      });
    }

    // Submit handler
    if (els.loginForm) {
      els.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
      });
    }

    els.btnDoLogin.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogin();
    });

    els.loginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin();
      }
    });

    els.loginAccount.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin();
      }
    });

    // Logout handler
    els.btnLogout.addEventListener('click', handleLogout);

    window.handleLogin = handleLogin;
    window.handleLogout = handleLogout;
  }

  function handleLogin() {
    const rawAcc = els.loginAccount.value || '';
    const rawPwd = els.loginPassword.value || '';

    // Remove zero-width whitespace and trim
    const acc = rawAcc.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const pwd = rawPwd.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const remember = els.loginRemember.checked;

    const isAccMatch = acc.toLowerCase() === AUTH_CONFIG.account.toLowerCase();
    const isPwdMatch = pwd === AUTH_CONFIG.password;

    if (isAccMatch && isPwdMatch) {
      // Login Success
      els.loginErrorMsg.classList.remove('active');

      if (remember) {
        localStorage.setItem('heptabase_logged_in', 'true');
        localStorage.setItem('heptabase_remember', 'true');
        localStorage.setItem('heptabase_saved_acc', AUTH_CONFIG.account);
        localStorage.setItem('heptabase_saved_pwd', AUTH_CONFIG.password);
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
      // Login Failed - show precise guidance
      els.loginErrorMsg.classList.add('active');
      if (!isAccMatch) {
        els.loginErrorText.textContent = '帳號錯誤，預設帳號為 danner03060302';
        els.loginAccount.focus();
        els.loginAccount.select();
      } else {
        els.loginErrorText.textContent = '密碼錯誤，請點選👁️確認是否輸入為 a230060';
        els.loginPassword.focus();
        els.loginPassword.select();
      }
    }
  }

  function handleLogout() {
    if (confirm('確定要登出系統嗎？')) {
      saveAllCurrentData(false);
      sessionStorage.removeItem('heptabase_logged_in');
      localStorage.removeItem('heptabase_logged_in');
      els.loginOverlay.classList.remove('hidden');
      showToast('已安全儲存並登出');
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
            <div class="kpi-month-content" title="點擊修改此月目標內容或月份" data-kpi-idx="${kpiIdx}" data-mg-idx="${mgIdx}">
              <span class="kpi-month-badge">${monthLabel}</span>
              <span class="kpi-month-text">${escapeHtml(mg.title)} ${isRolled}</span>
            </div>
            <div class="kpi-month-actions">
              <button class="project-tab-action-btn btn-edit-month" title="修改月目標內容與月份" data-kpi-idx="${kpiIdx}" data-mg-idx="${mgIdx}">✏️</button>
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
    function handleEditMonthGoal(kpiIdx, mgIdx) {
      const kpi = state.kpiYears[kpiIdx];
      if (!kpi || !kpi.monthlyGoals || !kpi.monthlyGoals[mgIdx]) return;
      const mg = kpi.monthlyGoals[mgIdx];

      const newTitle = prompt(`【${kpi.title}】\n請修改月誌工作目標名稱：`, mg.title);
      if (newTitle === null) return;
      if (newTitle.trim()) {
        mg.title = newTitle.trim();
      }

      const defaultMonth = mg.month ? mg.month.replace('2026-', '') : '11';
      const newMonthInput = prompt(`請設定【${mg.title}】執行的月份（例如 10、11 或 2026-10）：`, defaultMonth);
      if (newMonthInput !== null && newMonthInput.trim()) {
        const raw = newMonthInput.trim().replace('月', '');
        const cleanMonth = raw.includes('-') ? raw : `2026-${String(raw).padStart(2, '0')}`;
        mg.month = cleanMonth;
      }

      saveAllCurrentData(false);
      renderKpiTree();
      renderJournalDay();
      showToast(`已成功修改月目標：${mg.title}`);
    }

    document.querySelectorAll('.btn-edit-month').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kpiIdx = parseInt(btn.getAttribute('data-kpi-idx'), 10);
        const mgIdx = parseInt(btn.getAttribute('data-mg-idx'), 10);
        handleEditMonthGoal(kpiIdx, mgIdx);
      });
    });

    document.querySelectorAll('.kpi-month-content').forEach(box => {
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        const kpiIdx = parseInt(box.getAttribute('data-kpi-idx'), 10);
        const mgIdx = parseInt(box.getAttribute('data-mg-idx'), 10);
        handleEditMonthGoal(kpiIdx, mgIdx);
      });
    });

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

  // Auto-resize reflection textarea based on typed content
  function autoResizeReflectionInput(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollH = textarea.scrollHeight;
    textarea.style.height = Math.max(72, scrollH) + 'px';
  }

  // =========================================================
  // RENDER DAY CONTENT + 每日三個核心欄位 (肯定、感謝、學習/反省)
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
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn-day-save" id="btn-day-save" title="點擊手動儲存當前日誌與所有進度 (快捷鍵 Ctrl + S)">
              <span>💾 儲存日誌</span>
            </button>
            <button class="ai-badge-btn" id="btn-day-kpi-filter" style="font-size:11.5px; padding:3px 8px;" title="點擊檢視今日與年度KPI的關聯">
              <span>🎯 檢視今日 KPI 關聯</span>
            </button>
          </div>
        </div>

        <!-- Freeform Blocks Editor (每日工作事項) -->
        <div class="day-editor" id="day-editor">
          <!-- Blocks rendered here -->
        </div>

        <!-- 每日固定三個核心欄位：肯定、感謝、學習(反省) - 移至新增標籤上方，隨字數自動撐開 -->
        <div class="daily-reflection-container" id="daily-reflection-container">
          <div class="daily-reflection-header">
            <span>🌱 每日覆盤與心靈沉澱 (Daily Reflection)</span>
            <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">自動儲存 • 隨字數自動調整大小</span>
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

        <!-- 底部功能列：新增標籤與字數統計 -->
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

    document.getElementById('btn-day-save')?.addEventListener('click', () => {
      saveAllCurrentData(true);
    });

    const saveReflectionDebounced = debounce(() => {
      saveData();
      updateSaveIndicator(true);
    }, 400);

    document.querySelectorAll('.reflection-input').forEach(textarea => {
      autoResizeReflectionInput(textarea);
      textarea.addEventListener('input', (e) => {
        autoResizeReflectionInput(e.target);
        const field = e.target.getAttribute('data-field');
        dayData.reflection[field] = e.target.value;
        setSavingState();
        saveReflectionDebounced();
      });
      textarea.addEventListener('blur', (e) => {
        const field = e.target.getAttribute('data-field');
        dayData.reflection[field] = e.target.value;
        saveData();
        updateSaveIndicator(true);
      });
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

    const debouncedBlockSave = debounce(() => {
      saveData();
      updateSaveIndicator(true);
    }, 400);

    content.addEventListener('input', () => {
      blockData.content = content.innerText;
      setSavingState();
      debouncedBlockSave();
    });

    content.addEventListener('blur', () => {
      blockData.content = content.innerText;
      saveData();
      updateSaveIndicator(true);
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
    let pillText = '';
    if (kpiRef.monthGoalId) {
      const mg = kpi.monthlyGoals.find(m => m.id === kpiRef.monthGoalId);
      if (mg) mgTitle = ` / ${mg.month ? mg.month.split('-')[1] + '月' : '月目標'}`;
      pillText = `🎯 ${kpi.title}${mgTitle}`;
    } else {
      pillText = `🎯 [年度] ${kpi.title}`;
    }

    const pill = document.createElement('span');
    pill.className = 'block-kpi-pill';
    pill.innerHTML = escapeHtml(pillText);
    pill.title = '點擊檢視此 KPI 執行進度與報表';
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

    let triggerRect;
    if (triggerEventOrElement && triggerEventOrElement.getBoundingClientRect) {
      triggerRect = triggerEventOrElement.getBoundingClientRect();
    } else if (triggerEventOrElement && typeof triggerEventOrElement.clientX === 'number') {
      triggerRect = {
        top: triggerEventOrElement.clientY,
        bottom: triggerEventOrElement.clientY,
        left: triggerEventOrElement.clientX,
        right: triggerEventOrElement.clientX,
        width: 0,
        height: 0
      };
    } else {
      triggerRect = row.getBoundingClientRect();
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const totalMenuWidth = 500;
    const estimatedHeight = 390;

    let top = triggerRect.bottom + 4;
    let left = triggerRect.left;

    // Smart vertical collision check: if too close to bottom of screen
    if (top + estimatedHeight > viewportHeight - 16) {
      if (triggerRect.top > estimatedHeight + 10) {
        // Flip above the block
        top = triggerRect.top - estimatedHeight - 4;
      } else {
        // Clamp inside viewport so menu is always fully above taskbar
        top = Math.max(12, viewportHeight - estimatedHeight - 16);
      }
    }

    // Horizontal collision check: avoid right-edge cutoff
    if (left + totalMenuWidth > viewportWidth - 16) {
      left = Math.max(12, viewportWidth - totalMenuWidth - 16);
    }

    container.style.top = `${top}px`;
    container.style.left = `${left}px`;
    container.classList.add('active');

    els.submenuTurnInto.style.display = 'block';
    els.submenuLinkKpi.style.display = 'none';

    els.menuSearchInput.value = '';
    filterMenuItems('');

    populateKpiPickerSubmenu();
    repositionMenuIfOverflow();
  }

  function repositionMenuIfOverflow() {
    const container = els.blockMenuContainer;
    if (!container || !container.classList.contains('active')) return;

    requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let currentTop = parseFloat(container.style.top) || rect.top;
      let currentLeft = parseFloat(container.style.left) || rect.left;

      if (rect.bottom > viewportHeight - 14) {
        const shiftY = rect.bottom - (viewportHeight - 14);
        currentTop = Math.max(10, currentTop - shiftY);
        container.style.top = `${currentTop}px`;
      }

      if (rect.right > viewportWidth - 14) {
        const shiftX = rect.right - (viewportWidth - 14);
        currentLeft = Math.max(10, currentLeft - shiftX);
        container.style.left = `${currentLeft}px`;
      }
    });
  }

  function populateKpiPickerSubmenu() {
    if (!els.kpiPickerOptions) return;
    let html = `
      <div class="submenu-item" id="opt-clear-kpi" style="color:var(--text-muted); border-bottom: 1px solid var(--border-subtle); margin-bottom: 4px;">
        <span>❌ 取消關聯</span>
      </div>
    `;

    if (state.kpiYears.length === 0) {
      html += `
        <div style="padding: 12px; font-size:12px; color:var(--text-muted); text-align:center;">
          尚無年度 KPI 目標，請先在左側欄新增
        </div>
      `;
    }

    state.kpiYears.forEach(kpi => {
      html += `
        <div class="submenu-item opt-select-kpi opt-kpi-year-item" data-year-id="${kpi.id}" data-mg-id="" style="font-weight:700; color:var(--accent); background:var(--bg-tertiary); position:sticky; top:33px; z-index:3; border-top:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between; cursor:pointer;" title="點擊直接關聯此【年度 KPI】標籤">
          <span>🎯 [年度] ${escapeHtml(kpi.title)}</span>
          <span style="font-size:10px; font-weight:normal; padding:2px 7px; background:var(--accent-light); color:var(--accent); border-radius:4px; border:1px solid rgba(37,99,235,0.2);">選擇年度標籤</span>
        </div>
      `;

      if (kpi.monthlyGoals && kpi.monthlyGoals.length > 0) {
        kpi.monthlyGoals.forEach(mg => {
          const monthLabel = mg.month ? mg.month.split('-')[1] + '月' : '月目標';
          html += `
            <div class="submenu-item opt-select-kpi" data-year-id="${kpi.id}" data-mg-id="${mg.id}" style="padding-left: 24px;" title="關聯月目標：${escapeHtml(mg.title)}">
              <span>📅 [${monthLabel}] ${escapeHtml(mg.title)}</span>
            </div>
          `;
        });
      } else {
        html += `
          <div style="padding: 4px 12px 6px 24px; font-size:11px; color:var(--text-muted); font-style:italic;">
            （無月目標，可直接點擊上方【年度】標籤關聯）
          </div>
        `;
      }
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
        if (!kpiRef.monthGoalId) {
          showToast('已成功關聯【年度 KPI】標籤');
        } else {
          showToast('已成功關聯【月目標】標籤');
        }
      } else {
        showToast('已移除關聯標籤');
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
    const showKpiSubmenu = () => {
      els.submenuTurnInto.style.display = 'none';
      els.submenuLinkKpi.style.display = 'block';
      repositionMenuIfOverflow();
    };

    const showTurnIntoSubmenu = () => {
      els.submenuLinkKpi.style.display = 'none';
      els.submenuTurnInto.style.display = 'block';
      repositionMenuIfOverflow();
    };

    const optLinkKpi = document.getElementById('menu-opt-link-kpi');
    if (optLinkKpi) {
      optLinkKpi.addEventListener('click', showKpiSubmenu);
      optLinkKpi.addEventListener('mouseenter', showKpiSubmenu);
    }

    const optTurnInto = document.getElementById('menu-opt-turn-into');
    if (optTurnInto) {
      optTurnInto.addEventListener('click', showTurnIntoSubmenu);
      optTurnInto.addEventListener('mouseenter', showTurnIntoSubmenu);
    }

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

    window.addEventListener('scroll', () => {
      if (els.blockMenuContainer.classList.contains('active')) {
        closeMenu();
      }
    }, { passive: true });

    document.getElementById('journal-scroll-view')?.addEventListener('scroll', () => {
      if (els.blockMenuContainer.classList.contains('active')) {
        closeMenu();
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      document.querySelectorAll('.reflection-input').forEach(autoResizeReflectionInput);
      if (els.blockMenuContainer.classList.contains('active')) {
        repositionMenuIfOverflow();
      }
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
  // EXCEL EXPORT (時間範圍自選 + 每日覆盤單列不重複)
  // =========================================================

  function openExportExcelModal() {
    const modal = document.getElementById('modal-export-excel');
    if (!modal) {
      exportKpiToExcel();
      return;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const lastMDate = new Date(y, m - 2, 1);
    const lastY = lastMDate.getFullYear();
    const lastM = lastMDate.getMonth() + 1;

    // Update dynamic labels
    const labelThisMonth = document.getElementById('export-label-this-month');
    if (labelThisMonth) labelThisMonth.textContent = `📅 本月 (${y}年${m}月)`;

    const labelLastMonth = document.getElementById('export-label-last-month');
    if (labelLastMonth) labelLastMonth.textContent = `📅 上個月 (${lastY}年${lastM}月)`;

    const labelThisYear = document.getElementById('export-label-this-year');
    if (labelThisYear) labelThisYear.textContent = `🎯 今年度 (${y - 1911}年 / ${y}年)`;

    // Set default custom dates
    const startInput = document.getElementById('export-start-date');
    const endInput = document.getElementById('export-end-date');
    const lastDayOfMonth = new Date(y, m, 0).getDate();
    if (startInput && !startInput.value) {
      startInput.value = `${y}-${String(m).padStart(2, '0')}-01`;
    }
    if (endInput && !endInput.value) {
      endInput.value = `${y}-${String(m).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
    }

    // Bind radio change
    document.querySelectorAll('input[name="export-range-type"]').forEach(radio => {
      radio.onchange = (e) => {
        const customBox = document.getElementById('export-custom-date-box');
        if (customBox) {
          customBox.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }
      };
    });

    // Bind confirm button
    const btnConfirm = document.getElementById('btn-confirm-export-excel');
    if (btnConfirm) {
      btnConfirm.onclick = handleConfirmExportExcel;
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
  }

  function closeExportExcelModal() {
    const modal = document.getElementById('modal-export-excel');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  function handleConfirmExportExcel() {
    const selectedRadio = document.querySelector('input[name="export-range-type"]:checked');
    const type = selectedRadio ? selectedRadio.value : 'all';

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const lastMDate = new Date(y, m - 2, 1);
    const lastY = lastMDate.getFullYear();
    const lastM = lastMDate.getMonth() + 1;

    let startDate = null;
    let endDate = null;
    let suffix = '全部紀錄';

    if (type === 'this_month') {
      const lastDay = new Date(y, m, 0).getDate();
      startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      suffix = `${y}年${m}月`;
    } else if (type === 'last_month') {
      const lastDay = new Date(lastY, lastM, 0).getDate();
      startDate = `${lastY}-${String(lastM).padStart(2, '0')}-01`;
      endDate = `${lastY}-${String(lastM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      suffix = `${lastY}年${lastM}月`;
    } else if (type === 'this_year') {
      startDate = `${y}-01-01`;
      endDate = `${y}-12-31`;
      suffix = `${y - 1911}年(${y}年)`;
    } else if (type === 'custom') {
      const startInput = document.getElementById('export-start-date');
      const endInput = document.getElementById('export-end-date');
      startDate = startInput && startInput.value ? startInput.value : null;
      endDate = endInput && endInput.value ? endInput.value : null;
      if (startDate && endDate) {
        suffix = `${startDate}至${endDate}`;
      } else if (startDate) {
        suffix = `${startDate}起`;
      } else if (endDate) {
        suffix = `至${endDate}`;
      } else {
        suffix = '自訂區間';
      }
    }

    closeExportExcelModal();
    executeExportExcel({ startDate, endDate, filenameSuffix: suffix });
  }

  function exportKpiToExcel(options) {
    if (options && (options.startDate || options.endDate || options.filenameSuffix)) {
      executeExportExcel(options);
    } else {
      openExportExcelModal();
    }
  }

  function executeExportExcel(range = {}) {
    const { startDate, endDate, filenameSuffix } = range;
    const linkedDaysMap = {};

    Object.keys(state.journalData).forEach(dateKey => {
      if (startDate && dateKey < startDate) return;
      if (endDate && dateKey > endDate) return;

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
      '日誌【肯定自己】',
      '日誌【感謝身邊】',
      '日誌【學習與反省】'
    ];
    const rows = [headers];

    // 核心要求 3：同日若有多個工作，覆盤與心靈交流只在第一列輸出，其餘列維持空白
    const emittedReflectionDates = new Set();

    state.kpiYears.forEach(kpi => {
      const mGoals = kpi.monthlyGoals || [];
      const doneM = mGoals.filter(m => m.completed).length;
      const kpiProgress = mGoals.length > 0 ? `${Math.round((doneM / mGoals.length) * 100)}%` : '0%';
      const dayTasksForKpi = linkedDaysMap[kpi.id] || [];

      if (mGoals.length === 0) {
        const directTasks = dayTasksForKpi.filter(t => !t.block.kpiRef.monthGoalId);
        if (directTasks.length === 0) {
          rows.push([
            kpi.year || '115年',
            kpi.title,
            kpi.description || '',
            kpiProgress,
            '年度直屬',
            '（無月目標）',
            '-',
            '',
            '（此期間無具體日誌工作）',
            '',
            '',
            '',
            ''
          ]);
        } else {
          directTasks.forEach(t => {
            let aff = '', grat = '', learn = '';
            if (!emittedReflectionDates.has(t.date)) {
              const ref = t.reflection || {};
              aff = ref.affirmation || '';
              grat = ref.gratitude || '';
              learn = ref.learning || '';
              emittedReflectionDates.add(t.date);
            }
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
              aff,
              grat,
              learn
            ]);
          });
        }
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
              '（此期間無具體日誌工作）',
              '',
              '',
              '',
              ''
            ]);
          } else {
            tasksUnderMg.forEach(t => {
              let aff = '', grat = '', learn = '';
              if (!emittedReflectionDates.has(t.date)) {
                const ref = t.reflection || {};
                aff = ref.affirmation || '';
                grat = ref.gratitude || '';
                learn = ref.learning || '';
                emittedReflectionDates.add(t.date);
              }
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
                aff,
                grat,
                learn
              ]);
            });
          }
        });

        // Tasks directly associated with the Year KPI (without monthGoalId)
        const directTasks = dayTasksForKpi.filter(t => !t.block.kpiRef.monthGoalId);
        directTasks.forEach(t => {
          let aff = '', grat = '', learn = '';
          if (!emittedReflectionDates.has(t.date)) {
            const ref = t.reflection || {};
            aff = ref.affirmation || '';
            grat = ref.gratitude || '';
            learn = ref.learning || '';
            emittedReflectionDates.add(t.date);
          }
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
            aff,
            grat,
            learn
          ]);
        });
      }
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const namePart = filenameSuffix ? `_${filenameSuffix}` : `_${getTodayString()}`;
    a.download = `年度KPI與月誌日誌工作執行總表${namePart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已成功匯出 Excel 報表 (${filenameSuffix || '全部'})！`);
  }

  // Export functions to window
  window.openExportExcelModal = openExportExcelModal;
  window.closeExportExcelModal = closeExportExcelModal;
  window.exportKpiToExcel = exportKpiToExcel;

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

  // --- Search Snippet Helpers ---
  function truncateSnippet(text, query, maxLen = 42) {
    if (!text) return '';
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) {
      return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
    }
    const start = Math.max(0, idx - 12);
    const end = Math.min(text.length, idx + query.length + 26);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  }

  function highlightKeyword(safeHtml, query) {
    if (!query) return safeHtml;
    const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQ})`, 'gi');
    return safeHtml.replace(regex, '<span class="search-highlight">$1</span>');
  }

  // --- Search Input in Sidebar (即時於搜尋框下方展開結果並支援點擊跳轉) ---
  function setupSearch() {
    function clearSearch() {
      els.searchInput.value = '';
      if (els.btnClearSearch) els.btnClearSearch.style.display = 'none';
      if (els.searchResultsBox) els.searchResultsBox.style.display = 'none';
    }

    if (els.btnClearSearch) {
      els.btnClearSearch.addEventListener('click', clearSearch);
    }
    if (els.btnCloseSearch) {
      els.btnCloseSearch.addEventListener('click', clearSearch);
    }

    els.searchInput.addEventListener('input', debounce((e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        clearSearch();
        return;
      }

      if (els.btnClearSearch) els.btnClearSearch.style.display = 'block';

      const matchedDays = [];
      const allDates = Object.keys(state.journalData).sort().reverse();

      allDates.forEach(dateKey => {
        const day = state.journalData[dateKey];
        const snippets = [];

        // 1. Search in blocks (tasks, headers, notes)
        if (day.blocks && Array.isArray(day.blocks)) {
          day.blocks.forEach(b => {
            if (b.content && b.content.toLowerCase().includes(q)) {
              const prefix = b.type === 'todo' ? (b.checked ? '☑️ ' : '☐ ') : '📌 ';
              snippets.push(prefix + truncateSnippet(b.content, q));
            }
          });
        }

        // 2. Search in reflection fields
        if (day.reflection) {
          if (day.reflection.affirmation && day.reflection.affirmation.toLowerCase().includes(q)) {
            snippets.push('✨ 肯定：' + truncateSnippet(day.reflection.affirmation, q));
          }
          if (day.reflection.gratitude && day.reflection.gratitude.toLowerCase().includes(q)) {
            snippets.push('🙏 感謝：' + truncateSnippet(day.reflection.gratitude, q));
          }
          if (day.reflection.learning && day.reflection.learning.toLowerCase().includes(q)) {
            snippets.push('💡 學習反省：' + truncateSnippet(day.reflection.learning, q));
          }
        }

        // 3. Search in tags
        if (day.tags && Array.isArray(day.tags)) {
          day.tags.forEach(t => {
            if (t.toLowerCase().includes(q)) {
              snippets.push('🏷️ 標籤：#' + t);
            }
          });
        }

        // 4. Search in KPI linkage
        if (day.blocks) {
          day.blocks.forEach(b => {
            if (b.kpiRef && b.kpiRef.yearId) {
              const kpi = state.kpiYears.find(k => k.id === b.kpiRef.yearId);
              if (kpi && kpi.title && kpi.title.toLowerCase().includes(q)) {
                snippets.push(`🎯 關聯KPI：${kpi.title}`);
              }
            }
          });
        }

        if (snippets.length > 0) {
          matchedDays.push({
            date: dateKey,
            snippets: snippets.slice(0, 3)
          });
        }
      });

      if (!els.searchResultsBox || !els.searchResultsList) return;

      els.searchResultsBox.style.display = 'block';

      if (matchedDays.length === 0) {
        if (els.searchResultsCount) els.searchResultsCount.textContent = '查無符合日誌';
        els.searchResultsList.innerHTML = `
          <div style="padding: 14px 12px; font-size:12px; color:var(--text-muted); text-align:center;">
            無符合「<b>${escapeHtml(q)}</b>」的日誌或內容
          </div>
        `;
      } else {
        if (els.searchResultsCount) els.searchResultsCount.textContent = `找到 ${matchedDays.length} 天符合日誌`;

        let html = '';
        matchedDays.forEach(item => {
          const info = formatDisplayDate(item.date);
          const isSelected = item.date === state.selectedDate;

          const snippetHtml = item.snippets.map(s => {
            const safe = escapeHtml(s);
            return `<div class="search-result-snippet">${highlightKeyword(safe, q)}</div>`;
          }).join('');

          html += `
            <div class="search-result-item ${isSelected ? 'active' : ''}" data-date="${item.date}" title="點擊檢視 ${info.title} 日誌">
              <div class="search-result-date">
                <span>📅 ${info.full}</span>
                ${item.date === getTodayString() ? '<span style="font-size:10px; background:var(--accent-light); color:var(--accent); padding:1px 5px; border-radius:10px;">今天</span>' : ''}
              </div>
              <div class="search-result-snippets">
                ${snippetHtml}
              </div>
            </div>
          `;
        });

        els.searchResultsList.innerHTML = html;

        els.searchResultsList.querySelectorAll('.search-result-item').forEach(el => {
          el.addEventListener('click', () => {
            const date = el.getAttribute('data-date');
            selectDate(date);

            els.searchResultsList.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');

            const info = formatDisplayDate(date);
            showToast(`已跳轉至 ${info.title} 日誌`);
          });
        });
      }
    }, 200));
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

    // Manual & Auto Save Button in Top Nav
    els.btnTopSave?.addEventListener('click', () => {
      saveAllCurrentData(true);
    });

    // Keyboard shortcut: Ctrl + S / Cmd + S to save everything immediately
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAllCurrentData(true);
      }
    });

    // Save everything cleanly before page is closed or reloaded
    window.addEventListener('beforeunload', () => {
      saveAllCurrentData(false);
    });

    els.spaceNameDisplay.addEventListener('click', () => {
      const newName = prompt('請輸入空間名稱：', els.spaceNameDisplay.textContent);
      if (newName && newName.trim()) {
        els.spaceNameDisplay.textContent = newName.trim();
      }
    });

    // Firebase Cloud Sync Events
    els.btnTopCloudSync?.addEventListener('click', openCloudSyncModal);
    els.btnCloseCloudSync?.addEventListener('click', closeCloudSyncModal);
    els.btnSaveCloudConfig?.addEventListener('click', handleSaveCloudConfig);
    els.btnDisconnectCloud?.addEventListener('click', handleDisconnectCloud);
    els.modalCloudSync?.addEventListener('click', (e) => {
      if (e.target === els.modalCloudSync) closeCloudSyncModal();
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
    updateSaveIndicator(true);
    initFirebaseCloudSync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
