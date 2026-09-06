export interface OcrResult {
  text: string
  confidence: number
}

export async function recognizeImage(file: File, onProgress?: (progress: number) => void): Promise<OcrResult> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('por', undefined, {
    logger(message) {
      if (message.status === 'recognizing text' && typeof message.progress === 'number') {
        onProgress?.(message.progress)
      }
    },
  })

  try {
    const result = await worker.recognize(file)
    return {
      text: result.data.text || '',
      confidence: Number(result.data.confidence || 0),
    }
  } finally {
    await worker.terminate()
  }
}

export function normalizeReceiptText(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
