import { PDFDocument } from 'pdf-lib';

/**
 * 合併多個 PDF 檔案成單一 PDF
 * @param files PDF 檔案陣列
 * @returns 合併後的 PDF Blob
 */
export async function mergePDFs(files: File[]): Promise<Blob> {
    if (files.length === 0) {
        throw new Error('沒有檔案可合併');
    }

    // 建立新的 PDF 文件
    const mergedPdf = await PDFDocument.create();

    // 逐個處理每個 PDF 檔案
    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);

        // 複製所有頁面到新文件
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    // 儲存為 Blob
    const mergedPdfBytes = await mergedPdf.save();
    return new Blob([mergedPdfBytes], { type: 'application/pdf' });
}

/**
 * 取得 PDF 檔案的頁數
 * @param file PDF 檔案
 * @returns 頁數
 */
export async function getPDFPageCount(file: File): Promise<number> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    return pdf.getPageCount();
}

/**
 * 產生 PDF 第一頁的預覽圖（未實作）
 * @returns 佔位圖 Data URL
 */
export async function generatePDFThumbnail(): Promise<string> {
    // TODO: 使用 pdf.js 實作預覽圖生成
    // 暫時返回佔位圖
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5OTkiPlBERjwvdGV4dD48L3N2Zz4=';
}
