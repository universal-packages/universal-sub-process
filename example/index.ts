import { runBasicCommandsExample } from './01-basic-commands'
import { runStreamCaptureExample } from './02-stream-capture'
import { runEnvironmentExample } from './03-environment-variables'
import { runProcessInputExample } from './04-process-input'
import { runEventsExample } from './05-events'
import { runErrorHandlingExample } from './06-error-handling'
import { runDifferentEnginesExample } from './07-different-engines'
import { runAdvancedUsageExample } from './08-advanced-usage'
import { runComplexInputsExample } from './09-complex-inputs'

async function runAllExamples() {
  console.log('\n' + '='.repeat(60))
  console.log('🔄 Universal Sub Process - Examples Showcase')
  console.log('='.repeat(60))

  try {
    // Example 1: Basic Commands (simple command execution)
    await runBasicCommandsExample()
    await delay(1000)

    // Example 2: Stream Capture (stdout/stderr capture)
    await runStreamCaptureExample()
    await delay(1000)

    // Example 3: Environment Variables
    await runEnvironmentExample()
    await delay(1000)

    // Example 4: Process Input (stdin)
    await runProcessInputExample()
    await delay(1000)

    // Example 5: Events (monitoring process events)
    await runEventsExample()
    await delay(1000)

    // Example 6: Error Handling
    await runErrorHandlingExample()
    await delay(1000)

    // Example 7: Different Engines (spawn, exec, fork)
    await runDifferentEnginesExample()
    await delay(1000)

    // Example 8: Advanced Usage (working directory, signals, etc.)
    await runAdvancedUsageExample()
    await delay(1000)

    // Example 9: Complex Inputs
    await runComplexInputsExample()

    console.log('\n' + '='.repeat(60))
    console.log('🎉 All examples completed successfully!')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('\n💥 Error running examples:', error)
    console.log('='.repeat(60))
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

runAllExamples()
