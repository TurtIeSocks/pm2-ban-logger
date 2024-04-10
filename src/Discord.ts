import { WebhookClient, APIEmbed } from 'discord.js'
import stripAnsi from 'strip-ansi'
import { Data, Message, Role } from './types'
import { ObliviousSet } from 'oblivious-set'

const AUTHOR = {
  name: 'PM2',
  icon_url:
    'https://cdn2.opsmatters.com/sites/default/files/logos/pm2-thumb.png',
}

export class DiscordLogger extends WebhookClient {
  messages: APIEmbed[]
  buffer: Message[]
  role: Role
  color: number

  private cache: ObliviousSet<string> = new ObliviousSet(30_000)
  private bannedAccountRegex = /.*marked as banned.*Account (\S+)/
  private activityTimeRegex = /User (\S+) .*Active Time (\d+\.\d+)/

  constructor(url: string, role: Role) {
    super({ url })
    this.messages = []
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

  createMessage(
    data: Data,
    title?: string,
    description?: string,
    timestamp?: number
  ) {
    const safeDesc = description || DiscordLogger.ensureString(data.data) || ''
    const chunks = safeDesc.match(/[\s\S]{1,4095}/g)
    if (chunks) {
      chunks.forEach((chunk, i) => {
        const message: APIEmbed = {
          title: `${title || DiscordLogger.getTitle(data)}${
            chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : ''
          }`,
          description: chunk,
          author: AUTHOR,
          timestamp: new Date(timestamp || data.at).toISOString(),
          color: this.color,
        }
        this.messages.push(message)
      })
    }
  }

  async sendMessages() {
    this.collectLogs()
    if (this.messages.length) {
      await this.send({ embeds: this.messages })
      this.messages = []
    }
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
      const [, account, time] = matchTwo
      if (this.cache.has(account)) {
        const seconds = parseFloat(time) / 1000
        this.buffer.push({
          process: { name: DiscordLogger.getTitle(data) },
          data: `${account} banned in ${seconds.toFixed(2)}s`,
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

    this.createMessage(nextMessage)
  }
}
