import pm2 from 'pm2'
import io from '@pm2/io'

import { LiveBans } from './LiveBans'
import { Stats } from './Stats'
import { Config, Data } from './types'

io.initModule({}, (err: Error) => {
  console.log('Starting up pm2-ban-logger')
  if (err) {
    console.error(err)
    process.exit(1)
  }
  const conf = io.getConfig() as Config

  conf.buffer_seconds =
    conf.buffer_seconds && conf.buffer_seconds > 0 ? conf.buffer_seconds : 1
  conf.stats_minutes =
    conf.stats_minutes && conf.stats_minutes > 0 ? conf.stats_minutes : 15

  const logClient = conf.log_url ? new LiveBans(conf.log_url) : null
  const summaryClient = conf.stats_url ? new Stats(conf.stats_url) : null

  // Start listening on the PM2 BUS
  pm2.launchBus(async (err, bus) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }

    // Listen for process logs
    if (logClient) {
      bus.on('log:out', (data: Data) => {
        const accountInfo = logClient.pushToBuffer(data)
        if (accountInfo && summaryClient) {
          summaryClient.pushToStats(accountInfo)
        }
      })
    }
    if (logClient) {
      setInterval(
        () => logClient.sendMessages(),
        (conf.buffer_seconds || 1) * 1000
      )
    }
    if (summaryClient) {
      setInterval(
        () => {
          summaryClient.sendMessages()
        },
        (conf.stats_minutes || 15) * 1000 * 60
      )
    }
  })
})
