import Discord, { MessageAttachment } from 'discord.js';
import database, { userKey } from './db';

import { AppFlags } from '../main';
import logger from './logger';

async function bot(flags: AppFlags) {
  const client = new Discord.Client();

  const { log } = logger();

  const db = database(flags);
  log('[bot] Fetching database file');
  await db.load();

  if (!client || client === null) {
    console.error('Cannot initialize Discord Client');
    return;
  }

  // ==================================================================
  client.on('guildUpdate', (oldGuild, newGuild) => {
    const { log } = logger();
    if (oldGuild.available === false && newGuild.available === true) {
      log(`Discord "${newGuild.name}" (ID: ${newGuild.id}) is now CONNECTED.`);
    } else if (oldGuild.available === true && newGuild.available === false) {
      log(`Discord "${newGuild.name}" (ID: ${newGuild.id}) is now DISCONNECTED.`);
    }
  });

  // ==================================================================
  client.on('ready', () => {
    const { log, error, info } = logger();
    log(`Logged in as ${client.user?.tag}!`);
    const guildNames = client.guilds.cache.map((g) => `"${g.name}" (ID: ${g.id})`).join(', ');
    log(`Connected to Discord Rooms: [${guildNames}]`);

    client.guilds.cache.map(async (g) => {
      await g.members.fetch();
      g.members.cache.forEach((m) => {
        // 'on Ready': verificamos que todos los miembros de la sala
        // tengan 'periodStart' setteado, sino, se comienza a contar desde el
        // momento en que se unieron a la sala.
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
      const { info } = logger();
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
          `[handleAnyChannelMessage]: message from user "${userKey(message.member)}" in "${
            message.guild.name
          } / ${message.channel.name}". Updating 'lastMessage' property to "${now}".`
        );
        db.setUser(message.member, { lastMessage: now });
      } else {
        // TODO Verificar agregar a alguien con el server levantado
        info(
          `[handleAnyChannelMessage]: message from user "${userKey(message.member)}" in "${
            message.guild.name
          } / ${
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
      const { info } = logger();
      if (message.channel?.type !== 'dm' || !message.author || message.content !== 'ping') {
        return;
      }
      info(`[handlePing] User "${message.author.username}" (id: ${message.author.id}) pinged.`);
      await message.author.send('pong!');
      return;
    },
    // -------
    // Handles message 'users' from guild admins.
    // -------
    async function usersReport(message) {
      const { log, stamp, error } = logger();
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
      console.log('Guilds & Members:\n');
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
    }
  ];

  // ==================================================================
  client.on('message', async (message) => {
    // console.log('Message!', message);
    Promise.all(MessageHandlers.map(async (f) => f(message)));
  });

  log('[bot] Logging in to Discord...');
  await client.login(flags.botToken);

  return client;
}

export default bot;
