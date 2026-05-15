/**
 * 壓縮圖片
 * @param file 圖片檔案
 * @param quality 品質（0-1）
 * @param maxWidth 最大寬度
 * @param maxHeight 最大高度
 * @returns 壓縮後的 Blob
 */
export async function compressImage(
    file: File,
    quality: number = 0.8,
    maxWidth?: number,
    maxHeight?: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // 計算縮放比例
                if (maxWidth && width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                if (maxHeight && height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('壓縮失敗'));
                        }
                    },
                    file.type,
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
