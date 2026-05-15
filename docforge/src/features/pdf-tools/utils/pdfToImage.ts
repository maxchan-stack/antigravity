import * as pdfjsLib from 'pdfjs-dist';

// 設定 worker - 使用本地 worker 檔案
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

/**
 * 將 PDF 轉換為 JPG 圖片
 * @param file PDF 檔案
 * @param quality JPG 品質 (0-1)
 * @param scale 縮放比例
 * @returns JPG Blob 陣列
 */
export async function pdfToImages(
    file: File,
    quality: number = 0.95,
    scale: number = 2
): Promise<Blob[]> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const images: Blob[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            // 建立 canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
                throw new Error('無法建立 canvas 2D context');
            }

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // 渲染頁面到 canvas
            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            // 轉換為 Blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (b) => {
                        if (b) {
                            resolve(b);
                        } else {
                            reject(new Error('Canvas toBlob 失敗'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            });

            images.push(blob);
        }

        return images;
    } catch (error) {
        console.error('PDF 轉圖片失敗:', error);
        throw new Error(`PDF 轉換失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
}
