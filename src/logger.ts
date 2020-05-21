import genID from './id';

export default function () {
  const logID = genID();

  const stamp = `[req#${logID}] `;

  return {
    stamp: () => {
      return stamp;
    },
    info: (s: string, ...all: any[]) => {
      console.info(`${stamp}${s}`, all);
    },
    log: (s: string, ...all: any[]) => {
      console.log(`${stamp}${s}`, all);
    },
    error: (s: string, ...all: any[]) => {
      console.error(`${stamp}${s}`, all);
    }
  };
}
