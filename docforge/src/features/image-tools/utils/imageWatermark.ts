/**
 * 為圖片添加浮水印
 * @param file 圖片檔案
 * @param watermarkText 浮水印文字
 * @param options 選項
 * @returns 添加浮水印後的 Blob
 */
export async function addWatermark(
    file: File,
    watermarkText: string,
    options: {
        position?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
        fontSize?: number;
        opacity?: number;
        color?: string;
    } = {}
): Promise<Blob> {
    const {
        position = 'bottom-right',
        fontSize = 24,
        opacity = 0.5,
        color = '#FFFFFF',
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d')!;

                // 繪製原圖
                ctx.drawImage(img, 0, 0);

                // 設定浮水印樣式
                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = color;
                ctx.globalAlpha = opacity;

                // 計算文字尺寸
                const textMetrics = ctx.measureText(watermarkText);
                const textWidth = textMetrics.width;
                const textHeight = fontSize;

                // 計算位置
                let x = 0;
                let y = 0;
                const padding = 20;

                switch (position) {
                    case 'center':
                        x = (canvas.width - textWidth) / 2;
                        y = (canvas.height + textHeight) / 2;
                        break;
                    case 'bottom-right':
                        x = canvas.width - textWidth - padding;
                        y = canvas.height - padding;
                        break;
                    case 'bottom-left':
                        x = padding;
                        y = canvas.height - padding;
                        break;
                    case 'top-right':
                        x = canvas.width - textWidth - padding;
                        y = textHeight + padding;
                        break;
                    case 'top-left':
                        x = padding;
                        y = textHeight + padding;
                        break;
                }

                // 繪製浮水印
                ctx.fillText(watermarkText, x, y);

                // 重置透明度
                ctx.globalAlpha = 1.0;

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('添加浮水印失敗'));
                        }
                    },
                    file.type,
                    0.95
                );
            };

            img.onerror = () => reject(new Error('圖片載入失敗'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('檔案讀取失敗'));
        reader.readAsDataURL(file);
    });
}

/**
 * 批次添加浮水印
 * @param files 檔案陣列
 * @param watermarkText 浮水印文字
 * @param options 選項
 * @param onProgress 進度回調
 * @returns 處理後的 Blob 陣列
 */
export async function batchAddWatermark(
    files: File[],
    watermarkText: string,
    options: Parameters<typeof addWatermark>[2] = {},
    onProgress?: (current: number, total: number) => void
): Promise<Blob[]> {
    const results: Blob[] = [];

    for (let i = 0; i < files.length; i++) {
        const processed = await addWatermark(files[i], watermarkText, options);
        results.push(processed);

        if (onProgress) {
            onProgress(i + 1, files.length);
        }
    }

    return results;
}
