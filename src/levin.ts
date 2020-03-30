import Discord from 'discord.js';
import moment from 'moment';
import maxBy from 'lodash/maxBy';
import minBy from 'lodash/minBy';
import sum from 'lodash/sum';
import logger from './logger';

type GuildLevel = {
  name: string,
  value: number,
  unitsToUpgrade: number
};

type UpgradeUnit = 'minutes' | 'hours' | 'days' | 'months';

const GuildLevels: GuildLevel[] = [
  {
    name: 'NVL1',
    value: 100,
    unitsToUpgrade: 0,
  },
  {
    name: 'NVL2',
    value: 200,
    unitsToUpgrade: 12
  },
  {
    name: 'NVL3',
    value: 300,
    unitsToUpgrade: 12
  }
];
const UPGRADE_UNIT: UpgradeUnit = 'hours';
const USER_LEVEL_ROLE_NAMES = GuildLevels.map(r => r.name);
const FIRST_LEVEL = minBy(GuildLevels, (level => level.value));

async function Levin({token}: {token: string}) {
  if (!FIRST_LEVEL) {
    throw new Error('Object FIRST_LEVEL could not be initialized.');
  }

  const client = new Discord.Client();

  if (!client || client === null) {
    console.error('Cannot initialize Discord Client');
    return;
  }

  client.on('message', message => {
    if (message.content === 'ping') {
      message.channel?.send('Pong!');
    }
  });

  client.on('ready', () => {
    const {log} = logger();
    log(`Logged in as ${client.user?.tag}!`);
    const guildNames = client.guilds.cache.map((g) => {
      return `"${g.name}" (ID: ${g.id})`;
    }).join(', ');
    log(`Connected to Discords: [${guildNames}]`)
  });

  client.on('guildUpdate', (oldGuild, newGuild) => {
    const {log} = logger();
    if (oldGuild.available === false && newGuild.available === true) {
      log(`Discord "${newGuild.name}" (ID: ${newGuild.id}) is now CONNECTED.`);
    } else if (oldGuild.available === true && newGuild.available === false) {
      log(`Discord "${newGuild.name}" (ID: ${newGuild.id}) is now DISCONNECTED.`);
    }
  });

  client.on('presenceUpdate', async (_oldPresence, newPresence) => {
    const {log, error} = logger();
    if (newPresence.status === 'offline' || !newPresence.member) {
      return;
    }

    const member = newPresence.member;

    if (!member.joinedTimestamp) {
      error(`User ${member.displayName} (id: ${member.id}) does not have joinedTimestamp. Weird.`);
      return;
    }

    const guildLevelRoles = member.guild.roles.cache.filter(role => USER_LEVEL_ROLE_NAMES.includes(role.name));
    const memberLevelRoles = member.roles.cache.filter(role => USER_LEVEL_ROLE_NAMES.includes(role.name));

    if (guildLevelRoles.size !== USER_LEVEL_ROLE_NAMES.length) {
      error(`The list of roles in Discord "${member.guild.name}" (ID: ${member.guild.id}) must match with [${USER_LEVEL_ROLE_NAMES.join(', ')}]. Make sure all of these roles exist.`);
      return;
    }

    // If user has none of the GuildLevels role => assign the lowest one.
    if (memberLevelRoles.size === 0) {
      const lowestLevelRole = guildLevelRoles.find(r => r.name === FIRST_LEVEL.name) as Discord.Role;
      await member.roles.add(lowestLevelRole);
      log(`User ${member.displayName} (ID: ${member.id}) had none of the roles "${USER_LEVEL_ROLE_NAMES.join(', ')}" set. Role "${FIRST_LEVEL.name}" was set to this user.`);
      return;
    }

    const highestCurrentRole = maxBy(memberLevelRoles.array(), (memberRole) => {
      return (
        GuildLevels.find((level) => level.name === memberRole.name) as GuildLevel
      ).value;
    }) as Discord.Role;
    const highestCurrentLevel = GuildLevels.find((level) => level.name === highestCurrentRole.name) as GuildLevel;
    const nextLevel = GuildLevels.find((level) => level.value > highestCurrentLevel.value);

    if (!nextLevel) {
      // User is already on the highest level.
      log(`User "${member.displayName}" (ID: ${member.id}) has the maximum level. Doing nothing with this user.`);
      return;
    }

    const nextLevelRole = guildLevelRoles.find(r => r.name === nextLevel.name) as Discord.Role;
    const now = moment();
    const joinedTimestamp = moment(member.joinedTimestamp);
    const unitsNeededToUpgrade = sum(GuildLevels.filter(uL => uL.value <= nextLevel.value).map(uL => uL.unitsToUpgrade));
    log(`User "${member.displayName}" (ID: ${member.id}) needs at least "${unitsNeededToUpgrade} ${UPGRADE_UNIT}" in the guild to upgrade to ${nextLevel.name}.`);
    if (now.diff(joinedTimestamp, UPGRADE_UNIT) >= unitsNeededToUpgrade) {
      log(`User "${member.displayName}" (ID: ${member.id}) can be upgraded!`);
      const newMemberRoles = member.roles.cache.clone();
      for (let lowerRole of memberLevelRoles.array()) {
        log(`Processing remotion of ${lowerRole.name} (${lowerRole.id}). Exists? ${newMemberRoles.has(lowerRole.id)}`);
        newMemberRoles.delete(lowerRole.id);
      }
      newMemberRoles.set(nextLevelRole.id, nextLevelRole);
      const rolesToSetInfo = newMemberRoles.map(r => `"${r.name}" (${r.id})`).join(', ');
      log(`Roles to set in member: ${rolesToSetInfo}`);
      await member.roles.set(newMemberRoles);
      log(`User "${member.displayName}" (ID: ${member.id}) has been upgraded to "${nextLevelRole.name}". Removed role(s) [${memberLevelRoles.array().map(r => r.name).join(', ')}].`);
      await member.send(`Por tu permanencia en ${member.guild.name} fuiste ascendido a ${nextLevelRole.name}. Felicitaciones! 🎉`);
      return;
    } else {
      log(`User "${member.displayName}" (ID: ${member.id}) does not have enough time in the server.`);
      return;
    }
  });

  await client.login(token);

  return client;
}

export default Levin;