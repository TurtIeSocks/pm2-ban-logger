# pm2-ban-logger

PM2 Module for logging events & logs from your PM2 processes to Discord via webhooks. This module is designed to be used with [PM2](https://pm2.keymetrics.io/), it is not a standalone application.

## Install

To install and setup pm2-ban-logger, run the following commands:

```bash
  pm2 install pm2-ban-logger
```

## Config Properties

```ts
interface Config {
  /**
   * Duration in seconds to aggregate messages.
   * @default 1
   * */
  buffer_seconds?: number
  /**
   * Duration in seconds to aggregate stats.
   * @default 15
   * */
  stats_minutes?: number
  /**
   * Discord webhook url for logs
   * @default null
   * */
  log_url: string | null
  /**
   * Discord webhook url for stats embeds
   * @default null
   */
  stats_url: string | null
}
```

## Setup

1. Create a Discord Webhook for your server. See [this article](https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks) for more information.
2. Set your PM2 config values
3. e.g:

```bash
  pm2 set pm2-ban-logger:buffer_seconds 1
  pm2 set pm2-ban-logger:log_url https://discordapp.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
  pm2 set pm2-ban-logger:stats_minutes 15
  pm2 set pm2-ban-logger:stats_url https://discordapp.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
```

4. You can set the same or different webhook for each channel but logs will not be recorded if the webhook is not set.

## Development

1. Fork and clone the repo
2. Install dependencies

```bash
  yarn install
```

3. Build the project in watch mode

```bash
  yarn watch
```

4. Copy the `package.json` file into the `dist` folder

```bash
  cp package.json dist
```

5. Run the project locally in PM2

```bash
  cd dist
  pm2 install .
```
