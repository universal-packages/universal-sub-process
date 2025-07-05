import { Orchestration } from '../../Orchestration'

const keepAliveInterval = setInterval(() => {}, 1000)

Orchestration.onParentMessage((data) => {
  switch (data.type) {
    case 'delayed-ping':
      const delay = data.delay
      setTimeout(() => {
        Orchestration.sendMessageToParent({
          type: 'delayed-pong',
          delay: delay,
          processIndex: process.env.PROCESS_INDEX,
          timestamp: Date.now()
        })
      }, delay)
      break

    case 'sequence-start':
      const count = data.count
      const interval = data.interval

      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          Orchestration.sendMessageToParent({
            type: 'sequence-item',
            index: i,
            total: count,
            processIndex: process.env.PROCESS_INDEX
          })
        }, i * interval)
      }
      break

    case 'stop':
      clearInterval(keepAliveInterval)
      Orchestration.sendMessageToParent({
        type: 'stopping',
        processIndex: process.env.PROCESS_INDEX
      })
      Orchestration.closeCommunicationWithParent()
      break
  }
})
