import heic2any from 'heic2any';

/**
 * 轉換圖片格式
 * @param file 原始圖片
 * @param targetFormat 目標格式
 * @param quality 品質（0-1）
 * @returns 轉換後的 Blob
 */
export async function convertImageFormat(
    file: File,
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 0.95
): Promise<Blob> {
    // 處理 HEIC 格式
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
        const convertedBlob = await heic2any({
            blob: file,
            toType: `image/${targetFormat}`,
            quality,
        });

        return Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    }

    // 處理其他格式
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('轉換失敗'));
                        }
                    },
                    `image/${targetFormat}`,
                    quality
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
 * 批次轉換圖片格式
 * @param files 檔案陣列
 * @param targetFormat 目標格式
 * @param quality 品質
 * @param onProgress 進度回調
 * @returns 轉換後的 Blob 陣列
 */
export async function batchConvertImages(
    files: File[],
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 0.95,
    onProgress?: (current: number, total: number) => void
): Promise<Blob[]> {
    const results: Blob[] = [];

    for (let i = 0; i < files.length; i++) {
        const converted = await convertImageFormat(files[i], targetFormat, quality);
        results.push(converted);

        if (onProgress) {
            onProgress(i + 1, files.length);
        }
    }

    return results;
}
