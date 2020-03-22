import Discord from 'discord.js';
import moment from 'moment';
import maxBy from 'lodash/maxBy';
import minBy from 'lodash/minBy';

type GuildLevel = {
  name: string,
  value: number,
  unitsToUpgrade: number
};

// const UpgradeUnit: 'minutes' | 'days' | 'months' = 'minutes';

const UserLevels: GuildLevel[] = [
  {
    name: 'NVL1',
    value: 100,
    unitsToUpgrade: 5,
  },
  {
    name: 'NVL2',
    value: 200,
    unitsToUpgrade: 5
  },
  {
    name: 'NVL3',
    value: 300,
    unitsToUpgrade: 5
  }
];

const USER_LEVEL_ROLE_NAMES = UserLevels.map(r => r.name);
const FIRST_LEVEL = minBy(UserLevels, (level => level.value));

async function Levin({token}: {token: string}) {
  if (!FIRST_LEVEL) {
    throw new Error('Object FIRST_LEVEL could not be initialized.');
  }

  const client = new Discord.Client();

  if (!client || client === null) {
    console.error('Cannot initialize Discord Client');
    return;
  }

  client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    const guildNames = client.guilds.cache.map((g) => {
      return `"${g.name}" (ID: ${g.id})`;
    }).join(', ');
    console.log(`Connected to Discords: [${guildNames}]`)
  });

  client.on('message', msg => {
    if (msg.content === 'ping' && msg.reply) {
      msg.reply('Pong');
    }
  });

  client.on('guildUpdate', (oldGuild, newGuild) => {
    if (oldGuild.available === false && newGuild.available === true) {
      console.log(`Discord "${newGuild.name}" (ID: ${newGuild.id}) is now CONNECTED.`);
    } else if (oldGuild.available === true && newGuild.available === false) {
      console.log(`Discord "${newGuild.name}" (ID: ${newGuild.id}) is now DISCONNECTED.`);
    }
  });

  client.on('presenceUpdate', async (_oldPresence, newPresence) => {
    if (newPresence.status !== 'online' || !newPresence.member) {
      return;
    }
    const member = newPresence.member;

    if (!member.joinedTimestamp) {
      console.error(`User ${member.displayName} (id: ${member.id}) does not have joinedTimestamp. Weird.`);
      return;
    }

    const guildLevelRoles = member.guild.roles.cache.filter(role => USER_LEVEL_ROLE_NAMES.includes(role.name));
    const memberLevelRoles = member.roles.cache.filter(role => USER_LEVEL_ROLE_NAMES.includes(role.name));

    if (guildLevelRoles.size !== USER_LEVEL_ROLE_NAMES.length) {
      console.error(`The list of roles in Discord "${member.guild.name}" (ID: ${member.guild.id}) must match with [${USER_LEVEL_ROLE_NAMES.join(', ')}]. Make sure all of these roles exist.`);
    }

    if (memberLevelRoles.size === 0) {
      const lowestLevelRole = guildLevelRoles.find(r => r.name === FIRST_LEVEL.name) as Discord.Role;
      await member.roles.add(lowestLevelRole);
      console.log(`User ${member.displayName} (ID: ${member.id}) had none of the roles "${USER_LEVEL_ROLE_NAMES.join(', ')}" set. Role "${FIRST_LEVEL.name}" was set to this user.`);
    } else {
      const highestCurrentRole = maxBy(memberLevelRoles.array(), (memberRole) => {
        return (
          UserLevels.find((level) => level.name === memberRole.name) as GuildLevel
        ).value;
      }) as Discord.Role;
      const highestCurrentRoleValue = (UserLevels.find((level) => level.name === highestCurrentRole.name) as GuildLevel).value;
      const nextLevel = UserLevels.find((level) => level.value > highestCurrentRoleValue);
      if (!nextLevel) {
        // User is already on the highest level.
        console.log(`User "${member.displayName}" (ID: ${member.id}) has the maximum level. Doing nothing with this user.`);
      } else {
        const nextLevelRole = guildLevelRoles.find(r => r.name === nextLevel.name) as Discord.Role;
        await member.roles.add(nextLevelRole);
        await member.roles.remove(memberLevelRoles);
        console.log(`User "${member.displayName}" (ID: ${member.id}) has been upgraded to "${nextLevelRole.name}". Removed role(s) [${memberLevelRoles.array().map(r => r.name).join(', ')}].`);
      }
    }
    // const now = moment();
    // const joinedTimestamp = moment(member.joinedTimestamp);

    // console.log(`User ${member.displayName} is online. Joined ${member.joinedAt} (${member.joinedTimestamp})`);
  });

  await client.login(token);

  return client;
}

export default Levin;