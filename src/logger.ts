import genID from './id';

export default function() {

  const logID = genID();

  const stamp = `[req#${logID}] `;

  return {
    stamp: () => {
      return stamp;
    },
    log: (s: string) => {
      console.log(`${stamp}${s}`);
    },
    error: (s: string) => {
      console.error(`${stamp}${s}`);
    }
  }
}