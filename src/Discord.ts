import { WebhookClient, APIEmbed } from 'discord.js'
import stripAnsi from 'strip-ansi'
import { ObliviousSet } from 'oblivious-set'

import { Data, Message, Role } from './types'

const AUTHOR = {
  name: 'PM2',
  icon_url:
    'https://cdn2.opsmatters.com/sites/default/files/logos/pm2-thumb.png',
}

export class DiscordLogger extends WebhookClient {
  messages: Record<string, Data[]>
  buffer: Message[]
  role: Role
  color: number

  private cache: ObliviousSet<string> = new ObliviousSet(30_000)
  private bannedAccountRegex = /Account (\S+) marked as banned/
  private activityTimeRegex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[.*\] User (\S+) .*Active Time (\d+\.\d+)/;

  constructor(url: string, role: Role) {
    super({ url })
    this.messages = {}
    this.buffer = []
    this.role = role
    this.color =
      role === 'log' ? 0x00ff00 : role === 'error' ? 0xff0000 : 0x0000ff

    console.log(`DiscordLogger: ${role} client created`)
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
    return Object.entries(this.messages).map(([name, logs]) => ({
      title: name || 'Unknown Process',
      color: this.color,
      description: logs.map((log) => DiscordLogger.ensureString(log.data) || 'No data provided').join('\n'),
      timestamp: new Date().toISOString(),
    }))
  }

  async sendMessages() {
    this.collectLogs()
    const embeds = this.getEmbeds()
    if (embeds.length) {
      await this.send({ embeds })
    }
    this.messages = {}
  }

  pushToBuffer(data: Data) {
    if (data.process.name === 'pm2-ban-logger') {
      return
    }
    const message = stripAnsi(DiscordLogger.ensureString(data.data))
    const matchOne = message.match(this.bannedAccountRegex)
    if (matchOne) {
      this.cache.add(matchOne[1])
      return
    }
    const matchTwo = message.match(this.activityTimeRegex)
    if (matchTwo) {
      const [, timestamp, account, activeTime] = matchTwo
      if (this.cache.has(account)) {
        const seconds = parseFloat(activeTime) / 1000
        const [_date, time] = timestamp.split(' ', 2);
        this.buffer.push({
          process: { name: DiscordLogger.getTitle(data) },
          data: `${time} ${account} banned in ${seconds.toFixed(2)}s`,
          at: Date.now(),
        })
        return
      }
    }
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
