import FTPClient from './FTPClient';
import { Commands } from './interfaces/commands';

async function main() {
  try {
    const client = new FTPClient('localhost', 21, {
      username: 'anonymous',
      password: 'anonymous@',
    });

    await client.initialize();
    await client.command({ type: Commands.LIST });
    console.log(await client.command({ type: Commands.LIST }));
  } catch (error) {
    console.error('error : ', error);
  }
}

main();