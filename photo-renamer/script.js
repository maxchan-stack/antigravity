// 批量照片改名工具 - 前端邏輯

let currentFiles = [];

// 取得 DOM 元素
const folderPathInput = document.getElementById('folderPath');
const prefixInput = document.getElementById('prefix');
const startNumberInput = document.getElementById('startNumber');
const digitCountInput = document.getElementById('digitCount');
const scanBtn = document.getElementById('scanBtn');
const renameBtn = document.getElementById('renameBtn');
const previewCard = document.getElementById('previewCard');
const previewList = document.getElementById('previewList');
const fileCount = document.getElementById('fileCount');
const resultCard = document.getElementById('resultCard');
const resultContent = document.getElementById('resultContent');

/**
 * 掃描資料夾
 */
async function scanFolder() {
    const folderPath = folderPathInput.value.trim();
    const prefix = prefixInput.value.trim();
    const startNumber = parseInt(startNumberInput.value);
    const digitCount = parseInt(digitCountInput.value);

    // 驗證輸入
    if (!folderPath) {
        showError('請輸入資料夾路徑');
        return;
    }

    if (!prefix) {
        showError('請輸入檔名前綴');
        return;
    }

    // 顯示載入狀態
    scanBtn.disabled = true;
    scanBtn.textContent = '掃描中...';
    resultCard.style.display = 'none';

    try {
        const response = await fetch('/api/scan-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                folder_path: folderPath,
                prefix: prefix,
                start_number: startNumber,
                digit_count: digitCount,
            }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            currentFiles = data.files;
            displayPreview(data.files, data.total);
            renameBtn.disabled = false;
        } else {
            showError(data.detail || '掃描失敗');
        }
    } catch (error) {
        showError('發生錯誤：' + error.message);
    } finally {
        scanBtn.disabled = false;
        scanBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            掃描資料夾
        `;
    }
}

/**
 * 顯示預覽列表
 */
function displayPreview(files, total) {
    previewCard.style.display = 'block';
    fileCount.textContent = `共 ${total} 個檔案`;

    previewList.innerHTML = '';

    files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.style.animationDelay = `${index * 0.03}s`;

        item.innerHTML = `
            <div class="preview-names">
                <span class="original-name">${file.original_name}</span>
                <span class="arrow">→</span>
                <span class="new-name">${file.new_name}</span>
            </div>
        `;

        previewList.appendChild(item);
    });

    // 捲動到預覽區域
    previewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 執行改名
 */
async function renameFiles() {
    const folderPath = folderPathInput.value.trim();
    const prefix = prefixInput.value.trim();
    const startNumber = parseInt(startNumberInput.value);
    const digitCount = parseInt(digitCountInput.value);

    // 確認對話框
    if (!confirm(`確定要將 ${currentFiles.length} 個檔案改名嗎？\n\n此操作無法復原！`)) {
        return;
    }

    // 顯示載入狀態
    renameBtn.disabled = true;
    renameBtn.textContent = '改名中...';

    try {
        const response = await fetch('/api/rename', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                folder_path: folderPath,
                prefix: prefix,
                start_number: startNumber,
                digit_count: digitCount,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            showResult(data);

            // 如果成功，清空預覽
            if (data.success) {
                setTimeout(() => {
                    previewCard.style.display = 'none';
                    currentFiles = [];
                    renameBtn.disabled = true;
                }, 2000);
            }
        } else {
            showError(data.detail || '改名失敗');
        }
    } catch (error) {
        showError('發生錯誤：' + error.message);
    } finally {
        renameBtn.disabled = false;
        renameBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 13l4 4L19 7"/>
            </svg>
            執行改名
        `;
    }
}

/**
 * 顯示結果
 */
function showResult(data) {
    resultCard.style.display = 'block';

    const isSuccess = data.success;
    const icon = isSuccess
        ? '<svg class="icon" style="color: var(--success);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        : '<svg class="icon" style="color: var(--danger);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    let html = `
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            ${icon}
            <h2 class="${isSuccess ? 'result-success' : 'result-error'}" style="margin: 0;">
                ${isSuccess ? '✓ 改名成功！' : '✗ 改名失敗'}
            </h2>
        </div>
        <div class="result-info">
            <p><strong>已改名：</strong>${data.renamed_count} / ${data.total} 個檔案</p>
    `;

    if (data.errors && data.errors.length > 0) {
        html += `
            <p style="margin-top: 1rem; color: var(--danger);"><strong>錯誤：</strong></p>
            <ul style="margin-left: 1.5rem; color: var(--text-secondary);">
                ${data.errors.map(err => `<li>${err}</li>`).join('')}
            </ul>
        `;
    }

    html += `</div>`;
    resultContent.innerHTML = html;

    // 捲動到結果區域
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 顯示錯誤訊息
 */
function showError(message) {
    resultCard.style.display = 'block';
    resultContent.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <svg class="icon" style="color: var(--danger);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h2 class="result-error" style="margin: 0;">發生錯誤</h2>
        </div>
        <div class="result-info">
            <p>${message}</p>
        </div>
    `;

    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 事件監聽
scanBtn.addEventListener('click', scanFolder);
renameBtn.addEventListener('click', renameFiles);

// Enter 鍵快捷鍵
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !scanBtn.disabled) {
        scanFolder();
    }
});
