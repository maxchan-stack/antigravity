import { PDFDocument } from 'pdf-lib';

/**
 * 拆分 PDF 檔案
 * @param file PDF 檔案
 * @param ranges 頁面範圍陣列，例如 [[1,3], [4,5]] 表示拆成兩個檔案
 * @returns 拆分後的 PDF Blob 陣列
 */
export async function splitPDF(
    file: File,
    ranges: [number, number][]
): Promise<Blob[]> {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer);

    const results: Blob[] = [];

    for (const [start, end] of ranges) {
        const newPdf = await PDFDocument.create();
        const pageIndices = Array.from(
            { length: end - start + 1 },
            (_, i) => start - 1 + i
        );

        const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        results.push(new Blob([pdfBytes], { type: 'application/pdf' }));
    }

    return results;
}

/**
 * 將 PDF 拆分成單頁檔案
 * @param file PDF 檔案
 * @returns 單頁 PDF Blob 陣列
 */
export async function splitPDFToSinglePages(file: File): Promise<Blob[]> {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer);
    const pageCount = sourcePdf.getPageCount();

    const results: Blob[] = [];

    for (let i = 0; i < pageCount; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);
        newPdf.addPage(copiedPage);

        const pdfBytes = await newPdf.save();
        results.push(new Blob([pdfBytes], { type: 'application/pdf' }));
    }

    return results;
}
