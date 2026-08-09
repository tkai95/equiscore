import { PDFDocument } from 'pdf-lib'

// Splits a large PDF statement into page-range chunks so each chunk's
// transaction count stays well under Claude's 64k output token ceiling
// (~1,000+ transactions). 15 pages ≈ 450–750 transactions per chunk, leaving
// comfortable headroom. Small statements (≤ CHUNK_PAGES) produce a single
// chunk and behave identically to the pre-chunking path.

const CHUNK_PAGES = 15

export interface PdfChunk {
  /** Base64-encoded sub-PDF for this page range. */
  base64: string
  /** 0-based start page index (inclusive). */
  startPage: number
  /** 0-based end page index (exclusive). */
  endPage: number
}

/**
 * Split a PDF buffer into chunks of ~CHUNK_PAGES pages each. Returns the total
 * page count and an array of base64 sub-PDFs. If the document fits in one
 * chunk, returns exactly one chunk containing the whole document.
 */
export async function splitPdfIntoChunks(pdfBuffer: Buffer): Promise<{
  pageCount: number
  chunks: PdfChunk[]
}> {
  const sourceDoc = await PDFDocument.load(pdfBuffer)
  const pageCount = sourceDoc.getPageCount()

  // Small enough to send as-is — no splitting needed.
  if (pageCount <= CHUNK_PAGES) {
    return {
      pageCount,
      chunks: [{ base64: pdfBuffer.toString('base64'), startPage: 0, endPage: pageCount }],
    }
  }

  const chunks: PdfChunk[] = []
  for (let start = 0; start < pageCount; start += CHUNK_PAGES) {
    const end = Math.min(start + CHUNK_PAGES, pageCount)

    const subDoc = await PDFDocument.create()
    const copiedPages = await subDoc.copyPages(sourceDoc, range(start, end))
    copiedPages.forEach((page) => subDoc.addPage(page))

    const subBytes = await subDoc.save()
    chunks.push({ base64: Buffer.from(subBytes).toString('base64'), startPage: start, endPage: end })
  }

  return { pageCount, chunks }
}

/** Generate an array of page indices [start, start+1, ..., end-1]. */
function range(start: number, end: number): number[] {
  const indices: number[] = []
  for (let i = start; i < end; i++) indices.push(i)
  return indices
}
