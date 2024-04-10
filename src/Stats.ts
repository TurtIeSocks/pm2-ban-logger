import { WebhookClient, APIEmbed } from 'discord.js'

import { LogInfo } from './types'

export class Stats extends WebhookClient {
  color: number
  stats: Record<string, LogInfo[]>

  constructor(url: string) {
    super({ url })
    this.color = 0x0000ff
    this.stats = {}
    console.log(`pm2-ban-logger: Stats client created`)
  }

  getEmbeds(): APIEmbed[] {
    return Object.entries(this.stats).map(([name, data]) => {
      let lessThanOneMinute = 0
      let lessThanFiveMinutes = 0
      let lessThanTenMinutes = 0
      let lessThanOneHour = 0
      for (const info of data) {
        if (info.activeTime < 60) {
          lessThanOneMinute++
        } else if (info.activeTime < 300) {
          lessThanFiveMinutes++
        } else if (info.activeTime < 600) {
          lessThanTenMinutes++
        } else {
          lessThanOneHour++
        }
      }
      const fields: APIEmbed['fields'] = []
      if (lessThanOneMinute) {
        fields.push({
          name: 'Less than 1 minute',
          value: lessThanOneMinute.toLocaleString(),
        })
      }
      if (lessThanFiveMinutes) {
        fields.push({
          name: 'Less than 5 minutes',
          value: lessThanFiveMinutes.toLocaleString(),
        })
      }
      if (lessThanTenMinutes) {
        fields.push({
          name: 'Less than 10 minutes',
          value: lessThanTenMinutes.toLocaleString(),
        })
      }
      if (lessThanOneHour) {
        fields.push({
          name: 'Less than 1 hour',
          value: lessThanOneHour.toLocaleString(),
        })
      }
      return {
        title: name,
        color: this.color,
        fields,
        timestamp: new Date().toISOString(),
      }
    })
  }

  pushToStats(info: LogInfo) {
    if (info.process in this.stats) {
      this.stats[info.process].push(info)
    } else {
      this.stats[info.process] = [info]
    }
  }

  async sendMessages() {
    const embeds = this.getEmbeds()
    if (embeds.length) {
      await this.send({ embeds })
    }
    this.stats = {}
  }
}
