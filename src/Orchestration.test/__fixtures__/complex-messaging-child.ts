import { Orchestration } from '../../Orchestration'

const keepAliveInterval = setInterval(() => {}, 1000)

const processState = {
  messageCount: 0,
  echoMode: false,
  batchMode: false,
  batchBuffer: [] as any[],
  batchSize: 0
}

const unsubscribe = Orchestration.onParentMessage((data) => {
  processState.messageCount++

  // Handle different message types
  switch (data.type) {
    case 'ping':
      Orchestration.sendMessageToParent({
        type: 'pong',
        timestamp: Date.now(),
        processIndex: process.env.PROCESS_INDEX,
        originalData: data
      })
      break

    case 'echo':
      processState.echoMode = true
      Orchestration.sendMessageToParent({
        type: 'echo-enabled',
        processIndex: process.env.PROCESS_INDEX
      })
      break

    case 'echo-data':
      if (processState.echoMode) {
        Orchestration.sendMessageToParent({
          type: 'echoed',
          data: data.payload,
          processIndex: process.env.PROCESS_INDEX
        })
      }
      break

    case 'batch-start':
      processState.batchMode = true
      processState.batchSize = data.size
      processState.batchBuffer = []
      Orchestration.sendMessageToParent({
        type: 'batch-ready',
        processIndex: process.env.PROCESS_INDEX
      })
      break

    case 'batch-data':
      if (processState.batchMode) {
        processState.batchBuffer.push(data.payload)
        if (processState.batchBuffer.length >= processState.batchSize) {
          Orchestration.sendMessageToParent({
            type: 'batch-complete',
            batch: processState.batchBuffer,
            processIndex: process.env.PROCESS_INDEX
          })
          processState.batchBuffer = []
        }
      }
      break

    case 'status':
      Orchestration.sendMessageToParent({
        type: 'status-report',
        messageCount: processState.messageCount,
        echoMode: processState.echoMode,
        batchMode: processState.batchMode,
        batchBufferSize: processState.batchBuffer.length,
        processIndex: process.env.PROCESS_INDEX
      })
      break

    case 'large-data':
      // Handle large data and respond with processed info
      const largeData = data.payload
      Orchestration.sendMessageToParent({
        type: 'large-data-processed',
        originalSize: JSON.stringify(largeData).length,
        processIndex: process.env.PROCESS_INDEX,
        checksum: largeData.checksum
      })
      break

    case 'error-test':
      // Test error handling
      try {
        throw new Error('Test error')
      } catch (error: unknown) {
        Orchestration.sendMessageToParent({
          type: 'error-caught',
          error: (error as Error).message,
          processIndex: process.env.PROCESS_INDEX
        })
      }
      break

    case 'burst-response':
      // Send multiple messages in rapid succession
      for (let i = 0; i < data.count; i++) {
        Orchestration.sendMessageToParent({
          type: 'burst-message',
          index: i,
          processIndex: process.env.PROCESS_INDEX
        })
      }
      break

    case 'stop':
      clearInterval(keepAliveInterval)
      Orchestration.sendMessageToParent({
        type: 'stopping',
        finalMessageCount: processState.messageCount,
        processIndex: process.env.PROCESS_INDEX
      })
      unsubscribe()
      Orchestration.closeCommunicationWithParent()
      break

    default:
      // Unknown message type
      Orchestration.sendMessageToParent({
        type: 'unknown-message',
        receivedType: data.type,
        processIndex: process.env.PROCESS_INDEX
      })
  }
})
