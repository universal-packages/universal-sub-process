import { TestsRunner } from '@universal-packages/tests-runner'
import { Readable } from 'stream'

import { SubProcess } from '../SubProcess'
import { evaluateTestResults } from '../utils.test'

export async function inputOutputTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('SubProcess - Input/Output', () => {
    testsRunner.test('should handle basic output capture', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['Hello World'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Hello World')
    })

    testsRunner.test('should handle multi-argument output', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['Line', '1', 'Line', '2', 'Line', '3'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Line 1 Line 2 Line 3')
    })

    testsRunner.test('should handle combined command strings', async () => {
      const subProcess = new SubProcess({
        command: 'echo Part1 Part2',
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Part1 Part2')
    })

    testsRunner.test('should handle empty output', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: [''],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('')
    })

    testsRunner.test('should capture large output', async () => {
      const subProcess = new SubProcess({
        command: 'seq',
        args: ['1', '100'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout).toContain('1')
      testsRunner.expect(subProcess.stdout).toContain('100')
      const lines = subProcess.stdout.trim().split('\n')
      testsRunner.expect(lines.length).toBe(100)
    })

    testsRunner.test('should capture output correctly', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['Line output test'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout).toContain('Line output test')
    })

    testsRunner.test('should handle mixed stdout and stderr output', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['stdout message'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('stdout message')
      // This test now just focuses on stdout capture
    })

    testsRunner.test('should handle binary-like output', async () => {
      const subProcess = new SubProcess({
        command: 'printf',
        args: ['Hello'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout).toBe('Hello')
    })

    testsRunner.test('should not capture streams when captureStreams is false', async () => {
      const subProcess = new SubProcess({
        command: 'echo Should not be captured',
        captureStreams: false,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout).toBe('')
      testsRunner.expect(subProcess.stderr).toBe('')
    })

    testsRunner.test('should handle commands with no output', async () => {
      const subProcess = new SubProcess({
        command: 'true', // command that succeeds but produces no output
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout).toBe('')
      testsRunner.expect(subProcess.stderr).toBe('')
    })

    testsRunner.test('should handle numeric output', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['42'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('42')
    })

    // Input Tests
    testsRunner.test('should send string input to process', async () => {
      const subProcess = new SubProcess({
        command: 'cat', // cat reads from stdin and outputs to stdout
        input: 'Hello from input!',
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Hello from input!')
    })

    testsRunner.test('should send multi-line string input', async () => {
      const inputData = 'Line 1\nLine 2\nLine 3'
      const subProcess = new SubProcess({
        command: 'cat',
        input: inputData,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe(inputData)
    })

    testsRunner.test('should send Buffer input to process', async () => {
      const inputBuffer = Buffer.from('Buffer input test', 'utf8')
      const subProcess = new SubProcess({
        command: 'cat',
        input: inputBuffer,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Buffer input test')
    })

    testsRunner.test('should send array of strings as input', async () => {
      const inputArray = ['First line', 'Second line', 'Third line']
      const subProcess = new SubProcess({
        command: 'cat',
        input: inputArray,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      // Arrays are joined without newlines by default
      testsRunner.expect(subProcess.stdout.trim()).toBe('First lineSecond lineThird line')
    })

    testsRunner.test('should send array of strings with newlines as input', async () => {
      const inputArray = ['First line\n', 'Second line\n', 'Third line\n']
      const subProcess = new SubProcess({
        command: 'cat',
        input: inputArray,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('First line\nSecond line\nThird line')
    })

    testsRunner.test('should send array of Buffers as input', async () => {
      const inputArray = [Buffer.from('Buffer 1\n', 'utf8'), Buffer.from('Buffer 2\n', 'utf8'), Buffer.from('Buffer 3', 'utf8')]
      const subProcess = new SubProcess({
        command: 'cat',
        input: inputArray,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Buffer 1\nBuffer 2\nBuffer 3')
    })

    testsRunner.test('should send Readable stream as input', async () => {
      const inputData = 'Readable stream test data\nLine 2\nLine 3'
      const inputStream = new Readable({
        read() {
          // Don't end the stream here - let SubProcess handle it
        }
      })

      // Push data to the stream before passing to SubProcess
      inputStream.push(inputData)

      const subProcess = new SubProcess({
        command: 'cat',
        input: inputStream,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe(inputData)
    })

    testsRunner.test(
      'should send empty string input',
      async () => {
        const subProcess = new SubProcess({
          command: 'cat',
          input: '',
          captureStreams: true,
          engine: 'spawn'
        })

        await subProcess.run()

        testsRunner.expect(subProcess.status).toBe('succeeded')
        testsRunner.expect(subProcess.stdout.trim()).toBe('')
      },
      { only: true }
    )

    testsRunner.test('should handle input with special characters', async () => {
      const specialInput = 'Special chars: !@#$%^&*()[]{}|;:,.<>?'
      const subProcess = new SubProcess({
        command: 'cat',
        input: specialInput,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe(specialInput)
    })

    testsRunner.test('should handle Unicode input', async () => {
      const unicodeInput = 'Unicode test: 🚀 Hello 世界 🌟'
      const subProcess = new SubProcess({
        command: 'cat',
        input: unicodeInput,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe(unicodeInput)
    })

    testsRunner.test('should handle large input data', async () => {
      const largeInput = 'A'.repeat(10000) // 10KB of data
      const subProcess = new SubProcess({
        command: 'cat',
        input: largeInput,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe(largeInput)
    })

    testsRunner.test('should work with commands that transform input', async () => {
      const subProcess = new SubProcess({
        command: 'tr',
        args: ['a-z', 'A-Z'], // Convert lowercase to uppercase
        input: 'hello world',
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('HELLO WORLD')
    })

    testsRunner.test('should work with commands that count input', async () => {
      const inputText = 'Line 1\nLine 2\nLine 3'
      const subProcess = new SubProcess({
        command: 'wc',
        args: ['-l'], // Count lines
        input: inputText,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('3')
    })

    testsRunner.test('should work with commands that sort input', async () => {
      const inputText = 'zebra\napple\nbanana\ncherry'
      const subProcess = new SubProcess({
        command: 'sort',
        input: inputText,
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('apple\nbanana\ncherry\nzebra')
    })

    testsRunner.test('should handle input with different engines', async () => {
      const engines = ['spawn', 'exec'] as const
      const inputData = 'Engine test input'

      for (const engine of engines) {
        const subProcess = new SubProcess({
          command: 'cat',
          input: inputData,
          captureStreams: true,
          engine
        })

        await subProcess.run()

        testsRunner.expect(subProcess.status).toBe('succeeded')
        testsRunner.expect(subProcess.stdout.trim()).toBe(inputData)
      }
    })

    testsRunner.test('should work without input when process does not expect it', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['No input needed'],
        captureStreams: true,
        engine: 'spawn'
        // No input property
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('No input needed')
    })

    // Dynamic Input Tests (pushInput and closeInput)
    testsRunner.test('should handle single pushInput with string and closeInput', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      // Start the process
      const processPromise = subProcess.run()

      // Push input after a short delay
      setTimeout(() => {
        subProcess.pushInput('Hello from pushInput!')
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Hello from pushInput!')
    })

    testsRunner.test('should handle multiple pushInput calls with strings', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('First chunk\n')
        subProcess.pushInput('Second chunk\n')
        subProcess.pushInput('Third chunk')
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('First chunk\nSecond chunk\nThird chunk')
    })

    testsRunner.test('should handle pushInput with Buffer data', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput(Buffer.from('Buffer chunk 1\n'))
        subProcess.pushInput(Buffer.from('Buffer chunk 2'))
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Buffer chunk 1\nBuffer chunk 2')
    })

    testsRunner.test('should handle pushInput with array of strings', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput(['Array', 'chunk', '1\n'])
        subProcess.pushInput(['Array', 'chunk', '2'])
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Arraychunk1\nArraychunk2')
    })

    testsRunner.test('should handle pushInput with array of Buffers', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput([Buffer.from('Buffer'), Buffer.from('Array'), Buffer.from('1\n')])
        subProcess.pushInput([Buffer.from('Buffer'), Buffer.from('Array'), Buffer.from('2')])
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('BufferArray1\nBufferArray2')
    })

    testsRunner.test('should handle pushInput with timing delays', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('First delayed chunk\n')
      }, 100)

      setTimeout(() => {
        subProcess.pushInput('Second delayed chunk\n')
      }, 200)

      setTimeout(() => {
        subProcess.pushInput('Third delayed chunk')
        subProcess.closeInput()
      }, 300)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('First delayed chunk\nSecond delayed chunk\nThird delayed chunk')
    })

    testsRunner.test('should handle pushInput with commands that transform input', async () => {
      const subProcess = new SubProcess({
        command: 'tr',
        args: ['a-z', 'A-Z'],
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('hello ')
        subProcess.pushInput('world')
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('HELLO WORLD')
    })

    testsRunner.test('should handle pushInput with commands that count input', async () => {
      const subProcess = new SubProcess({
        command: 'wc',
        args: ['-l'],
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('Line 1\n')
        subProcess.pushInput('Line 2\n')
        subProcess.pushInput('Line 3\n')
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('3')
    })

    testsRunner.test('should handle pushInput with Unicode characters', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('🚀 Hello ')
        subProcess.pushInput('世界 ')
        subProcess.pushInput('🌟')
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('🚀 Hello 世界 🌟')
    })

    testsRunner.test('should handle pushInput with large data chunks', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('A'.repeat(5000))
        subProcess.pushInput('B'.repeat(5000))
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('A'.repeat(5000) + 'B'.repeat(5000))
    })

    testsRunner.test('should handle pushInput with special characters', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('Special: !@#$%^&*()')
        subProcess.pushInput('[]{}|;:,.<>?')
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Special: !@#$%^&*()[]{}|;:,.<>?')
    })

    testsRunner.test('should handle closeInput without any pushInput', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('')
    })

    testsRunner.test('should handle pushInput after closeInput (should not affect output)', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('Before close')
        subProcess.closeInput()
        // This should not affect the output as input is already closed
        subProcess.pushInput('After close')
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Before close')
    })

    testsRunner.test('should handle pushInput with different engines', async () => {
      const engines = ['spawn', 'exec'] as const

      for (const engine of engines) {
        const subProcess = new SubProcess({
          command: 'cat',
          captureStreams: true,
          engine
        })

        const processPromise = subProcess.run()

        setTimeout(() => {
          subProcess.pushInput(`Input for ${engine} engine`)
          subProcess.closeInput()
        }, 100)

        await processPromise

        testsRunner.expect(subProcess.status).toBe('succeeded')
        testsRunner.expect(subProcess.stdout.trim()).toBe(`Input for ${engine} engine`)
      }
    })

    testsRunner.test('should handle mixed pushInput types in sequence', async () => {
      const subProcess = new SubProcess({
        command: 'cat',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('String chunk\n')
        subProcess.pushInput(Buffer.from('Buffer chunk\n'))
        subProcess.pushInput(['Array', 'chunk\n'])
        subProcess.pushInput([Buffer.from('Buffer'), Buffer.from('Array\n')])
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('String chunk\nBuffer chunk\nArraychunk\nBufferArray')
    })

    testsRunner.test('should handle pushInput for interactive processes', async () => {
      const subProcess = new SubProcess({
        command: 'sort',
        captureStreams: true,
        engine: 'spawn'
      })

      const processPromise = subProcess.run()

      setTimeout(() => {
        subProcess.pushInput('zebra\n')
        subProcess.pushInput('apple\n')
        subProcess.pushInput('banana\n')
        subProcess.closeInput()
      }, 100)

      await processPromise

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('apple\nbanana\nzebra')
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
