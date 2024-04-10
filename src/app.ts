import pm2 from 'pm2'
import io from '@pm2/io'
import { DiscordLogger } from './Discord'
import { Config, Data } from './types'

io.initModule({}, (err: Error) => {
  console.log('Starting up pm2-ban-logger')
  if (err) {
    console.error(err)
    process.exit(1)
  }
  const conf = io.getConfig() as Config

  conf.buffer_seconds =
    conf.buffer_seconds && conf.buffer_seconds > 0 && conf.buffer_seconds < 5
      ? conf.buffer_seconds
      : 1

  const logClient = conf.log_url ? new DiscordLogger(conf.log_url, 'log') : null

  // Start listening on the PM2 BUS
  pm2.launchBus(async (err, bus) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }

    // Listen for process logs
    if (logClient) {
      bus.on('log:out', (data: Data) => {
        logClient.pushToBuffer(data)
      })
    }
    if (logClient) {
      setInterval(
        () => logClient.sendMessages(),
        (conf.buffer_seconds || 1) * 1000
      )
    }
  })
})
