/* app.js - 班級環境打掃分組與排程系統核心邏輯 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 狀態管理 (State) ---
  const state = {
    students: [],
    excludedDates: new Map(), // Date string (YYYY-MM-DD) -> Reason string
    segments: [], // Array of segments
    dutySchedule: [], // Array of duty periods
    groupA: { inner: [], outer: [], rest: [] },
    groupB: { inner: [], outer: [], rest: [] },
    currentCalendarDate: new Date(2026, 8, 1) // default: Sep 2026
  };

  // --- 預設資料設定 ---
  const DEFAULT_STUDENTS_COUNT = 38;
  const DEFAULT_CADRE_INDICES = [0, 1, 2, 3, 4, 5]; // 前 6 位為幹部

  const DEFAULT_EXCLUDED_DATES = [
    { date: '2026-09-28', reason: '教師節彈性放假' },
    { date: '2026-10-09', reason: '國慶日彈性放假' },
    { date: '2026-10-10', reason: '國慶日放假' },
    { date: '2026-10-15', reason: '第一次段考' },
    { date: '2026-10-16', reason: '第一次段考' },
    { date: '2026-12-03', reason: '第二次段考' },
    { date: '2026-12-04', reason: '第二次段考' },
    { date: '2026-12-25', reason: '行憲紀念日放假' },
    { date: '2027-01-01', reason: '元旦放假' },
    { date: '2027-01-14', reason: '期末考試' },
    { date: '2027-01-15', reason: '期末考試' }
  ];

  const INNER_ROLES = [
    { name: '黑板清潔、窗台', count: 1 },
    { name: '教室內拖地 (人員 1)', count: 1 },
    { name: '教室內拖地 (人員 2)', count: 1 },
    { name: '教室內拖地 (人員 3)', count: 1 },
    { name: '教室內掃地 (人員 1)', count: 1 },
    { name: '教室內掃地 (人員 2)', count: 1 },
    { name: '教室內掃地 (人員 3)', count: 1 },
    { name: '講台、走廊掃拖', count: 1 }
  ];

  const OUTER_ROLES = [
    { name: '物理科辦公室掃拖', count: 1 },
    { name: '各教室黑板清潔', count: 1 },
    { name: '教室輪流掃拖與洗手槽 (人員 1)', count: 1 },
    { name: '教室輪流掃拖與洗手槽 (人員 2)', count: 1 },
    { name: '教室輪流掃拖與洗手槽 (人員 3)', count: 1 },
    { name: '教室輪流掃拖與洗手槽 (人員 4)', count: 1 },
    { name: '走廊掃拖 (人員 1)', count: 1 },
    { name: '走廊掃拖 (人員 2)', count: 1 }
  ];

  // --- DOM 元素引用 ---
  const elStartDate = document.getElementById('startDate');
  const elEndDate = document.getElementById('endDate');
  const elExcludeDate = document.getElementById('excludeDate');
  const elExcludeReason = document.getElementById('excludeReason');
  const elBtnExcludeDate = document.getElementById('btnExcludeDate');
  const elExcludedDatesList = document.getElementById('excludedDatesList');
  const elCadreOption = document.getElementById('cadreOption');
  const elStudentGrid = document.getElementById('studentGrid');
  const elBtnResetRoster = document.getElementById('btnResetRoster');
  const elBtnGenerate = document.getElementById('btnGenerate');

  // 數據面板
  const elStatTotalDays = document.getElementById('statTotalDays');
  const elStatWeekendDays = document.getElementById('statWeekendDays');
  const elStatExcludedDays = document.getElementById('statExcludedDays');
  const elStatCleanDays = document.getElementById('statCleanDays');
  const elSegmentCards = document.getElementById('segmentCards');

  // 分組面板
  const elGroupAInnerList = document.getElementById('groupAInnerList');
  const elGroupAOuterList = document.getElementById('groupAOuterList');
  const elGroupBInnerList = document.getElementById('groupBInnerList');
  const elGroupBOuterList = document.getElementById('groupBOuterList');
  const elCadreNamesList = document.getElementById('cadreNamesList');

  // 行事曆面板
  const elCurrentMonthYear = document.getElementById('currentMonthYear');
  const elCalendarGrid = document.getElementById('calendarGrid');
  const elBtnPrevMonth = document.getElementById('btnPrevMonth');
  const elBtnNextMonth = document.getElementById('btnNextMonth');
  // 值日生面板
  const elDutyTableBody = document.getElementById('dutyTableBody');

  // 打掃工作設定面板
  const elInnerRolesInput = document.getElementById('innerRolesInput');
  const elOuterRolesInput = document.getElementById('outerRolesInput');

  // 通用功能
  const elPrint = document.getElementById('btnPrint');
  const elExportJSON = document.getElementById('btnExportJSON');

  // --- 初始化功能 (Initialization) ---
  function init() {
    // 1. 初始化名單
    resetRoster();

    // 初始化打掃工作設定
    elInnerRolesInput.value = INNER_ROLES.map(r => r.name).join('\n');
    elOuterRolesInput.value = OUTER_ROLES.map(r => r.name).join('\n');

    // 2. 初始化排除日期
    DEFAULT_EXCLUDED_DATES.forEach(item => {
      state.excludedDates.set(item.date, item.reason);
    });
    renderExcludedDates();

    // 3. 綁定事件監聽器
    bindEvents();

    // 4. 首次執行計算
    calculateAndGenerate();
  }

  // --- 事件綁定 (Event Binding) ---
  function bindEvents() {
    // 排除日期新增
    elBtnExcludeDate.addEventListener('click', () => {
      const dateStr = elExcludeDate.value;
      const reason = elExcludeReason.value.trim() || '自訂排除';
      if (dateStr) {
        state.excludedDates.set(dateStr, reason);
        elExcludeDate.value = '';
        elExcludeReason.value = '';
        renderExcludedDates();
        calculateAndGenerate();
      }
    });

    // 重設名單
    elBtnResetRoster.addEventListener('click', () => {
      resetRoster();
      calculateAndGenerate();
    });

    // 幹部選項變更
    elCadreOption.addEventListener('change', () => {
      calculateAndGenerate();
    });

    // 開始分組排程
    elBtnGenerate.addEventListener('click', () => {
      calculateAndGenerate();
      
      const feedback = document.getElementById('generateFeedback');
      if (feedback) {
        feedback.style.display = 'block';
        if (window.feedbackTimeout) clearTimeout(window.feedbackTimeout);
        window.feedbackTimeout = setTimeout(() => {
          feedback.style.display = 'none';
        }, 2000);
      }
    });

    // 頁籤切換
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = `tab-${btn.dataset.tab}`;
        document.getElementById(tabId).classList.add('active');

        // 如果切換到行事曆，重新繪製
        if (btn.dataset.tab === 'calendar') {
          renderCalendar();
        }
      });
    });

    // 行事曆月份切換
    elBtnPrevMonth.addEventListener('click', () => {
      state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
      renderCalendar();
    });

    elBtnNextMonth.addEventListener('click', () => {
      state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
      renderCalendar();
    });

    // 匯出與列印
    elPrint.addEventListener('click', () => {
      window.print();
    });

    elExportJSON.addEventListener('click', () => {
      const exportData = {
        semester: {
          start: elStartDate.value,
          end: elEndDate.value,
          totalCleanDays: state.segments.reduce((acc, s) => acc + s.daysCount, 0)
        },
        excludedDates: Array.from(state.excludedDates.entries()),
        students: state.students,
        innerRolesText: elInnerRolesInput.value,
        outerRolesText: elOuterRolesInput.value,
        cadreOption: elCadreOption.value,
        groups: {
          groupA: state.groupA,
          groupB: state.groupB
        },
        dutySchedule: state.dutySchedule,
        segments: state.segments
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `班級打掃分組排程表_${getLocalDateString(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // 載入 JSON 檔案
    const elImportJSON = document.getElementById('btnImportJSON');
    if (elImportJSON) {
      elImportJSON.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importData = JSON.parse(event.target.result);
            
            // 恢復日期
            if (importData.semester) {
              elStartDate.value = importData.semester.start || '2026-08-31';
              elEndDate.value = importData.semester.end || '2027-01-15';
            }

            // 恢復排除日期
            if (importData.excludedDates) {
              state.excludedDates = new Map(importData.excludedDates);
            } else {
              state.excludedDates.clear();
            }

            // 恢復幹部選項
            if (importData.cadreOption) {
              elCadreOption.value = importData.cadreOption;
            }

            // 恢復名單與幹部
            if (importData.students) {
              state.students = importData.students;
              renderRosterGrid();
            }
            
            // 恢復工作項目設定
            if (importData.innerRolesText) {
              elInnerRolesInput.value = importData.innerRolesText;
            }
            if (importData.outerRolesText) {
              elOuterRolesInput.value = importData.outerRolesText;
            }

            renderExcludedDates();
            calculateAndGenerate();
            
            alert('檔案載入成功！排程已自動更新。');
            elImportJSON.value = '';
          } catch (err) {
            alert('載入失敗：檔案格式不正確！');
          }
        };
        reader.readAsText(file);
      });
    }
  }

  // --- 名單管理功能 (Roster Management) ---
  function resetRoster() {
    state.students = [];
    for (let i = 1; i <= DEFAULT_STUDENTS_COUNT; i++) {
      const formattedNum = String(i).padStart(2, '0');
      state.students.push({
        id: i,
        name: `座號 ${formattedNum}`,
        isCadre: DEFAULT_CADRE_INDICES.includes(i - 1)
      });
    }
    renderRosterGrid();
  }

  function renderRosterGrid() {
    elStudentGrid.innerHTML = '';
    state.students.forEach((student, index) => {
      const item = document.createElement('div');
      item.className = `student-item ${student.isCadre ? 'is-cadre' : ''}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = student.isCadre;
      checkbox.id = `cadre-${student.id}`;
      checkbox.addEventListener('change', (e) => {
        // 限制最多勾選 6 人，或提示警告
        const checkedCount = state.students.filter(s => s.isCadre).length;
        if (e.target.checked && checkedCount >= 6) {
          e.target.checked = false;
          alert('依制度設計，幹部人數固定為 6 人！請先取消勾選其他幹部。');
          return;
        }
        
        student.isCadre = e.target.checked;
        item.classList.toggle('is-cadre', student.isCadre);
        updateCadresCount();
      });

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = student.name;
      nameInput.addEventListener('change', (e) => {
        student.name = e.target.value.trim() || `座號 ${String(student.id).padStart(2, '0')}`;
      });

      item.appendChild(checkbox);
      item.appendChild(nameInput);
      elStudentGrid.appendChild(item);
    });
    updateCadresCount();
  }

  function updateCadresCount() {
    const cadreCount = state.students.filter(s => s.isCadre).length;
    const label = document.querySelector('.roster-header label');
    if (cadreCount === 6) {
      label.innerHTML = `學生名單（共 ${DEFAULT_STUDENTS_COUNT} 人，<span style="color:#f59e0b; font-weight:700;">已正確設定 6 名幹部</span>）`;
    } else {
      label.innerHTML = `學生名單（共 ${DEFAULT_STUDENTS_COUNT} 人，<span style="color:#ef4444; font-weight:700;">目前勾選了 ${cadreCount} 名幹部，請調整至 6 人</span>）`;
    }
  }

  // --- 排除日期管理 (Excluded Dates) ---
  function renderExcludedDates() {
    elExcludedDatesList.innerHTML = '';
    // 按日期排序顯示
    const sortedDates = Array.from(state.excludedDates.keys()).sort();
    sortedDates.forEach(dateStr => {
      const li = document.createElement('li');
      
      const infoSpan = document.createElement('span');
      infoSpan.innerHTML = `<span class="date-text">${dateStr}</span> <span class="reason-text">(${state.excludedDates.get(dateStr)})</span>`;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.innerHTML = '×';
      removeBtn.addEventListener('click', () => {
        state.excludedDates.delete(dateStr);
        renderExcludedDates();
        calculateAndGenerate();
      });

      li.appendChild(infoSpan);
      li.appendChild(removeBtn);
      elExcludedDatesList.appendChild(li);
    });
  }

  // --- 核心演算法：計算排程與分組 (Generation Algorithm) ---
  function calculateAndGenerate() {
    const startStr = elStartDate.value;
    const endStr = elEndDate.value;
    if (!startStr || !endStr) return;

    const startDate = parseLocalDate(startStr);
    const endDate = parseLocalDate(endStr);
    if (startDate > endDate) {
      alert('結束日期不能早於開始日期！');
      return;
    }

    // 1. 篩選實際打掃日期
    const allDates = [];
    let weekendCount = 0;
    let excludedCount = 0;
    
    let curDate = new Date(startDate);
    while (curDate <= endDate) {
      const dateStr = getLocalDateString(curDate);
      const dayOfWeek = curDate.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendCount++;
      } else if (state.excludedDates.has(dateStr)) {
        excludedCount++;
      } else {
        allDates.push(dateStr);
      }
      
      curDate.setDate(curDate.getDate() + 1);
    }

    const totalDays = allDates.length + weekendCount + excludedCount;
    elStatTotalDays.textContent = totalDays;
    elStatWeekendDays.textContent = weekendCount;
    elStatExcludedDays.textContent = excludedCount;
    elStatCleanDays.textContent = allDates.length;

    // 2. 切分 4 個階段 (2 + 2 段)
    divideSegments(allDates);

    // 3. 學生分組 (A / B 組)
    performStudentGrouping();

    // 4. 值日生排班 (2 週輪替一次)
    generateDutySchedule(allDates);

    // 5. 渲染結果
    renderSummaryTab();
    renderGroupsTab();
    renderCalendar();
  }

  // 將實際打掃日均分成 4 段
  function divideSegments(allCleanDates) {
    state.segments = [];
    const totalCleanDays = allCleanDates.length;
    if (totalCleanDays < 4) {
      // 避免天數過少導致除以 4 產生錯誤
      for (let i = 0; i < 4; i++) {
        state.segments.push({
          index: i + 1,
          dates: [],
          daysCount: 0,
          activeGroup: i % 2 === 0 ? 'A' : 'B'
        });
      }
      return;
    }

    const baseSize = Math.floor(totalCleanDays / 4);
    const remainder = totalCleanDays % 4;

    let currentIndex = 0;
    for (let i = 0; i < 4; i++) {
      // 餘數均攤給前幾個階段
      const size = baseSize + (i < remainder ? 1 : 0);
      const segmentDates = allCleanDates.slice(currentIndex, currentIndex + size);
      currentIndex += size;

      state.segments.push({
        index: i + 1,
        dates: segmentDates,
        daysCount: segmentDates.length,
        activeGroup: i % 2 === 0 ? 'A' : 'B' // 1、3段 A組，2、4段 B組
      });
    }
  }

  // 學生分組演算
  function performStudentGrouping() {
    const cadres = state.students.filter(s => s.isCadre);
    const nonCadres = state.students.filter(s => !s.isCadre);

    // 讀取並解析手動輸入的打掃工作內容
    const parsedInner = elInnerRolesInput.value.split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);
    const parsedOuter = elOuterRolesInput.value.split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    // 補齊不足 8 項的工作以防出錯
    while (parsedInner.length < 8) parsedInner.push(`未指派內掃工作 ${parsedInner.length + 1}`);
    while (parsedOuter.length < 8) parsedOuter.push(`未指派外掃工作 ${parsedOuter.length + 1}`);

    // 隨機打亂非幹部名單（確保公平）
    const shuffledNonCadres = shuffleArray([...nonCadres]);

    const cadreMode = elCadreOption.value;
    let cleaners = [];
    
    if (cadreMode === 'exempt') {
      cleaners = shuffledNonCadres;
    } else {
      cleaners = shuffleArray([...state.students]);
    }

    const mid = Math.ceil(cleaners.length / 2);
    const groupANames = cleaners.slice(0, mid);
    const groupBNames = cleaners.slice(mid);

    state.groupA = assignRoles(groupANames, parsedInner, parsedOuter);
    state.groupB = assignRoles(groupBNames, parsedInner, parsedOuter);
  }

  // 統一指派打掃角色 (支援任意人數，自動處理輪空/休息)
  function assignRoles(studentList, innerRoles, outerRoles) {
    const inner = [];
    const outer = [];
    const rest = [];

    // 前 8 人內掃
    for (let i = 0; i < 8; i++) {
      inner.push({
        role: innerRoles[i],
        student: studentList[i] ? studentList[i].name : '未分派'
      });
    }

    // 後 8 人外掃
    for (let i = 0; i < 8; i++) {
      outer.push({
        role: outerRoles[i],
        student: studentList[i + 8] ? studentList[i + 8].name : '未分派'
      });
    }

    // 剩餘的人休息
    for (let i = 16; i < studentList.length; i++) {
      rest.push(studentList[i] ? studentList[i].name : '無');
    }

    return { inner, outer, rest };
  }

  // 值日生排班演算 (2 週輪替一次)
  function generateDutySchedule(allCleanDates) {
    state.dutySchedule = [];
    const nonCadres = state.students.filter(s => !s.isCadre);
    
    // 公平輪替隊列：當人數不夠填滿時，重新打亂追加
    let dutyQueue = [];
    const getNextDutyTrio = () => {
      if (dutyQueue.length < 3) {
        const nextRound = shuffleArray([...nonCadres]).map(s => s.name);
        dutyQueue = dutyQueue.concat(nextRound);
      }
      return [dutyQueue.shift(), dutyQueue.shift(), dutyQueue.shift()];
    };

    // 每 10 個實際打掃日為一回合 (2 週)
    const DAYS_PER_PERIOD = 10;
    const totalPeriods = Math.ceil(allCleanDates.length / DAYS_PER_PERIOD);

    for (let i = 0; i < totalPeriods; i++) {
      const periodDates = allCleanDates.slice(i * DAYS_PER_PERIOD, (i + 1) * DAYS_PER_PERIOD);
      const dateRangeStr = periodDates.length > 0 
        ? `${formatChineseDate(periodDates[0])} ~ ${formatChineseDate(periodDates[periodDates.length - 1])}`
        : '無';

      state.dutySchedule.push({
        periodIndex: i + 1,
        dates: periodDates,
        dateRange: dateRangeStr,
        daysCount: periodDates.length,
        assigned: getNextDutyTrio()
      });
    }

    renderDutyTab();
  }

  // --- 畫面渲染功能 (UI Rendering) ---

  // 1. 總覽分頁
  function renderSummaryTab() {
    elSegmentCards.innerHTML = '';
    state.segments.forEach(seg => {
      const card = document.createElement('div');
      card.className = `segment-card ${seg.activeGroup === 'A' ? 'group-a-active' : 'group-b-active'}`;
      
      const title = document.createElement('div');
      title.className = 'segment-title';
      title.innerHTML = `<span>階段 ${seg.index}</span> <span class="team-tag ${seg.activeGroup.toLowerCase()}">${seg.activeGroup} 組打掃</span>`;

      const dateStr = seg.dates.length > 0
        ? `${formatChineseDate(seg.dates[0])} 至 ${formatChineseDate(seg.dates[seg.dates.length - 1])}`
        : '此階段無打掃天數';
        
      const dates = document.createElement('div');
      dates.className = 'segment-dates';
      dates.textContent = dateStr;

      const info = document.createElement('div');
      info.className = 'segment-info';
      info.innerHTML = `<span>實際執勤天數</span><span class="days">${seg.daysCount} 天</span>`;

      card.appendChild(title);
      card.appendChild(dates);
      card.appendChild(info);
      elSegmentCards.appendChild(card);
    });
  }

  // 2. 分組名單分頁
  function renderGroupsTab() {
    // 渲染 A 組
    elGroupAInnerList.innerHTML = state.groupA.inner.map(r => 
      `<li><span class="role-name">${r.role}</span><span class="role-assigned">${r.student}</span></li>`
    ).join('');
    
    elGroupAOuterList.innerHTML = state.groupA.outer.map(r => 
      `<li><span class="role-name">${r.role}</span><span class="role-assigned">${r.student}</span></li>`
    ).join('');

    if (state.groupA.rest && state.groupA.rest.length > 0) {
      const restLi = `<li><span class="role-name" style="color:#e2e8f0;">階段輪空/休息</span><span class="role-assigned" style="color:#94a3b8;">${state.groupA.rest.join(', ')}</span></li>`;
      elGroupAInnerList.innerHTML += restLi;
    }

    // 渲染 B 組
    elGroupBInnerList.innerHTML = state.groupB.inner.map(r => 
      `<li><span class="role-name">${r.role}</span><span class="role-assigned">${r.student}</span></li>`
    ).join('');
    
    elGroupBOuterList.innerHTML = state.groupB.outer.map(r => 
      `<li><span class="role-name">${r.role}</span><span class="role-assigned">${r.student}</span></li>`
    ).join('');

    if (state.groupB.rest && state.groupB.rest.length > 0) {
      const restLi = `<li><span class="role-name" style="color:#e2e8f0;">階段輪空/休息</span><span class="role-assigned" style="color:#94a3b8;">${state.groupB.rest.join(', ')}</span></li>`;
      elGroupBInnerList.innerHTML += restLi;
    }

    // 渲染免輪值幹部
    const cadres = state.students.filter(s => s.isCadre);
    elCadreNamesList.innerHTML = cadres.map(c => 
      `<span class="cadre-tag">${c.name}</span>`
    ).join('');
  }

  // 3. 值日生分頁
  function renderDutyTab() {
    elDutyTableBody.innerHTML = '';
    state.dutySchedule.forEach(p => {
      const tr = document.createElement('tr');
      
      const weekRange = `第 ${((p.periodIndex - 1) * 2) + 1} ~ ${p.periodIndex * 2} 週`;
      
      const dutyTags = p.assigned.map(name => `<span class="duty-tag">${name}</span>`).join(' ');

      tr.innerHTML = `
        <td><strong>第 ${p.periodIndex} 回合</strong></td>
        <td>${weekRange}</td>
        <td>${p.dateRange}</td>
        <td>${p.daysCount} 天</td>
        <td><div class="duty-names">${dutyTags}</div></td>
      `;
      elDutyTableBody.appendChild(tr);
    });
  }

  // 4. 行事曆分頁
  function renderCalendar() {
    elCalendarGrid.innerHTML = '';
    
    const year = state.currentCalendarDate.getFullYear();
    const month = state.currentCalendarDate.getMonth(); // 0-indexed

    elCurrentMonthYear.textContent = `${year} 年 ${month + 1} 月`;

    // 取得該月第一天與最後一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 第一天是星期幾 (0是星期日)
    const startOffset = firstDay.getDay();

    // 填寫月前空白
    for (let i = 0; i < startOffset; i++) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'calendar-day empty';
      elCalendarGrid.appendChild(emptyDiv);
    }

    // 填寫日期
    const daysInMonth = lastDay.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const curDate = new Date(year, month, day);
      const dateStr = getLocalDateString(curDate);
      const dayOfWeek = curDate.getDay();

      const dayDiv = document.createElement('div');
      dayDiv.className = 'calendar-day';

      const numSpan = document.createElement('span');
      numSpan.className = 'day-number';
      numSpan.textContent = day;
      dayDiv.appendChild(numSpan);

      // 行事曆的點選排除/取消排除功能 (高互動)
      dayDiv.addEventListener('click', () => {
        if (dayOfWeek === 0 || dayOfWeek === 6) return; // 週末不可手動編輯
        if (state.excludedDates.has(dateStr)) {
          state.excludedDates.delete(dateStr);
        } else {
          state.excludedDates.set(dateStr, '自訂排除');
        }
        renderExcludedDates();
        calculateAndGenerate();
      });

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayDiv.classList.add('weekend-day');
      } else if (state.excludedDates.has(dateStr)) {
        dayDiv.classList.add('excluded-day');
        
        const info = document.createElement('div');
        info.className = 'day-info';
        info.textContent = state.excludedDates.get(dateStr);
        dayDiv.appendChild(info);
      } else {
        // 尋找此日期在哪一個階段 (Segment)
        const segment = state.segments.find(s => s.dates.includes(dateStr));
        if (segment) {
          dayDiv.classList.add(segment.activeGroup === 'A' ? 'group-a-day' : 'group-b-day');
          
          const info = document.createElement('div');
          info.className = 'day-info';
          info.textContent = `${segment.activeGroup} 組打掃`;
          dayDiv.appendChild(info);

          // 尋找當天值日生
          const dutyPeriod = state.dutySchedule.find(p => p.dates.includes(dateStr));
          if (dutyPeriod) {
            const dutyText = document.createElement('div');
            dutyText.style.fontSize = '0.65rem';
            dutyText.style.color = '#a5b4fc';
            dutyText.style.marginTop = '0.2rem';
            // 取三個值日生名字縮寫/尾字，或僅顯示 "值:..."
            const initials = dutyPeriod.assigned.map(n => n.slice(-2)).join('/');
            dutyText.textContent = `值: ${initials}`;
            dayDiv.appendChild(dutyText);
          }
        }
      }

      elCalendarGrid.appendChild(dayDiv);
    }
  }

  // --- 輔助函式 (Helper Functions) ---
  
  // 陣列隨機打亂 (Fisher-Yates Shuffle)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // 格式化日期為中文顯示 (月/日)
  function formatChineseDate(dateStr) {
    const parts = dateStr.split('-');
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  }

  // 取得本機時區日期字串 (YYYY-MM-DD)
  function getLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 本機時區解析日期字串
  function parseLocalDate(dateStr) {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  // 啟動系統
  init();
});
