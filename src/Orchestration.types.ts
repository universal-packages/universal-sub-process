import { EventEmitterOptions } from '@universal-packages/event-emitter'

import { SubProcess } from './SubProcess'
import { SubProcessEventMap, SubProcessOptions } from './SubProcess.types'

export enum OrchestrationStatus {
  Idle = 'idle',
  Running = 'running',
  Stopping = 'stopping'
}

export interface OrchestrationOptions extends EventEmitterOptions {
  /** Initial process definitions */
  processes?: SubProcessOptions[]
  /** Maximum number of processes to run concurrently */
  maxConcurrency?: number
  /** Whether to stop all processes if one fails (default: false) */
  stopOnFailure?: boolean
}

export interface OrchestrationEventMap {
  'process:added': { subProcess: SubProcess }
  'process:preparing': { subProcess: SubProcess }
  'process:prepared': { subProcess: SubProcess } & SubProcessEventMap['prepared']
  'process:running': { subProcess: SubProcess } & SubProcessEventMap['running']
  'process:releasing': { subProcess: SubProcess } & SubProcessEventMap['releasing']
  'process:released': { subProcess: SubProcess } & SubProcessEventMap['released']
  'process:stopping': { subProcess: SubProcess } & SubProcessEventMap['stopping']
  'process:stopped': { subProcess: SubProcess } & SubProcessEventMap['stopped']
  'process:succeeded': { subProcess: SubProcess } & SubProcessEventMap['succeeded']
  'process:failed': { subProcess: SubProcess } & SubProcessEventMap['failed']
  'process:skipped': { subProcess: SubProcess } & SubProcessEventMap['skipped']
  'process:timed-out': { subProcess: SubProcess } & SubProcessEventMap['timed-out']
  'process:stdout': { subProcess: SubProcess } & SubProcessEventMap['stdout']
  'process:stderr': { subProcess: SubProcess } & SubProcessEventMap['stderr']
  'process:error': { subProcess: SubProcess } & SubProcessEventMap['error']
  'process:message': { subProcess: SubProcess; data: Record<string, any> }
}

export const MESSAGE_WRAPPER_START = '[(*&^%$#@!🎉✨🌌✨ The Cosmic Dance Begins! ✨🌌✨🎉!@#$%%^&*)]'
export const MESSAGE_WRAPPER_END = '[(*&^%$#@!🎊🌈🦄 The Enchanted Journey Concludes! 🦄🌈🎊!@#$%%^&*)]'

export interface MessagePackage {
  type: 'close-communication' | 'message'
  data: Record<string, any>
}
