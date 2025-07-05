import { SubProcess } from '../src/SubProcess'

export async function runComplexInputsExample() {
  console.log('\n⌨️  Example 9: Complex Inputs')
  console.log('-'.repeat(40))

  try {
    console.log('🔹 Providing string input with readline')
    const process = new SubProcess({
      command: './example/scripts/readline.js'
    })

    process.on('stdout', (event) => {
      console.log(event.payload.data)
    })

    process.on('stderr', (event) => {
      console.log(event.payload.data)
    })

    setTimeout(() => {
      process.pushInput('David\n')
    }, 1000)

    setTimeout(() => {
      process.pushInput('Blue\n')
      process.closeInput()
    }, 2000)

    await process.run()

    console.log('\n✅ Complex inputs example completed!')
  } catch (error) {
    console.error('❌ Error in complex inputs example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
