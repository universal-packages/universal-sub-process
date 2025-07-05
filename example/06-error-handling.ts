import { SubProcess } from '../src/SubProcess'

export async function runErrorHandlingExample() {
  console.log('\n💥 Example 6: Error Handling')
  console.log('-'.repeat(40))

  try {
    // Process with non-zero exit code
    console.log('🔹 Handling non-zero exit codes')
    const exitCodeProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'process.exit(1)'],
      captureStreams: true
    })

    try {
      await exitCodeProcess.run()
      console.log('   This should not be reached')
    } catch (error) {
      console.log(`   ✅ Caught expected error: ${error instanceof Error ? error.message : String(error)}`)
      console.log(`   Exit code: ${exitCodeProcess.exitCode}`)
      console.log(`   Status: ${exitCodeProcess.status}`)
    }

    // Process with stderr output
    console.log('\n🔹 Process with stderr output')
    const stderrProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        `
        console.error('This is an error message');
        console.error('Another error line');
        process.exit(2);
      `
      ],
      captureStreams: true
    })

    try {
      await stderrProcess.run()
    } catch (error) {
      console.log(`   Error caught: ${error instanceof Error ? error.message : String(error)}`)
      console.log(`   Stderr content:`)
      stderrProcess.stderr
        .trim()
        .split('\n')
        .forEach((line) => {
          console.log(`   ${line}`)
        })
      console.log(`   Exit code: ${stderrProcess.exitCode}`)
    }

    // Invalid command
    console.log('\n🔹 Invalid command handling')
    const invalidProcess = new SubProcess({
      command: 'this-command-does-not-exist',
      captureStreams: true
    })

    try {
      await invalidProcess.run()
    } catch (error) {
      console.log(`   ✅ Invalid command error caught: ${error instanceof Error ? error.message : String(error)}`)
      console.log(`   Status: ${invalidProcess.status}`)
    }

    // Process that throws JavaScript error
    console.log('\n🔹 JavaScript runtime error')
    const jsErrorProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        `
        console.log('Starting...');
        throw new Error('Something went wrong in JavaScript!');
      `
      ],
      captureStreams: true
    })

    try {
      await jsErrorProcess.run()
    } catch (error) {
      console.log(`   JS error caught: ${error instanceof Error ? error.message : String(error)}`)
      console.log(`   Exit code: ${jsErrorProcess.exitCode}`)
      console.log(`   Stdout before error: ${jsErrorProcess.stdout.trim()}`)
    }

    // Timeout handling (if timeout is supported)
    console.log('\n🔹 Timeout handling')
    const timeoutProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        `
        console.log('Starting long running process...');
        setTimeout(() => {
          console.log('This should not complete');
        }, 5000);
      `
      ],
      captureStreams: true,
      timeout: 1000 // 1 second timeout
    })

    try {
      await timeoutProcess.run()
    } catch (error) {
      console.log(`   Timeout error: ${error instanceof Error ? error.message : String(error)}`)
      console.log(`   Status: ${timeoutProcess.status}`)
      console.log(`   Stdout before timeout: ${timeoutProcess.stdout.trim()}`)
    }

    // Different exit codes
    console.log('\n🔹 Different exit codes')
    for (const exitCode of [0, 1, 2, 127]) {
      const codeProcess = new SubProcess({
        command: 'node',
        args: ['-e', `console.log('Exiting with code ${exitCode}'); process.exit(${exitCode})`],
        captureStreams: true
      })

      try {
        await codeProcess.run()
        if (exitCode === 0) {
          console.log(`   Exit code ${exitCode}: Success (no error thrown)`)
        }
      } catch (error) {
        console.log(`   Exit code ${exitCode}: Error caught`)
      }
    }

    // Error event monitoring
    console.log('\n🔹 Error event monitoring')
    const errorEventProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'setTimeout(() => process.exit(3), 100)'],
      captureStreams: true
    })

    let errorEventCaught = false
    errorEventProcess.on('error', (event) => {
      errorEventCaught = true
      console.log(`   Error event caught: ${event.payload}`)
    })

    errorEventProcess.on('failed', (event) => {
      console.log(`   Failed event caught with reason: ${event.payload.reason}`)
    })

    try {
      await errorEventProcess.run()
    } catch (error) {
      console.log(`   Process failed as expected`)
      console.log(`   Error event was caught: ${errorEventCaught}`)
    }

    console.log('\n✅ Error handling example completed!')
  } catch (error) {
    console.error('❌ Error in error handling example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
