import { WebhookClient, APIEmbed } from 'discord.js'
import stripAnsi from 'strip-ansi'
import { ObliviousSet } from 'oblivious-set'

import { Data, LogInfo, Message } from './types'

export class LiveBans extends WebhookClient {
  messages: Record<string, Data[]>
  buffer: Message[]
  color: number

  private cache: ObliviousSet<string> = new ObliviousSet(30_000)
  private bannedAccountRegex = /Account (\S+) marked as banned/
  private activityTimeRegex =
    /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[.*\] User (\S+) .*Active Time (\d+\.\d+)/

  constructor(url: string) {
    super({ url })
    this.messages = {}
    this.buffer = []
    this.color = 0x00ff00

    console.log(`pm2-ban-logger: live ban log client created`)
  }

  static getTitle(data: Data) {
    return `${data.process.name}${
      data.process?.version && data.process.version !== 'N/A'
        ? ` v${data.process.version}`
        : ''
    }${data.event ? ` - ${data.event}` : ''}`
  }

  static ensureString(data: string | object) {
    return typeof data === 'string' ? data : JSON.stringify(data)
  }

  getEmbeds(): APIEmbed[] {
    return Object.entries(this.messages).flatMap(([name, [data]]) => {
      const safeDesc = LiveBans.ensureString(data.data) || ''
      const chunks = safeDesc.match(/[\s\S]{1,4095}/g)
      if (!chunks) {
        return []
      }
      return chunks.map((chunk) => ({
        title: name || 'Unknown Process',
        color: 0x0000ff,
        description: chunk,
        timestamp: new Date().toISOString(),
      }))
    })
  }

  async sendMessages() {
    this.collectLogs()
    const embeds = this.getEmbeds()
    if (embeds.length) {
      await this.send({ embeds })
    }
    this.messages = {}
  }

  pushToBuffer(data: Data): LogInfo | null {
    if (data.process.name === 'pm2-ban-logger') {
      return null
    }
    const message = stripAnsi(LiveBans.ensureString(data.data))
    const matchOne = message.match(this.bannedAccountRegex)
    if (matchOne) {
      this.cache.add(matchOne[1])
      return null
    }
    const matchTwo = message.match(this.activityTimeRegex)
    if (matchTwo) {
      const [, timestamp, account, activeTime] = matchTwo
      if (this.cache.has(account)) {
        const seconds = parseFloat(activeTime) / 1000
        const [_date, time] = timestamp.split(' ', 2)
        const process = LiveBans.getTitle(data)
        this.buffer.push({
          process: { name: process },
          data: `${time} ${account} banned in ${seconds.toFixed(2)}s`,
          at: Date.now(),
        })
        return {
          account,
          activeTime: seconds,
          timestamp: new Date(`${_date}T${time}`),
          process,
        }
      }
    }
    return null
  }

  collectLogs() {
    const nextMessage = this.buffer.shift()
    if (!nextMessage) return

    nextMessage.buffer = [nextMessage.data]

    while (
      this.buffer.length &&
      this.buffer[0].at >= nextMessage.at &&
      this.buffer[0].at < nextMessage.at + 1000
    ) {
      nextMessage.buffer.push(this.buffer[0].data)
      this.buffer.shift()
    }
    nextMessage.data = nextMessage.buffer.filter(Boolean).join('\n')
    delete nextMessage.buffer

    if (!this.messages[nextMessage.process.name]) {
      this.messages[nextMessage.process.name] = []
    }
    this.messages[nextMessage.process.name].push(nextMessage)
  }
}
