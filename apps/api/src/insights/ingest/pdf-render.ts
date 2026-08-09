/**
 * PDF page → PNG rasterization, isolated behind one fail-safe function.
 *
 * Used only by self-healing's cross-check path: to send a break's page to a
 * second (cheap, OpenAI-compatible) model, we need an image — no cheap model
 * accepts raw PDF document blocks the way Claude does. This renders the given
 * pages to base64 PNGs via pdfjs-dist + @napi-rs/canvas.
 *
 * EVERYTHING here is fail-safe: on any error (missing native binary, render
 * bug, OOM) it returns [] and logs. Callers treat empty as "no image, skip the
 * cross-check" — so a rasterization failure can NEVER break the primary
 * Claude extraction/healing path. That isolation is the whole point of this
 * being its own module.
 */

// @napi-rs/canvas ships prebuilt native binaries (no system cairo/pango needed)
// and provides the CanvasRenderingContext2D pdfjs-dist renders into.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'

// pdfjs-dist's legacy Node build is ESM-only (.mjs). On Node 20.x `require()`
// of an ESM module throws; a dynamic import() works on every supported Node
// version (>=20). Cache it so we only load the library once per process.
type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
let pdfjsLibPromise: Promise<PdfjsModule> | null = null
function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsLibPromise) {
    // `Function('return import')` sidesteps TypeScript down-leveling the dynamic
    // import to require() under CommonJS, which would defeat the point.
    pdfjsLibPromise = (
      new Function('return import("pdfjs-dist/legacy/build/pdf.mjs")') as () => Promise<PdfjsModule>
    )()
  }
  return pdfjsLibPromise
}

/**
 * A minimal CanvasFactory so pdfjs-dist can allocate backing canvases without a
 * DOM. pdfjs calls create()/reset() during render and copies pixels into the
 * context we hand it.
 */
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d')
    return { canvas, context }
  }

  reset(_ctx: unknown, width: number, height: number) {
    // @napi-rs canvases can't be resized in place; recreate via create().
    return this.create(width, height)
  }

  destroy() {
    // GC handles the native canvas backing; nothing to release explicitly.
  }
}

/**
 * Render the given 0-based page numbers of a PDF to base64 PNG strings.
 * Returns [] on ANY failure (logged) so callers can skip the cross-check
 * gracefully — never throws.
 *
 * @param pdfBuffer  the full PDF bytes (we render individual pages from it)
 * @param pageNumbers  0-based page indices to render
 * @param scale  render resolution multiplier (2.0 ≈ crisp for OCR; higher = bigger image, more tokens)
 */
export async function renderPagesToPngs(
  pdfBuffer: Buffer,
  pageNumbers: number[],
  scale = 2.0
): Promise<string[]> {
  if (pageNumbers.length === 0) return []
  try {
    // Suppress pdfjs-dist's noisy "Warning: ..." output (font fallbacks etc.)
    // — these are benign for rendering and would pollute the Railway logs.
    const originalEmit = (console as { warn?: (...a: unknown[]) => void }).warn
    ;(console as { warn: (...a: unknown[]) => void }).warn = (..._a: unknown[]) => {}
    const restore = () => {
      if (originalEmit) (console as { warn: (...a: unknown[]) => void }).warn = originalEmit
    }

    // pdfjs-dist's types are stricter than its Node runtime accepts (disableWorker,
    // the render canvasFactory, and destroy() all exist at runtime). Cast to a
    // loose shape so we get the working behaviour without fighting the DOM-oriented types.
    const pdfjsLib = await getPdfjs()
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      // Disable worker thread — in Node we render on the main thread, which is
      // fine for the 1-2 pages a cross-check needs.
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    } as Record<string, unknown>)

    const doc = (await loadingTask.promise) as unknown as {
      numPages: number
      getPage: (n: number) => Promise<{
        getViewport: (o: { scale: number }) => { width: number; height: number }
        render: (p: Record<string, unknown>) => { promise: Promise<void> }
        cleanup: () => void
      }>
      cleanup: () => Promise<void>
    }
    const factory = new NodeCanvasFactory()
    const pngs: string[] = []

    for (const pageNum0 of pageNumbers) {
      const pageNumber = pageNum0 + 1 // pdfjs is 1-based
      if (pageNumber < 1 || pageNumber > doc.numPages) continue
      const page = await doc.getPage(pageNumber)
      const viewport = page.getViewport({ scale })
      const width = Math.ceil(viewport.width)
      const height = Math.ceil(viewport.height)
      const { canvas, context } = factory.create(width, height) as {
        canvas: { toBuffer: (type: string) => Buffer }
        context: unknown
      }
      await page.render({
        canvasContext: context,
        viewport,
        canvasFactory: factory,
      }).promise

      // @napi-rs canvas.toBuffer('image/png') returns the PNG bytes.
      pngs.push((canvas.toBuffer('image/png') as Buffer).toString('base64'))
      page.cleanup()
    }

    await doc.cleanup()
    // destroy() lives on the loadingTask in pdfjs v6, not on the doc.
    await (loadingTask as { destroy: () => Promise<void> }).destroy()
    restore()
    return pngs
  } catch (err) {
    console.log(
      `Cross-check rasterization skipped: ${err instanceof Error ? err.message : 'unknown error'}`
    )
    return []
  }
}

// Keep the import "used" for tooling that flags unused imports; GlobalFonts is
// part of the @napi-rs/canvas surface we depend on being present at runtime.
void GlobalFonts
