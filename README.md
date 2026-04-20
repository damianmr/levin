# Levin Discord Bot

Spanish version: [README.es.md](README.es.md)

Levin is a bot that lets you define a level system for users using Discord roles. Users move up or down levels based on their activity. Levels determine which channels those users can access.

## Prerequisites

### Creating the Discord bot

Before you start using this project, you need to create a new application in Discord and add a bot to it. This is done at https://discordapp.com/developers/applications

![Create a Discord app](docs/app-create.gif?raw=true "Creating a Discord app")

Once the application is created, you will get a `CLIENT_ID`, which can be used to add the bot to any Discord server where you want to install it.

Then you need to add a bot inside that application. You will need to copy and securely store the bot token. This token is extremely important because it allows the bot to connect to Discord.

![Create a Discord bot](docs/bot-create.gif?raw=true "Creating a Discord bot")

The token must never be committed to any file in the repository and must remain secret.

### Database persistence

Levin uses a very basic key-value database persisted as JSON. Due to hardware and cost constraints, that database is persisted to a file in git using the [official GitHub API through Octokit](https://octokit.github.io/rest.js/v17#usage). To use that API, you need two things:

1. A new repository, ideally dedicated exclusively to this purpose, although that is not required. That repository must contain three files: `dev-db.json`, `stage-db.json`, `prod-db.json`. You can find an example in [dev-db.json.example](docs/dev-db.json.example?raw=true).

![Repository example](docs/repoConfig.png?raw=true "Repository example")

2. A user token that has access to that repository. This is created from the user settings interface. This token must never be shared, must never be committed to the repository, and should be handled with the same care as any other password.

![User token creation](docs/userToken.gif?raw=true "User token creation")

## Installation

You only need Node.js `v24.15.0` LTS. If you use `nvm`, the repository already includes `.nvmrc`:

```bash
nvm install
nvm use
npm install
```

## Discord server setup

Before trying to run the bot, you need to add it to the Discord server where it will run. To do that, an administrator must approve the bot request. Because of that, the bot you create must be marked as "Public". Otherwise, nobody will be able to add it to their Discord server; private bots can only be added by their creator, and only to servers they own.

![Set the bot as public](docs/public-bot.jpg?raw=true "Set the bot as public")

Then share this link with the administrator of the server you want the bot to join:

```text
https://discordapp.com/oauth2/authorize?&client_id=CLIENT_ID_HERE&scope=bot&permissions=268438528
```

The `CLIENT_ID` was generated during app creation ([see Prerequisites](#prerequisites)). The number used in the `permissions` parameter matches the permissions the bot needs to work correctly.

The permissions list is available on the bot administration page:

![Discord permissions](docs/permissions.png?raw=true "Discord permissions")

### Roles

In the server settings, make sure the bot has the highest authority possible for role management. Above all, it is important that the bot sits above the roles it is supposed to assign.

For example, this configuration will not work because `[Test Levin App]` will not be able to remove or assign the NVL1, NVL2, and NVL3 roles.

![Incorrect role setup](docs/wrong-setup.jpg?raw=true "Incorrect role setup")

The configuration needs to look more like this:

![Correct role setup](docs/correct-setup.jpg?raw=true "Correct role setup")

### Read permissions

It is also essential that the bot has read access to as many channels as possible. It does not need access to every channel, but the automatic level-up logic is based on the messages the bot can read from users. If a user is only active in a specific channel and the bot cannot read messages there, the bot will eventually lower that member's level.

The configuration for any channel Levin should be able to read should look something like this:

![Correct channel setup](docs/exampleChannel.png?raw=true "Correct channel setup")

### Channel for level updates

You should create a channel where Levin can post user level updates. Levin uses this channel to notify anyone with read access there about the level changes it is making.

![Correct level updates channel setup](docs/updatesChannel.png?raw=true "Correct level updates channel setup")

## Starting the bot

```bash
LEVIN_TOKEN=<bot-token> DB_BACKUP_INTERVAL_IN_MINUTES=2 LEVEL_CHECK_INTERVAL_IN_MINUTES=1440 DB_REPOSITORY=<db_repository> ENV=<dev|stage|prod> GITHUB_TOKEN=<github-token> UPDATES_CHANNEL=<channel-name> npm start
```

If everything is installed correctly, you will see a message indicating that Levin connected to Discord.

## Environment variables

| Variable | Required | Description | Example / Notes |
| --- | --- | --- | --- |
| `LEVIN_TOKEN` | Yes | Discord bot token used to log in. | Get it from the Discord developer portal. Keep it secret. |
| `GITHUB_TOKEN` | Yes | GitHub token for a user with access to the repository that stores the DB files. | Treated like a password. |
| `DB_REPOSITORY` | Yes | Repository where `dev-db.json`, `stage-db.json`, and `prod-db.json` live. | Format: `owner/repo` |
| `ENV` | Yes | Selects which DB file Levin will use. | Valid values: `dev`, `stage`, `prod` |
| `DB_BACKUP_INTERVAL_IN_MINUTES` | Yes | Interval used to persist the DB back to GitHub. | Must be greater than `0` and less than or equal to `1440` |
| `LEVEL_CHECK_INTERVAL_IN_MINUTES` | Yes | Interval used to run automatic level checks. | Must be greater than `0` and less than or equal to `1440` |
| `UPDATES_CHANNEL` | No | Channel name where Levin posts level changes. | Must match the Discord channel name exactly |

These are the only runtime environment variables currently read by the application code.

## Deployment

Any server capable of running Node.js can run Levin. The same command used locally is enough because the app does not require a build step.

## Resources

- List of available events: https://gist.github.com/koad/316b265a91d933fd1b62dddfcc3ff584
- Same idea: https://github.com/onepiecehung/discordjs-logger
- General DiscordJS documentation (the API used to communicate with Discord): https://discordjs.guide/#before-you-begin
- DiscordJS API: https://discord.js.org/#/docs/main/stable/general/welcome
- Octokit (GitHub API): https://octokit.github.io/rest.js/v18
- General TypeScript guide: https://www.typescriptlang.org/docs/home.html
