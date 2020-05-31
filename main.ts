import isEmpty from 'lodash/isEmpty';
import bot from './src/bot';

export type AppFlags = {
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

  /**
   * Number of minutes between database backups
   */
  dbBackupInterval: number;

  /**
   * (Optional) Channel where Levin posts the updates it does on roles to.
   */
  updatesChannel: string | null;
};

const MINUTES_IN_ONE_DAY = 60 * 24;

async function main() {
  const botToken = process.env.LEVIN_TOKEN;
  const env = process.env.ENV;
  const githubToken = process.env.GITHUB_TOKEN;
  const dbRepository = process.env.DB_REPOSITORY;
  const dbBackupInterval = parseInt(process.env.DB_BACKUP_INTERVAL_IN_MINUTES || '0', 10);
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

  if (!dbBackupInterval || dbBackupInterval <= 0 || dbBackupInterval > MINUTES_IN_ONE_DAY) {
    console.error(
      `Falta env var "DB_BACKUP_INTERVAL_IN_MINUTES" que debe ser menor a ${MINUTES_IN_ONE_DAY}`
    );
    return;
  }

  const flags: AppFlags = {
    env,
    githubToken,
    dbRepository,
    botToken,
    dbBackupInterval,
    updatesChannel: process.env.UPDATES_CHANNEL || null
  };

  try {
    console.log(`Starting with flags: `, flags);
    const { shutdown } = await bot(flags);
    console.log(`Bot server has started!`);
    process.on('SIGTERM', async () => {
      await shutdown();
      process.exit(0);
    });
    process.on('SIGINT', async () => {
      await shutdown();
      process.exit(0);
    });
  } catch (e) {
    console.error('Cannot start Levin, error:', e);
  }
}

main();
