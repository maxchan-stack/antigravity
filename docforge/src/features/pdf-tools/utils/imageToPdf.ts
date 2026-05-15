import { PDFDocument } from 'pdf-lib';

/**
 * 將圖片轉換為 PDF
 * @param images 圖片檔案陣列
 * @returns PDF Blob
 */
export async function imagesToPDF(images: File[]): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();

    for (const image of images) {
        const arrayBuffer = await image.arrayBuffer();
        let embeddedImage;

        if (image.type === 'image/png') {
            embeddedImage = await pdfDoc.embedPng(arrayBuffer);
        } else if (image.type === 'image/jpeg' || image.type === 'image/jpg') {
            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        } else {
            // 轉換為 JPEG
            const bitmap = await createImageBitmap(image);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(bitmap, 0, 0);

            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
            });

            const jpegBuffer = await blob.arrayBuffer();
            embeddedImage = await pdfDoc.embedJpg(jpegBuffer);
        }

        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        // 計算適合頁面的圖片尺寸
        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;
        const ratio = Math.min(width / imgWidth, height / imgHeight);

        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;

        page.drawImage(embeddedImage, {
            x: (width - scaledWidth) / 2,
            y: (height - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
        });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
}
