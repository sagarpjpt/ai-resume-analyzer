export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    try {
        // Ensure this only runs in the browser (avoid SSR crash)
        if (typeof window === "undefined") {
            return { file: null, imageUrl: "", error: "PDF conversion only works in browser" };
        }

        // Dynamically import pdf.js ONLY on client-side
        const pdfjsLib = await import("pdfjs-dist/build/pdf");
        const workerSrc = await import("pdfjs-dist/build/pdf.worker.mjs?url");

        // Register the worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        // Load PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Get first page
        const page = await pdf.getPage(1);

        // Render settings (scale 2 is best balance)
        const viewport = page.getViewport({ scale: 2 });

        // Create canvas for rendering
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render PDF page into canvas
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert canvas → PNG blob
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve({
                        file: null,
                        imageUrl: "",
                        error: "Failed to create image blob",
                    });
                    return;
                }

                // Convert blob → File
                const imageFile = new File(
                    [blob],
                    file.name.replace(/\.pdf$/i, "") + ".png",
                    { type: "image/png" }
                );

                resolve({
                    file: imageFile,
                    imageUrl: URL.createObjectURL(blob),
                });
            }, "image/png");
        });
    } catch (err) {
        return {
            file: null,
            imageUrl: "",
            error: String(err),
        };
    }
}
