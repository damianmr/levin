import Levin, {AppFlags} from './src/levin';

const token = process.env.LEVIN_TOKEN;
const flags: AppFlags = {
  upgradesEnabled: process.env.UPGRADES_ENABLED === 'true',
  automaticFirstLevel: process.env.AUTOMATIC_FIRST_LEVEL === 'true'
}

async function main() {
  if (!token || token === '') {
    console.log('Levin needs a bot token to start, get one here: https://discordapp.com/developers/applications')
  } else {
    try {
      console.log(`Starting with flags: `, flags);
      await Levin({token}, flags);
      console.log(`Bot server has started!`);
    } catch(e) {
      console.error('Cannot start Levin, error:', e);
    }
  }
}

main();
