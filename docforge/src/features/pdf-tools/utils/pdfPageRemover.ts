import { PDFDocument } from 'pdf-lib';

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
 * 移除 PDF 頁面
 * @param file PDF 檔案
 * @param pageIndicesToRemove 要移除的頁面索引陣列（0-based）
 * @returns 移除頁面後的 PDF Blob
 */
export async function removePDFPages(
    file: File,
    pageIndicesToRemove: number[]
): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer);
    const totalPages = sourcePdf.getPageCount();

    // 建立要保留的頁面索引
    const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i).filter(
        i => !pageIndicesToRemove.includes(i)
    );

    if (pagesToKeep.length === 0) {
        throw new Error('至少需要保留一頁');
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, pagesToKeep);
    copiedPages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
}
