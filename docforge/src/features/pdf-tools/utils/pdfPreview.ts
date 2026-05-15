import * as pdfjsLib from 'pdfjs-dist';
import { workerPool } from './pdfWorkerPool';

// 確保 PDF Worker 已初始化
// 所有 PDF 操作都會共用同一個 Worker，提升效能
workerPool.ensureWorkerReady();

/**
 * 渲染 PDF 單頁為縮圖
 * @param file PDF 檔案
 * @param pageNum 頁碼（1-indexed）
 * @param scale 縮放比例
 * @returns DataURL 字串
 */
export async function renderPDFPage(
    file: File,
    pageNum: number,
    scale: number = 0.5
): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (pageNum < 1 || pageNum > pdf.numPages) {
            throw new Error(`頁碼 ${pageNum} 超出範圍 (1-${pdf.numPages})`);
        }

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('無法建立 canvas context');
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport,
        }).promise;

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('渲染 PDF 頁面失敗:', error);
        throw error;
    }
}

/**
 * 取得 PDF 總頁數
 */
export async function getPDFPageCount(file: File): Promise<number> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        return pdf.numPages;
    } catch (error) {
        console.error('取得 PDF 頁數失敗:', error);
        throw error;
    }
}

/**
 * 渲染所有頁面為縮圖陣列
 */
export async function renderAllPDFPages(
    file: File,
    scale: number = 0.3
): Promise<string[]> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const thumbnails: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const dataUrl = await renderPDFPage(file, i, scale);
            thumbnails.push(dataUrl);
        }

        return thumbnails;
    } catch (error) {
        console.error('渲染所有頁面失敗:', error);
        throw error;
    }
}
