import { DiffResult, TestError, TestsRunner } from '@universal-packages/tests-runner'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m', // for removed/different expected
  green: '\x1b[32m', // for added/different actual
  yellow: '\x1b[33m', // for warnings/circular refs
  blue: '\x1b[34m', // for property names
  gray: '\x1b[90m', // for same values
  bold: '\x1b[1m',
  dim: '\x1b[2m'
}

export function printDiff(diff: DiffResult, indent: number = 0): string {
  const spaces = '  '.repeat(indent)

  switch (diff.type) {
    case 'same':
      return `${spaces}${colors.gray}${formatValue(diff.value)}${colors.reset}`

    case 'different':
      return `${spaces}${colors.red}- ${formatValue(diff.expected)}${colors.reset}\n` + `${spaces}${colors.green}+ ${formatValue(diff.actual)}${colors.reset}`

    case 'added':
      return `${spaces}${colors.green}+ ${formatValue(diff.value)}${colors.reset}`

    case 'removed':
      return `${spaces}${colors.red}- ${formatValue(diff.value)}${colors.reset}`

    case 'array':
      if (diff.same) {
        return `${spaces}${colors.gray}[...] (${diff.items.length} items, all same)${colors.reset}`
      }

      let arrayOutput = `${spaces}[\n`
      diff.items.forEach((item, index) => {
        if (item.type === 'object' || item.type === 'array') {
          // Complex types: put opening brace on same line as index
          const itemOutput = printDiff(item, indent + 1)
          const firstLine = itemOutput.split('\n')[0]
          const restLines = itemOutput.split('\n').slice(1).join('\n')
          arrayOutput += `${spaces}  ${colors.blue}[${index}]${colors.reset} ${firstLine.trim()}\n`
          if (restLines) {
            arrayOutput += restLines + '\n'
          }
        } else {
          // Simple types stay on the same line as the index
          arrayOutput += `${spaces}  ${colors.blue}[${index}]${colors.reset} `
          const itemOutput = printDiff(item, 0).trim()
          arrayOutput += itemOutput + '\n'
        }
      })
      arrayOutput += `${spaces}]`
      return arrayOutput

    case 'object':
      if (diff.same) {
        const keyCount = Object.keys(diff.keys).length
        return `${spaces}${colors.gray}{...} (${keyCount} properties, all same)${colors.reset}`
      }

      let objectOutput = `${spaces}{\n`
      Object.entries(diff.keys).forEach(([key, keyDiff]) => {
        if (keyDiff.type === 'object' || keyDiff.type === 'array') {
          // Complex types: put opening brace on same line as key
          const keyOutput = printDiff(keyDiff, indent + 1)
          const firstLine = keyOutput.split('\n')[0]
          const restLines = keyOutput.split('\n').slice(1).join('\n')
          objectOutput += `${spaces}  ${colors.blue}${key}:${colors.reset} ${firstLine.trim()}\n`
          if (restLines) {
            objectOutput += restLines + '\n'
          }
        } else {
          // Simple types stay on the same line as the key
          objectOutput += `${spaces}  ${colors.blue}${key}:${colors.reset} `
          const keyOutput = printDiff(keyDiff, 0).trim()
          objectOutput += keyOutput + '\n'
        }
      })
      objectOutput += `${spaces}}`
      return objectOutput

    case 'circular':
      return `${spaces}${colors.yellow}[Circular reference to: ${diff.path}]${colors.reset}`

    default:
      return `${spaces}${colors.red}[Unknown diff type]${colors.reset}`
  }
}

function formatValue(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'function') return '[Function]'
  if (typeof value === 'symbol') return String(value)
  if (value instanceof Date) return `Date(${value.toISOString()})`
  if (value instanceof RegExp) return String(value)
  if (Array.isArray(value)) return `Array(${value.length})`
  if (typeof value === 'object') return `Object(${Object.keys(value).length} keys)`
  return String(value)
}

// Helper function to print diff with a header
export function printDiffWithHeader(diff: DiffResult, expectedLabel: string = 'Expected', actualLabel: string = 'Actual'): string {
  let output = `${colors.bold}Diff Results:${colors.reset}\n`
  output += `${colors.dim}${'='.repeat(50)}${colors.reset}\n`
  output += printDiff(diff)
  output += `\n${colors.dim}${'='.repeat(50)}${colors.reset}`
  return output
}

// Helper function to get a summary of differences
export function getDiffSummary(diff: DiffResult): string {
  if (diff.same) {
    return `${colors.green}✓ Values are identical${colors.reset}`
  }

  const changes = countChanges(diff)
  const parts: string[] = []

  if (changes.added > 0) parts.push(`${colors.green}${changes.added} added${colors.reset}`)
  if (changes.removed > 0) parts.push(`${colors.red}${changes.removed} removed${colors.reset}`)
  if (changes.different > 0) parts.push(`${colors.yellow}${changes.different} changed${colors.reset}`)
  if (changes.circular > 0) parts.push(`${colors.yellow}${changes.circular} circular${colors.reset}`)

  return `${colors.bold}Summary:${colors.reset} ${parts.join(', ')}`
}

function countChanges(diff: DiffResult): { added: number; removed: number; different: number; circular: number } {
  const counts = { added: 0, removed: 0, different: 0, circular: 0 }

  switch (diff.type) {
    case 'added':
      counts.added++
      break
    case 'removed':
      counts.removed++
      break
    case 'different':
      counts.different++
      break
    case 'circular':
      counts.circular++
      break
    case 'array':
      diff.items.forEach((item) => {
        const itemCounts = countChanges(item)
        counts.added += itemCounts.added
        counts.removed += itemCounts.removed
        counts.different += itemCounts.different
        counts.circular += itemCounts.circular
      })
      break
    case 'object':
      Object.values(diff.keys).forEach((keyDiff) => {
        const keyCounts = countChanges(keyDiff)
        counts.added += keyCounts.added
        counts.removed += keyCounts.removed
        counts.different += keyCounts.different
        counts.circular += keyCounts.circular
      })
      break
  }

  return counts
}

// Helper function to evaluate and report test results
export function evaluateTestResults(selfTestsRunner: TestsRunner): void {
  if (selfTestsRunner.isSucceeded) {
    console.log(`✅ ${selfTestsRunner.state.tests[0].spec[0]} | ${selfTestsRunner.measurement?.toString()}`)
  } else {
    console.log('='.repeat(process.stdout.columns))
    for (const test of selfTestsRunner.state.tests) {
      if (test.status !== 'succeeded') {
        console.log(`❌ ${test.spec.join(' > ')}`)
        const failureReason = test.failureReason as TestError
        const error = test.error as Error

        if (failureReason) {
          const messageLocalsKeys = failureReason.messageLocals ? Object.keys(failureReason.messageLocals) : []
          let finalMessage = failureReason.message
          if (messageLocalsKeys.length > 0) {
            finalMessage = finalMessage.replace(/{(\w+)}/g, (match, key) => failureReason.messageLocals[key] || match)
          }
          console.log(finalMessage)
          if (failureReason.difference) {
            console.log(printDiff(failureReason.difference))
          }
          if (failureReason.differences) {
            for (const difference of failureReason.differences) {
              console.log(printDiff(difference))
            }
          }

          // Print stack trace line if available
          if (failureReason.stack) {
            const stackLines = failureReason.stack.split('\n').filter((line) => line.trim().startsWith('at'))
            const execLine = stackLines[1]

            // Extract and format the path dynamically
            if (execLine) {
              const pathMatch = execLine.match(/\((.*?):(\d+):(\d+)\)/)
              if (pathMatch) {
                const fullPath = pathMatch[1]
                const lineNum = pathMatch[2]
                const colNum = pathMatch[3]

                // Find the project root by looking for the package name in the path
                const packageIndex = fullPath.indexOf('universal-tests-runner')
                const relativePath = packageIndex !== -1 ? fullPath.substring(packageIndex + 'universal-tests-runner/'.length) : fullPath

                // Extract filename and directory
                const lastSlashIndex = relativePath.lastIndexOf('/')
                const filename = lastSlashIndex !== -1 ? relativePath.substring(lastSlashIndex + 1) : relativePath
                const directory = lastSlashIndex !== -1 ? relativePath.substring(0, lastSlashIndex + 1) : ''

                // Format with red filename
                const formattedPath = `at ${directory}\x1b[31m${filename}\x1b[0m:${lineNum}:${colNum}`
                console.log(formattedPath)
              } else {
                console.log(execLine)
              }
            }
          }
        }
        if (error) {
          console.error(error)
        }
      }
    }
    console.log('='.repeat(process.stdout.columns))
    process.exit(1)
  }
}
