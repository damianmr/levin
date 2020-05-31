import { GuildMember } from 'discord.js';
import gitHubLogin, { saveToFile, fetchFile } from './github';
import { AppFlags } from '../main';

export type UserRecord = {
  userKey: string;
  guildID: string;
  memberID: string;
  periodStart: number | null;
  lastMessage: number | null;
  lastDowngrade: number | null;
  userName: string;
  userId: string;
};

export const userKey = (member: GuildMember) => `user-${member.guild.id}-${member.id}`;

export type KeyValueSchema = {
  appEpoch: null | number;
  users: { [id: string]: UserRecord };
};

export type KeyValueDB = {
  setUser: (member: GuildMember, record: Partial<UserRecord>) => void;
  getUser: (member: GuildMember) => UserRecord | null;
  removeUser: (record: UserRecord) => void;
  set: (k: keyof KeyValueSchema, v: any) => void;
  get: (k: keyof KeyValueSchema) => any;
  save: () => Promise<void>;
  load: () => Promise<KeyValueSchema>;
};

export default function instance(flags: AppFlags): KeyValueDB {
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
    setUser(this: KeyValueDB, member: GuildMember, updatedRecord: Partial<UserRecord>) {
      const newRecord: UserRecord = {
        userKey: userKey(member),
        guildID: member.guild.id,
        memberID: member.id,
        userName: member.user.username,
        userId: member.user.id,
        periodStart: null,
        lastMessage: null,
        lastDowngrade: null
      };
      keyValueDB.users[userKey(member)] = Object.assign(
        newRecord,
        this.getUser(member) || {},
        updatedRecord,
        {}
      );
    },
    getUser(this: KeyValueDB, member: GuildMember) {
      return keyValueDB.users[userKey(member)] || null;
    },
    removeUser(this: KeyValueDB, record: UserRecord) {
      const member = {
        guild: { id: record.guildID },
        id: record.memberID
      } as GuildMember;
      delete keyValueDB.users[userKey(member)];
    },
    set(this: KeyValueDB, k: keyof KeyValueSchema, v: any) {
      keyValueDB[k] = v;
    },
    get(this: KeyValueDB, k: keyof KeyValueSchema): any {
      return keyValueDB[k];
    },
    async save(this: KeyValueDB) {
      try {
        await saveToFile(dbFileName, keyValueDB);
      } catch (e) {
        console.error(`Cannot save database to file "${dbFileName}"! Error:`, e);
        console.info(`========\nDB DUMP:\n`);
        console.info(JSON.stringify(keyValueDB));
        console.info(`========\nDB DUMP DONE\n`);
      }
    },
    async load(this: KeyValueDB): Promise<KeyValueSchema> {
      try {
        const response = await fetchFile(dbFileName);
        const parsed = JSON.parse(response || '{}');
        keyValueDB.appEpoch = parsed.appEpoch;
        keyValueDB.users = parsed.users;
        return keyValueDB;
      } catch (e) {
        console.error(`Cannot load DB from file "${dbFileName}", error:`, e);
        throw new Error('Cannot load DB from file.');
      }
    }
  };
}
