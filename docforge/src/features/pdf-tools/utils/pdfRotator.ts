import { PDFDocument, degrees } from 'pdf-lib';

/**
 * 旋轉 PDF 頁面
 * @param file PDF 檔案
 * @param pageRotations 頁面旋轉設定陣列 [[頁碼, 角度], ...]
 * @returns 旋轉後的 PDF Blob
 */
export async function rotatePDF(
    file: File,
    pageRotations: Array<[number, 90 | 180 | 270]>
): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pages = pdfDoc.getPages();

    // 應用每頁的旋轉設定
    pageRotations.forEach(([pageNum, rotation]) => {
        const pageIndex = pageNum - 1; // 轉換為 0-based index
        if (pageIndex >= 0 && pageIndex < pages.length) {
            const page = pages[pageIndex];
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees(currentRotation + rotation));
        }
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
}
