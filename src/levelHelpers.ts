import { GuildMember, Role, GuildChannel, TextChannel, Guild } from 'discord.js';
import maxBy from 'lodash/maxBy';
import { Logger } from './logger';
import { AppFlags } from '../main';

export const Level = { ONE: 'NVL1', TWO: 'NVL2', THREE: 'NVL3' };
export const USER_LEVEL_ROLE_NAMES: string[] = [Level.ONE, Level.TWO, Level.THREE];

export async function levelUp(member: GuildMember, logger: Logger, flags: AppFlags) {
  const { log, error } = logger;
  const rolesInfo = levelRolesInfo(member, logger);
  if (!rolesInfo.nextLevelRole) {
    error(
      `Member "${member.displayName}" (ID: ${member.id}) has no nextLevelRole to level up!. This is an edge case. Should not happen.`,
      member.roles.cache.array()
    );
    throw new Error("Can't level up this user, it's at max level.");
  }

  await replaceMemberRole(
    member,
    {
      replace: rolesInfo.highestCurrentLevelRole,
      withRole: rolesInfo.nextLevelRole
    },
    logger
  );

  await member.fetch();

  log(
    `Member "${member.displayName}" (ID: ${member.id}) has been granted the new leveled up role.`,
    member.roles.cache.array()
  );

  await postToUpdatesChannel(
    flags,
    member.guild,
    logger,
    `Usuario "${member.displayName}" (id: ${member.id}) fue ascendido a ${rolesInfo.nextLevelRole.name}.`
  );

  try {
    await member.send(
      `Por tu permanencia en ${member.guild.name} fuiste ascendido a ${rolesInfo.nextLevelRole.name}. Felicitaciones! 🎉`
    );
  } catch (e) {
    logger.error(`Cannot send message to ${member.displayName}.`, e);
  }
}

export async function levelDown(member: GuildMember, logger: Logger, flags: AppFlags) {
  const { log, error } = logger;
  const rolesInfo = levelRolesInfo(member, logger);
  if (!rolesInfo.prevLevelRole) {
    error(
      `Member "${member.displayName}" (ID: ${member.id}) has no prevLevelRole to level down!. This is an edge case. Should not happen.`,
      member.roles.cache.array()
    );
    throw new Error("Can't level down this user, it's at min level.");
  }

  await replaceMemberRole(
    member,
    {
      replace: rolesInfo.highestCurrentLevelRole,
      withRole: rolesInfo.prevLevelRole
    },
    logger
  );

  await member.fetch();

  log(
    `Member "${member.displayName}" (ID: ${member.id}) has been granted the new leveled down role.`,
    member.roles.cache.array()
  );

  await postToUpdatesChannel(
    flags,
    member.guild,
    logger,
    `Usuario "${member.displayName}" (id: ${member.id}) fue bajado de nivel a ${rolesInfo.prevLevelRole.name}.`
  );

  try {
    await member.send(
      `Debido a tu inactividad en ${member.guild.name}, bajaste de nivel y ahora sos ${rolesInfo.prevLevelRole.name} 😬`
    );
  } catch (e) {
    logger.error(`Cannot send message to ${member.displayName}.`, e);
  }
}

async function replaceMemberRole(
  member: GuildMember,
  { replace, withRole }: { replace: Role; withRole: Role },
  logger: Logger
) {
  const { log } = logger;
  const newMemberRoles = member.roles.cache.clone();
  newMemberRoles.delete(replace.id);
  newMemberRoles.set(withRole.id, withRole);
  const rolesToSetInfo = newMemberRoles.map((r) => `"${r.name}" (${r.id})`).join(', ');
  log(`Roles to set in member:`, rolesToSetInfo);
  await member.roles.set(newMemberRoles);
}

async function postToUpdatesChannel(flags: AppFlags, guild: Guild, logger: Logger, msg: string) {
  if (flags.updatesChannel && flags.updatesChannel !== '') {
    const updatesCh: GuildChannel | undefined = guild.channels.cache.find(
      (ch) => ch.name === flags.updatesChannel
    );
    if (updatesCh && updatesCh.viewable && updatesCh.type === 'text') {
      await (updatesCh as TextChannel).send(msg);
    } else {
      logger.error(
        `Cannot post message to updates channel "${flags.updatesChannel}" because it doesn't exist in the guild, is not viewable or is not a text channel: ${msg}`,
        updatesCh
      );
    }
  }
}

export function levelRolesInfo(m: GuildMember, logger: Logger) {
  const guildLevelRoles = m.guild.roles.cache.filter((role) =>
    USER_LEVEL_ROLE_NAMES.includes(role.name)
  );

  const memberLevelRoles = m.roles.cache.filter((role) =>
    USER_LEVEL_ROLE_NAMES.includes(role.name)
  );

  const guildLevel1 = guildLevelRoles.array().find((r) => r.name === Level.ONE);
  const guildLevel2 = guildLevelRoles.array().find((r) => r.name === Level.TWO);
  const guildLevel3 = guildLevelRoles.array().find((r) => r.name === Level.THREE);

  if (!guildLevel1 || !guildLevel2 || !guildLevel3) {
    logger.error(
      `This Discord guild doesn't have all the required roles: `,
      USER_LEVEL_ROLE_NAMES,
      `${m.guild.name} (${m.guild.id})`
    );
    throw new Error("This Discord room doesn't have all the required roles.");
  }

  const highestCurrentLevelRole = maxBy(memberLevelRoles.array(), (memberRole) => {
    switch (memberRole.name) {
      case Level.ONE:
        return 1;
      case Level.TWO:
        return 2;
      case Level.THREE:
        return 3;
      default:
        logger.error('Impossible case getting highest role level.');
        throw new Error('Impossible case.');
    }
  }) as Role;

  let nextLevelRole: Role | null = null;
  let prevLevelRole: Role | null = null;

  if (highestCurrentLevelRole) {
    switch (highestCurrentLevelRole.name) {
      case Level.ONE:
        prevLevelRole = null;
        nextLevelRole = guildLevel2;
        break;
      case Level.TWO:
        prevLevelRole = guildLevel1;
        nextLevelRole = guildLevel3;
        break;
      case Level.THREE:
        prevLevelRole = guildLevel2;
        nextLevelRole = null;
        break;
    }
  } else {
    logger.log(`This member doesn't have any level role!`, m.roles.cache.array());
  }

  return {
    member: m,
    levelRoles: memberLevelRoles,
    highestCurrentLevelRole: highestCurrentLevelRole,
    nextLevelRole,
    prevLevelRole
  };
}
