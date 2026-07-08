/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  班級電子佈告欄 - 一次性設定腳本                      ║
 * ║  執行步驟：                                          ║
 * ║  1. 在 Apps Script 編輯器選擇 「setupAll」函式         ║
 * ║  2. 點擊執行（▶）並授權                              ║
 * ║  3. 執行完成後，點下方「執行記錄」                      ║
 * ║  4. 複製 JSON 輸出結果回傳給 AI                       ║
 * ╚═══════════════════════════════════════════════════╝
 */

function setupAll() {
  const SPREADSHEET_ID = '1p2Ii2M8dOGdBffuLe0hvE40P6qmfj4SS55uQ4_9bQrQ';
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ── 1. 建立 config 工作表（若不存在）──────────────────────
  let configSheet = ss.getSheetByName('config');
  if (!configSheet) {
    configSheet = ss.insertSheet('config');
    configSheet.getRange('A1:B1').setValues([['key', 'value']]);
    configSheet.getRange('A2:B2').setValues([['pin', '1234']]);
    Logger.log('✅ 已建立 config 工作表（PIN 預設 1234，請記得修改 B2）');
  } else {
    Logger.log('ℹ️ config 工作表已存在，跳過建立');
  }

  // ── 2. 取得或建立 Google 表單 ───────────────────────────
  const formUrl = ss.getFormUrl();
  let form;
  if (formUrl) {
    try {
      form = FormApp.openByUrl(formUrl);
      Logger.log('ℹ️ 偵測到已存在的連結表單，進行重用與更新，不重複建立表單。');
    } catch (e) {
      Logger.log('⚠️ 無法開啟已連結的表單，將建立新表單。錯誤：' + e.message);
    }
  }

  if (!form) {
    form = FormApp.create('班級電子佈告欄-發布公告');
    form.setCollectEmail(false);
    form.setLimitOneResponsePerUser(false);
    form.setAllowResponseEdits(false);
    form.setTitle('班級電子佈告欄-發布公告');

    form.addListItem()
      .setTitle('類別')
      .setChoiceValues(['作業', '小考', '老師交代事項', '學校行政公告'])
      .setRequired(true);

    form.addListItem()
      .setTitle('科目/對象')
      .setChoiceValues(['班級公告','國文','英文','數學','物理','化學','生物','地科','歷史','地理','公民與社會','體育','音樂','美術','自主學習','探究','本土語文'])
      .setRequired(true);

    form.addTextItem()
      .setTitle('截止日期')
      .setHelpText('格式：YYYY-MM-DD，例如 2026-07-15')
      .setRequired(true);

    form.addParagraphTextItem()
      .setTitle('公告內容')
      .setRequired(true);

    form.addTextItem()
      .setTitle('發布者名稱')
      .setRequired(true);

    form.addTextItem()
      .setTitle('發布角色')
      .setRequired(false);

    // ── 3. 連結表單到試算表 ───────────────────────────────────
    form.setDestination(FormApp.DestinationType.SPREADSHEET, SPREADSHEET_ID);
    Logger.log('✅ 表單已連結到試算表');

    // 等待 Google 建立回應工作表
    Utilities.sleep(3000);
  }

  // ── 4. 找出自動建立的回應工作表並加入「狀態」欄 ─────────────
  const allSheets = ss.getSheets();
  const formId = form.getId();

  let responseSheet = allSheets.find(s => {
    const sFormUrl = s.getFormUrl();
    return sFormUrl && sFormUrl.includes(formId);
  });

  if (!responseSheet) {
    // 容錯備份：如果 getFormUrl() 回傳空值，改用名稱匹配最新的表單回應表
    const matchingSheets = allSheets.filter(s => {
      const name = s.getName();
      return name.includes('表單回應') || name.toLowerCase().includes('form response');
    });
    if (matchingSheets.length > 0) {
      responseSheet = matchingSheets[matchingSheets.length - 1];
    }
  }

  let responseSheetName = '表單回應 1'; // 預設名稱
  if (responseSheet) {
    responseSheetName = responseSheet.getName();
    const statusHeader = responseSheet.getRange(1, 8);
    statusHeader.setValue('狀態');
    statusHeader.setNote('此欄由導師手動管理：留空 = 顯示，輸入「隱藏」= 在公告欄中隱藏');
    
    const marqueeHeader = responseSheet.getRange(1, 9);
    marqueeHeader.setValue('跑馬燈');
    marqueeHeader.setNote('此欄由導師手動管理：留空 = 跑馬燈（預設），輸入「不跑馬燈」= 僅在公告欄顯示但不跑馬燈');
    Logger.log(`✅ 已在「${responseSheetName}」工作表設定「狀態」與「跑馬燈」欄`);
  } else {
    Logger.log('⚠️ 未找到表單回應工作表，將使用預設名稱「表單回應 1」');
  }

  // ── 5. 收集所有 entry ID (使用 toPrefilledUrl 解析正確的 entry ID) ──
  const response = form.createResponse();
  const formItems = form.getItems();

  formItems.forEach(item => {
    const title = item.getTitle();
    let responseItem = null;

    if (item.getType() === FormApp.ItemType.TEXT) {
      responseItem = item.asTextItem().createResponse('__FIELD__' + title);
    } else if (item.getType() === FormApp.ItemType.PARAGRAPH_TEXT) {
      responseItem = item.asParagraphTextItem().createResponse('__FIELD__' + title);
    } else if (item.getType() === FormApp.ItemType.LIST) {
      const choices = item.asListItem().getChoices();
      if (choices.length > 0) {
        responseItem = item.asListItem().createResponse(choices[0].getValue());
      }
    } else if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
      const choices = item.asMultipleChoiceItem().getChoices();
      if (choices.length > 0) {
        responseItem = item.asMultipleChoiceItem().createResponse(choices[0].getValue());
      }
    }

    if (responseItem) {
      response.withItemResponse(responseItem);
    }
  });

  const prefilledUrl = response.toPrefilledUrl();
  const entryMap = {};
  const queryPart = prefilledUrl.split('?')[1];

  if (queryPart) {
    const params = queryPart.split('&');
    params.forEach(param => {
      const pair = param.split('=');
      const name = pair[0];
      const value = decodeURIComponent(pair[1] || '');

      if (value.startsWith('__FIELD__')) {
        const title = value.replace('__FIELD__', '');
        entryMap[title] = name;
      } else if (['作業', '小考', '老師交代事項', '學校行政公告'].includes(value)) {
        entryMap['類別'] = name;
      } else if (['班級公告', '國文', '英文', '數學', '物理', '化學', '生物', '地科', '歷史', '地理', '公民與社會', '體育', '音樂', '美術', '自主學習', '探究', '本土語文'].includes(value)) {
        entryMap['科目/對象'] = name;
      }
    });
  }

  // ── 6. 輸出設定 JSON ──────────────────────────────────────
  const output = {
    SPREADSHEET_ID: SPREADSHEET_ID,
    FORM_ID: form.getId(),
    RESPONSE_SHEET_NAME: responseSheetName,
    FORM_ENTRIES: {
      category:   entryMap['類別']      || 'NOT_FOUND',
      subject:    entryMap['科目/對象']  || 'NOT_FOUND',
      dueDate:    entryMap['截止日期']   || 'NOT_FOUND',
      content:    entryMap['公告內容']   || 'NOT_FOUND',
      posterName: entryMap['發布者名稱'] || 'NOT_FOUND',
      posterType: entryMap['發布角色']   || 'NOT_FOUND'
    }
  };

  Logger.log('\n========== 請複製以下 JSON 回傳給 AI ==========');
  Logger.log(JSON.stringify(output, null, 2));
  Logger.log('=================================================\n');

  return output;
}

/** 刪除多餘且未使用的「表單回應 1」工作表 */
function deleteSheet1() {
  const SPREADSHEET_ID = '1p2Ii2M8dOGdBffuLe0hvE40P6qmfj4SS55uQ4_9bQrQ';
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('表單回應 1');
  if (sheet) {
    ss.deleteSheet(sheet);
    Logger.log('✅ 已成功刪除「表單回應 1」工作表');
  } else {
    Logger.log('ℹ️ 找不到「表單回應 1」工作表，可能已被刪除');
  }
}

/** 一鍵更新已連結的 Google 表單中「類別」與「科目/對象」題目的選項（適用於本次更新） */
function updateFormChoices() {
  const SPREADSHEET_ID = '1p2Ii2M8dOGdBffuLe0hvE40P6qmfj4SS55uQ4_9bQrQ';
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const formUrl = ss.getFormUrl();
  if (!formUrl) {
    Logger.log('⚠️ 試算表尚未連結任何 Google 表單');
    return;
  }
  
  const form = FormApp.openByUrl(formUrl);
  const items = form.getItems();
  
  // 1. 更新「類別」選項
  const categoryItem = items.find(item => item.getTitle() === '類別' && item.getType() === FormApp.ItemType.LIST);
  if (categoryItem) {
    categoryItem.asListItem().setChoiceValues(['作業', '小考', '老師交代事項', '學校行政公告']);
    Logger.log('✅ 已成功將表單中的「類別」選項更新為：[作業, 小考, 老師交代事項, 學校行政公告]');
  } else {
    Logger.log('⚠️ 在表單中找不到名稱為「類別」的下拉選單題目');
  }
  
  // 2. 更新「科目/對象」選項（增列最新學科）
  const subjectItem = items.find(item => item.getTitle() === '科目/對象' && item.getType() === FormApp.ItemType.LIST);
  if (subjectItem) {
    subjectItem.asListItem().setChoiceValues(['班級公告','國文','英文','數學','物理','化學','生物','地科','歷史','地理','公民與社會','體育','音樂','美術','自主學習','探究','本土語文']);
    Logger.log('✅ 已成功將表單中的「科目/對象」選項更新，包含最新學科（公民與社會、自主學習、探究、本土語文）');
  } else {
    Logger.log('⚠️ 在表單中找不到名稱為「科目/對象」的下拉選單題目');
  }
}
