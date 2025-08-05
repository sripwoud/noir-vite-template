import { UltraHonkBackend } from '@aztec/bb.js'
import { None, type Option, Some } from '@hazae41/option'
import { Err, Ok, Result } from '@hazae41/result'
import type { CompiledCircuit } from '@noir-lang/noir_js'
import { Noir } from '@noir-lang/noir_js'
import * as Comlink from 'comlink'
import circuitData from '../target/circuit.json'
import type { CircuitInput, ProofResult } from './index.js'

// Comlink transfer handler for Result types
Comlink.transferHandlers.set('result', {
  // biome-ignore lint/suspicious/noExplicitAny: Using generic type for Result
  canHandle: (obj: any): obj is Result<any, any> => {
    return (obj?.constructor.name === 'Ok' || obj?.constructor.name === 'Err')
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

class CircuitWorker {
  private noir: Option<Noir> = new None()
  private initialized = false

  async ping(): Promise<string> {
    return 'pong'
  }

  async initialize(): Promise<Result<void, string>> {
    if (this.initialized) return new Ok(undefined)

    return Result
      .runAndWrapSync(() => {
        this.noir = new Some(new Noir(circuitData as CompiledCircuit))
        this.initialized = true
      })
      .mapErr(error => `Circuit initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  async generateProof(input: CircuitInput): Promise<Result<ProofResult, string>> {
    if (!this.initialized)
      return new Err('Circuit not initialized. Call initialize() first.')

    return await this.noir.mapOrElse(
      async () => new Err('Circuit not initialized. Call initialize() first.'),
      async (noir) => {
        const result = await Result.runAndWrap(async () => {
          const inputMap: { [key: string]: string } = {
            age: input.age,
          }

          const { witness } = await noir.execute(inputMap)
          const backend = new UltraHonkBackend(
            (circuitData as CompiledCircuit).bytecode,
          )
          const proofResult = await backend.generateProof(witness)

          return {
            proof: proofResult.proof,
            publicInputs: [],
          }
        })

        return result.mapErr(error =>
          `Proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      },
    )
  }

  async verifyProof(
    proof: Uint8Array,
    publicInputs: string[],
  ): Promise<Result<boolean, string>> {
    if (!this.initialized)
      return new Err('Circuit not initialized. Call initialize() first.')

    return await this.noir.mapOrElse(
      async () => new Err('Circuit not initialized. Call initialize() first.'),
      async () => {
        const result = await Result.runAndWrap(async () => {
          const backend = new UltraHonkBackend(
            (circuitData as CompiledCircuit).bytecode,
          )
          const proofObject = { proof, publicInputs }
          return await backend.verifyProof(proofObject)
        })

        return result.mapErr(error =>
          `Proof verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      },
    )
  }
}

const worker = new CircuitWorker()
Comlink.expose(worker)
