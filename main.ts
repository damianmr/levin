import Levin from './src/levin';

const token = process.env.LEVIN_TOKEN;

async function main() {
  if (!token || token === '') {
    console.log('Levin needs a bot token to start, get one here: https://discordapp.com/developers/applications')
  } else {
    try {
      await Levin({token});
      console.log(`Bot server has started!`);
    } catch(e) {
      console.error('Cannot start Levin, error:', e);
    }
  }
}

main();
