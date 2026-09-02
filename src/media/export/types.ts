import type { ExportEngine } from './plan'

export type { ExportEngine }

export type ExportStage = 'preparing' | 'encoding' | 'finishing'

export interface ExportProgress {
  engine: ExportEngine
  stage: ExportStage
  /** 0 to 1, or null while the engine cannot tell. */
  ratio: number | null
  /** Seconds of the source that are done, or null when unknown. */
  processedSeconds: number | null
}

export class ExportCancelled extends Error {
  constructor() {
    super('Export cancelled.')
    this.name = 'ExportCancelled'
  }
}

export interface ExportHandle {
  result: Promise<Blob>
  cancel(): void
}
