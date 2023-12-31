import { ExecOptions } from 'child_process'

export type ExecEngineOptions = { encoding: 'buffer' | null } & ExecOptions
