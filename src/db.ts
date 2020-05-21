import { GuildMember } from 'discord.js';
import gitHubLogin, { saveToFile, fetchFile } from './github';
import { AppFlags } from '../main';

export type UserRecord = {
  userKey: string;
  periodStart: number | null;
  lastMessage: number | null;
  lastDowngrade: number | null;
};

export const userKey = (member: GuildMember) => `user-${member.guild.id}-${member.id}`;

export type KeyValueSchema = {
  appEpoch: null | number;
  users: { [id: string]: UserRecord };
};

export default function instance(flags: AppFlags) {
  const dbFileName = `${flags.env}-db.json`;

  gitHubLogin({
    githubToken: flags.githubToken,
    owner: flags.dbRepository.split('/')[0],
    repository: flags.dbRepository.split('/')[1]
  });

  const keyValueDB: KeyValueSchema = {
    appEpoch: null,
    users: {}
  };

  return {
    setUser: (member: GuildMember, record: Partial<UserRecord>) => {
      const newRecord = {
        userKey: userKey(member),
        periodStart: null,
        lastMessage: null,
        lastDowngrade: null
      };
      keyValueDB.users[userKey(member)] = Object.assign(newRecord, record, {});
    },
    getUser: (member: GuildMember) => {
      return keyValueDB.users[userKey(member)] || null;
    },
    set: (k: keyof KeyValueSchema, v: any) => {
      keyValueDB[k] = v;
    },
    get: (k: keyof KeyValueSchema): any => {
      return keyValueDB[k];
    },
    save: async () => {
      try {
        await saveToFile(dbFileName, keyValueDB);
      } catch (e) {
        console.error(`Cannot save database to file "${dbFileName}"! Error:`, e);
        console.info(`========\nDB DUMP:\n`);
        console.info(JSON.stringify(keyValueDB));
        console.info(`========\nDB DUMP DONE\n`);
      }
    },
    load: async () => {
      try {
        const response = await fetchFile(dbFileName);
        console.log('AAAAAABBBBB', response);
        return JSON.parse(response || '{}');
      } catch (e) {
        console.error(`Cannot load DB from file "${dbFileName}", error:`, e);
        throw new Error('Cannot load DB from file.');
      }
    }
  };
}
