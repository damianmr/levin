import isEmpty from 'lodash/isEmpty';
import bot from './src/bot';

export type AppFlags = {
  /**
   * Enables automatic leveling. If disabled, users won't level up,
   * no matter how long they've been in the room/guild.
   */
  upgradesEnabled: boolean;

  /**
   * Users who have no level role at all will get the
   * first level assigned automatically if this feature
   * is enabled. Otherwise, you'll have to manually
   * assign a level to your users before Levin can perform
   * any leveling on them.
   */
  automaticFirstLevel: boolean;

  /**
   * GitHub token for a user with full access to any repository
   * where the database files can be stored.
   */
  githubToken: string;

  /**
   * App environment (affects persistence, as determines the database file)
   */
  env: 'dev' | 'stage' | 'prod';

  /**
   * Repository where to expect the database files.
   */
  dbRepository: string;

  /**
   * Discord Bot token.
   */
  botToken: string;
};

async function main() {
  const botToken = process.env.LEVIN_TOKEN;
  const env = process.env.ENV;
  const githubToken = process.env.GITHUB_TOKEN;
  const dbRepository = process.env.DB_REPOSITORY;
  if (!botToken || isEmpty(botToken)) {
    console.error(
      'Se necesita un bot token para iniciar Levin, se puede obtener uno aquí: https://discordapp.com/developers/applications'
    );
    return;
  }
  switch (env) {
    case 'dev':
    case 'stage':
    case 'prod':
      break;
    default:
      console.error(`Entorno invalido "${env}`);
      return;
  }
  if (!githubToken || isEmpty(githubToken) || !dbRepository || isEmpty(dbRepository)) {
    console.error(
      'Faltan env vars "GITHUB_TOKEN" y "DB_REPOSITORY" (en formato: "myUser/myProject")'
    );
    return;
  }

  const flags: AppFlags = {
    upgradesEnabled: process.env.UPGRADES_ENABLED === 'true',
    automaticFirstLevel: process.env.AUTOMATIC_FIRST_LEVEL === 'true',
    env,
    githubToken,
    dbRepository,
    botToken
  };

  try {
    console.log(`Starting with flags: `, flags);
    await bot(flags);
    console.log(`Bot server has started!`);
  } catch (e) {
    console.error('Cannot start Levin, error:', e);
  }
}

main();
