import FTPClient from './FTPClient';
import { Commands } from './interfaces/commands';

async function main() {
    const client = new FTPClient('localhost', 21, {
        username: 'anonymous',
        password: 'anonymous@',
    });

    await client.initialize();
    console.log(await client.execute({ type: Commands.LIST }));
}

main();