import { Commands, Command } from './interfaces/commands';
import { Socket } from 'net';
import * as ResponseParser from 'ftp-response-parser';
import { Observable, fromEvent, Subject, zip, combineLatest, Subscription } from 'rxjs';
import { map, withLatestFrom, concat } from 'rxjs/operators';

async function writeToServer(socket: Socket, command: Command) {
  let { type, ...args } = command;

  args = Object.values(args).reduce((accumulator, value, index, array) => { return `${accumulator} ${value}${array.length - 1 < index ? ' ': ''}` }, '');
  console.log(`${type}`);
  console.log('payload ::: ', `${type}${args}\n`)
  return await writeToSocket(socket, `${type}${args}\n`);
}

function writeToSocket(socket: Socket, payload: string) {
  return new Promise(resolve => socket.write(payload, null, resolve));
}

let isAuthenticated = false;
let commandsSubject = new Subject<Command>();
let commandsWithResponse$;
let response$;
let authsub: Subscription;

async function responseController(socket: Socket, response: any) {
  switch (response.code) {
    case 220:
      await writeToServer(socket, { type: Commands.USER, username: 'anonymous' });
      break;
    case 331:
      await writeToServer(socket, { type: Commands.PASS, password: '@anonymous' });
      break;
    case 230:
      isAuthenticated = true;
      authsub.unsubscribe();
      commandsWithResponse$ = response$.pipe(withLatestFrom(commandsSubject), map(([ response, command ]) => ({ command, response })));//commandsSubject.pipe(map(event => { console.log(event); return event})).subscribe();
      commandsWithResponse$.subscribe(console.log)
      commandsSubject.next({ type: Commands.QUIT });
      break;
  }
}

async function start() {
  const socket = new Socket();
  const responseParser = new ResponseParser();
  response$ = fromEvent(responseParser, 'readable').pipe(map(() => responseParser.read()));
  let commands$ = commandsSubject.subscribe(command => writeToSocket(socket, `${command}\n`));

  fromEvent(socket, 'data').subscribe(data => responseParser.write(data));
  authsub = response$.subscribe(response => responseController(socket, response));
  socket.once('connect', () => console.log('Connected!'));
  socket.on('error', error => console.error(error));
  socket.connect(21, 'localhost');
}

start();