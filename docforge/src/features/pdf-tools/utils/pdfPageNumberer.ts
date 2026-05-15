import { PDFDocument, rgb } from 'pdf-lib';

/**
 * 為 PDF 添加頁碼
 * @param file PDF 檔案
 * @param options 頁碼選項
 * @returns 添加頁碼後的 PDF Blob
 */
export async function addPageNumbers(
    file: File,
    options: {
        position?: 'bottom-center' | 'bottom-right' | 'bottom-left';
        startNumber?: number;
        format?: 'number' | 'pageOfTotal';
    } = {}
): Promise<Blob> {
    const {
        position = 'bottom-center',
        startNumber = 1,
        format = 'number',
    } = options;

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    pages.forEach((page, index) => {
        const { width } = page.getSize();
        const pageNumber = startNumber + index;

        let text = '';
        if (format === 'number') {
            text = `${pageNumber}`;
        } else {
            text = `${pageNumber} / ${totalPages}`;
        }

        let x = 0;
        const y = 20;

        switch (position) {
            case 'bottom-left':
                x = 30;
                break;
            case 'bottom-right':
                x = width - 50;
                break;
            case 'bottom-center':
            default:
                x = width / 2 - 10;
                break;
        }

        page.drawText(text, {
            x,
            y,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
        });
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
}
