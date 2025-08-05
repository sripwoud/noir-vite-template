import { Err, Ok, Result } from '@hazae41/result'
import * as Comlink from 'comlink'

// Comlink transfer handler for Result types (must match worker)
Comlink.transferHandlers.set('result', {
  // biome-ignore lint/suspicious/noExplicitAny: Using generic type for Result
  canHandle: (obj: any): obj is Result<any, any> => {
    return obj && (obj.constructor.name === 'Ok' || obj.constructor.name === 'Err')
  },
  // biome-ignore lint/suspicious/noExplicitAny: Using generic type for Result
  serialize: (obj: Result<any, any>) => {
    const serialized = obj.isOk()
      ? { type: 'Ok', value: obj.inner }
      : { type: 'Err', error: obj.inner }
    return [serialized, []]
  },
  // biome-ignore lint/suspicious/noExplicitAny: Using generic type for Result
  deserialize: (obj: any) => {
    return obj.type === 'Ok' ? new Ok(obj.value) : new Err(obj.error)
  },
})

export interface CircuitInput {
  age: string
}

export interface ProofResult {
  proof: Uint8Array
  publicInputs: string[]
}

type CircuitWorkerAPI = {
  ping(): Promise<string>
  initialize(): Promise<Result<void, string>>
  generateProof(input: CircuitInput): Promise<Result<ProofResult, string>>
  verifyProof(proof: Uint8Array, publicInputs: string[]): Promise<Result<boolean, string>>
}

export class CircuitClient {
  private worker: Worker
  private api: Comlink.Remote<CircuitWorkerAPI>

  constructor(baseUrl = '') {
    // Use provided base URL (from Vite's import.meta.env.BASE_URL) or default to root
    // This ensures the worker URL works in all environments:
    // - Local dev: baseUrl = '/' → '/worker.js'
    // - GitHub Pages: baseUrl = '/noir-vite-template/' → '/noir-vite-template/worker.js'
    const workerUrl = `${baseUrl}worker.js`
    this.worker = new Worker(workerUrl, { type: 'module' })
    this.api = Comlink.wrap<CircuitWorkerAPI>(this.worker)
  }

  async initialize(): Promise<Result<void, string>> {
    const workerReady = await this.waitForWorkerReady()
    if (workerReady.isErr()) return workerReady

    return await this.api.initialize()
  }

  private async waitForWorkerReady(): Promise<Result<void, string>> {
    const maxRetries = 10
    const initialDelay = 100

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await Result.runAndWrap(async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Ping timeout')), 2000)
        })

        const pingPromise = this.api.ping()
        await Promise.race([pingPromise, timeoutPromise])
      })

      if (result.isOk())
        return result

      if (attempt === maxRetries)
        return new Err('Worker communication failed after retries')

      const delay = initialDelay * 2 ** (attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    return new Err('Worker ready check failed')
  }

  async generateProof(input: CircuitInput): Promise<Result<ProofResult, string>> {
    return await this.api.generateProof(input)
  }

  async verifyProof(
    proof: Uint8Array,
    publicInputs: string[],
  ): Promise<Result<boolean, string>> {
    return await this.api.verifyProof(proof, publicInputs)
  }

  terminate(): void {
    this.worker.terminate()
  }
}
