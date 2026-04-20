import Discord, { MessageAttachment, GuildMember } from 'discord.js';
import database, { userKey, KeyValueSchema, UserRecord } from './db';
import moment, { Moment } from 'moment';
import { AppFlags } from '../main';
import loggerInstance from './logger';
import { USER_LEVEL_ROLE_NAMES, levelRolesInfo, Level, levelDown, levelUp } from './levelHelpers';

export type Bot = {
  /**
   * Shutdowns the bot, clean up resources, etc.
   */
  shutdown: () => Promise<void>;
};

type TimeUnit = 'minutes' | 'hours' | 'days' | 'months';

const TIME_UNIT: TimeUnit = 'days';
const TIME_WITHOUT_MESSAGES: number = 30; // Production value is 30 days.
const TIME_BETWEEN_DOWNGRADES: number = TIME_WITHOUT_MESSAGES;
const TIME_BETWEEN_UPGRADES: number = 180; // Production value is 180 days.

const MINUTE_INTERVALS_MULTIPLIER = 60 * 1000;

function timePassed({
  between: [from, to],
  gte: [value, unit]
}: {
  between: [Moment, Moment];
  gte: [number, TimeUnit];
}) {
  return from.diff(to, unit) >= value;
}

async function bot(flags: AppFlags): Promise<Bot> {
  const client = new Discord.Client();

  const { log, error } = loggerInstance();

  const db = database(flags);
  log('[bot] Fetching database file');
  await db.load();

  if (!client || client === null) {
    throw new Error('Cannot initialize Discord Client');
  }

  async function serializeDB() {
    const { log } = loggerInstance();
    log('Saving database to file...');
    await db.save();
    log('Saving database to file done!');
  }

  let serializerTimer: NodeJS.Timer;
  (function dbTimer() {
    serializerTimer = client.setTimeout(() => {
      serializeDB();
      dbTimer();
    }, flags.dbBackupInterval * MINUTE_INTERVALS_MULTIPLIER);
  })();

  let levelingTimer: NodeJS.Timer;
  (function levelingCheck() {
    levelingTimer = client.setTimeout(async () => {
      log('========================');
      log('Running level checks...');
      log('========================');
      const memberKey = ({ guildID, memberID }: { guildID: string; memberID: string }) =>
        `g${guildID}-m${memberID}`;
      client.guilds.cache.map(async (g) => {
        log(`[levelingCheck] Running check on guild "${g.name}" (id: ${g.id})...`);
        await g.members.fetch();
        // Build a guild member lookup so we can later verify whether they left.
        // 1. Skip levelUp / levelDown checks for missing members.
        // 2. Remove them from the database.
        const guildMembers = g.members.cache.reduce<{
          [id: string]: GuildMember;
        }>((list, m) => {
          list[memberKey({ guildID: g.id, memberID: m.id })] = m;
          return list;
        }, {});
        const appEpoch = db.get('appEpoch') as number;
        if (!appEpoch) {
          error('appEpoch is not defined in the database file!', g.name);
          throw new Error('appEpoch is not defined in the database file.');
        }
        const allTrackedUsers = db.get('users') as KeyValueSchema['users'];
        const allTrackedUsersInGuild = Object.values(allTrackedUsers).filter(
          (trackedUser) => trackedUser.guildID === g.id
        );
        allTrackedUsersInGuild.forEach(async (trackedUser: UserRecord) => {
          const memberLogger = loggerInstance();
          const memberLog = memberLogger.log;
          const member = guildMembers[memberKey(trackedUser)];
          memberLog(
            `\n\nRunning level checks for member "${unescape(trackedUser.userName)}"`,
            trackedUser
          );
          if (!member) {
            // The member is no longer in the guild.
            memberLog(
              `Member "${unescape(trackedUser.userName)}" (ID: ${
                trackedUser.memberID
              }) isn't part of the guild anymore. Removing...`,
              trackedUser
            );
            db.removeUser(trackedUser);
            return;
          } else if (member.user.bot || member.hasPermission('ADMINISTRATOR')) {
            memberLog(
              `Member "${member.displayName}" (ID: ${member.id}) is a bot or an admin. Nothing to do.`
            );
            return;
          }
          const rolesInfo = levelRolesInfo(member, memberLogger);
          if (rolesInfo.levelRoles.size === 0) {
            memberLog(
              `User ${member.displayName} (ID: ${
                member.id
              }) has none of "${USER_LEVEL_ROLE_NAMES.join(
                ', '
              )}". Doing nothing with this user (ignoring leveling).`
            );
            return;
          }
          const { lastMessage, lastDowngrade, periodStart } = trackedUser;
          const thisMoment = moment();

          const noMessagesSinceAppEpochTolerance =
            !lastMessage &&
            timePassed({
              between: [thisMoment, moment(appEpoch)],
              gte: [TIME_WITHOUT_MESSAGES, TIME_UNIT]
            });

          const lastMessageWasLongAgo =
            lastMessage &&
            timePassed({
              between: [thisMoment, moment(lastMessage)],
              gte: [TIME_WITHOUT_MESSAGES, TIME_UNIT]
            });

          if (noMessagesSinceAppEpochTolerance || lastMessageWasLongAgo) {
            if (Level.ONE === rolesInfo.highestCurrentLevelRole.name) {
              memberLog(
                `Member "${member.displayName}" (ID: ${member.id}) is level 1 and hasn't posted anything during this period. Restarting their periodStart property.`,
                trackedUser
              );
              db.setUser(member, { periodStart: Date.now() });
            } else if (
              !lastDowngrade ||
              (lastDowngrade &&
                timePassed({
                  between: [thisMoment, moment(lastDowngrade)],
                  gte: [TIME_BETWEEN_DOWNGRADES, TIME_UNIT]
                }))
            ) {
              memberLog(
                `Member "${member.displayName}" (ID: ${member.id}) is leveling DOWN.`,
                trackedUser
              );
              await levelDown(member, memberLogger, flags);
              const now = Date.now();
              db.setUser(member, {
                lastDowngrade: now,
                periodStart: now
              });
            } else {
              memberLog(
                `Member "${member.displayName}" (ID: ${member.id}) hasn't posted anything since their last downgrade. Restarting their periodStart property.`,
                trackedUser
              );
              db.setUser(member, { periodStart: Date.now() });
            }
          } else if (lastMessage) {
            const notMaxLevel = rolesInfo.nextLevelRole !== null;
            const allowedToLevelUp =
              periodStart &&
              timePassed({
                between: [thisMoment, moment(periodStart)],
                gte: [TIME_BETWEEN_UPGRADES, TIME_UNIT]
              });
            if (notMaxLevel && allowedToLevelUp) {
              memberLog(
                `Member "${member.displayName}" (ID: ${member.id}) is leveling up!`,
                trackedUser
              );
              await levelUp(member, memberLogger, flags);
              db.setUser(member, { periodStart: Date.now() });
            }
          }
        });
      });

      levelingCheck(); // Schedule the next check.
    }, flags.levelCheckInterval * MINUTE_INTERVALS_MULTIPLIER);
  })();

  // ==================================================================
  client.on('guildUpdate', (oldGuild, newGuild) => {
    const { log } = loggerInstance();
    if (oldGuild.available === false && newGuild.available === true) {
      log(`Discord "${newGuild.name}" (ID: ${newGuild.id}) is now CONNECTED.`);
    } else if (oldGuild.available === true && newGuild.available === false) {
      log(`Discord "${newGuild.name}" (ID: ${newGuild.id}) is now DISCONNECTED.`);
    }
  });

  // ==================================================================
  client.on('ready', () => {
    const { log, error, info } = loggerInstance();
    log(`Logged in as ${client.user?.tag}!`);
    const guildNames = client.guilds.cache.map((g) => `"${g.name}" (ID: ${g.id})`).join(', ');
    log(`Connected to Discord Rooms: [${guildNames}]`);

    client.guilds.cache.map(async (g) => {
      await g.members.fetch();
      g.members.cache.forEach((m) => {
        // On ready, make sure every guild member has periodStart set.
        // Otherwise, start counting from the moment they joined the guild.
        if (!db.getUser(m) && !m.user.bot) {
          if (m.joinedTimestamp) {
            info(
              `Adding "${m.displayName}" (id: ${m.id}) in guild "${g.name}" (id: ${g.id}) to DB.`
            );
            db.setUser(m, {
              periodStart: m.joinedTimestamp
            });
          } else {
            error(`User ${m.displayName} (id: ${m.id}) does not have joinedTimestamp. Weird.`);
            return;
          }
        }
      });
    });
  });

  type MessageHandler = (message: Discord.Message) => void;
  const MessageHandlers: MessageHandler[] = [
    // ----------
    // Keep track of people's messages.
    // ----------
    async function handleAnyChannelMessage(message) {
      const { info } = loggerInstance();
      info('[handleAnyChannelMessage] handler');
      if (
        message.channel?.type !== 'text' ||
        message.author.bot ||
        !message.member ||
        !message.guild
      ) {
        return;
      }
      const now = Date.now();

      if (db.getUser(message.member)) {
        info(
          `[handleAnyChannelMessage]: message from user "${userKey(message.member)}" (${
            message.member.displayName
          }) in "${message.guild.name} / ${
            message.channel.name
          }". Updating 'lastMessage' property to "${now}".`
        );
        db.setUser(message.member, { lastMessage: now });
      } else {
        info(
          `[handleAnyChannelMessage]: message from user "${userKey(message.member)}" (${
            message.member.displayName
          }) in "${message.guild.name} / ${
            message.channel.name
          }". First message ever captured from this user. Setting 'periodStart' and 'lastMessage' property to "${now}".`
        );
        db.setUser(message.member, {
          periodStart: now,
          lastMessage: now
        });
      }
    },
    // ----------
    // Responds 'pong!' to any 'ping'.
    // ----------
    async function handlePing(message) {
      const { info } = loggerInstance();
      if (message.channel?.type !== 'dm' || !message.author || message.content !== 'ping') {
        return;
      }
      info(`[handlePing] User "${message.author.username}" (id: ${message.author.id}) pinged.`);
      await message.author.send('pong!');
      return;
    },
    // -------
    // Handle the 'users' message from guild admins.
    // -------
    async function usersReport(message) {
      const { log, stamp, error } = loggerInstance();
      if (message.channel?.type !== 'dm' || !message.author || message.content !== 'users') {
        return;
      }
      const ownedGuilds = client.guilds.cache.filter((g) => {
        return !!g.members.cache.find((m) => {
          const isThisAuthor = m.id === message.author.id;
          const isAdmin = m.hasPermission('ADMINISTRATOR');
          return isThisAuthor && isAdmin;
        });
      });
      if (ownedGuilds.size === 0) {
        log(
          `User "${message.author.username}" (id: ${message.author.id}) requested the list of users in his/her guilds, however, is not an administrator in any.`
        );
        return;
      }
      await message.author.send('Juntando lista de usuarios y roles...');
      const userList: string[] = [];
      ownedGuilds.each((g) => {
        userList.push('=====================================');
        userList.push(`Guild "${g.name}" (ID: ${g.id})`);
        userList.push('=====================================');
        g.members.cache.each((m) => {
          const memberRoles = m.roles.cache.map((r) => `${r.name}`).join(',');
          userList.push(`${m.displayName} (ID: ${m.id}) / Roles: ${memberRoles}`);
        });
        userList.push(' ');
      });
      const userListAsString = userList.join('\n');
      log('Guilds & Members:\n');
      log(
        `User "${message.author.username}" (id: ${message.author.id}) requested the list of users in his/her guilds. Sending an attachment with the following contents:`
      );
      log(`\n${userListAsString}`);
      try {
        const attachment = new MessageAttachment(
          Buffer.from(userListAsString, 'utf8'),
          'users.txt'
        );
        await message.author.send(
          'Lista de usuarios en las salas que tengo acceso y sos Administrador:',
          attachment
        );
      } catch (e) {
        error(`Could not send the attachment! ${e}`);
        console.error(`${stamp()} exception error:\n`, e);
        await message.author.send(
          'No se pudo enviar la lista de usuarios. Revisar el log de errores.'
        );
      }
    },

    // Remove the "NVL0" role when users post their first message.
    // NVL0 is assigned automatically when they accept the rules.
    async function removeZeroLevelRole(message) {
      const { info } = loggerInstance();
      if (
        message.channel?.type !== 'text' ||
        message.author.bot ||
        !message.member ||
        !message.guild
      ) {
        return;
      }

      const member = message.member;
      const zeroLevelRole = member.roles.cache.find((role) => role.name === Level.ZERO);
      if (!zeroLevelRole) {
        return;
      }
      const newMemberRoles = member.roles.cache.clone();
      newMemberRoles.delete(zeroLevelRole.id);
      info(
        `[removeZeroLevelRole] Role "${Level.ZERO}" removed in member: ${member.displayName} (ID: ${member.id})`
      );
      await member.roles.set(newMemberRoles);
    }
  ];

  // ==================================================================
  client.on('message', async (message) => {
    Promise.all(MessageHandlers.map(async (f) => f(message)));
  });

  log('[bot] Logging in to Discord...');
  await client.login(flags.botToken);

  return {
    shutdown: async () => {
      const { log } = loggerInstance();
      log('Graceful shutdown started...');
      client.clearTimeout(serializerTimer);
      client.clearTimeout(levelingTimer);
      await serializeDB();
      client.destroy();
      log('Shutdown gracefully finished. Bye.');
    }
  };
}

export default bot;
