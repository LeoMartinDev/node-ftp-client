import { Commands, Command } from './interfaces/commands';
import { Socket } from 'net';
import * as ResponseParser from 'ftp-response-parser';
import { Observable, fromEvent, Subject, zip, combineLatest, Subscription } from 'rxjs';
import { map, withLatestFrom, concat, skip } from 'rxjs/operators';

async function writeToServer(socket: Socket, command: Command) {
  let { type, next, ...args } = command;

  args = Object.values(args).reduce((accumulator, value, index, array) => { return `${accumulator} ${value}${array.length - 1 < index ? ' ': ''}` }, '');
  console.log(`__${type}${args}__\n`)
  return await writeToSocket(socket, `${type}${args}\n`);
}

function writeToSocket(socket: Socket, payload: string) {
  return new Promise(resolve => socket.write(payload, null, resolve));
}

let isAuthenticated = false;
let commandsSubject = new Subject<Command>();
let commandsWithResponse$: Observable<any>;
let response$;
let authsub: Subscription;

async function responseController(socket: Socket, response: any) {
  switch (response.code) {
    case 220:
      commandsSubject.next({ type: Commands.USER, username: 'anonymous' });
      break;
    case 331:
      commandsSubject.next({ type: Commands.PASS, password: '@anonymous' });
      break;
    case 230:
      isAuthenticated = true;
      authsub.unsubscribe();
      //commandsWithResponse$ = response$.pipe(withLatestFrom(commandsSubject), map(([ response, command ]) => ({ command, response })));//commandsSubject.pipe(map(event => { console.log(event); return event})).subscribe();
      //commandsSubject.next({ type: Commands.PASV });
      commandsWithResponse$ = zip(commandsSubject, response$).pipe(map(([ command, response ]) => { 
        command.next({command, response});
        return { command, response }}));
      break;
  }
}

function list() {
  return new Promise(resolve => {
    commandsSubject.next({ type: Commands.LIST, next: resolve });
  })
}

async function start() {
  const socket = new Socket();
  const responseParser = new ResponseParser();
  response$ = fromEvent(responseParser, 'readable').pipe(map(() => responseParser.read()));
/*   commandsWithResponse$ = zip(commandsSubject, response$.pipe(skip(1))).pipe(map(([ command, response ]) => ({ command, response })));
  commandsWithResponse$.subscribe(console.log) */
  let commands$ = commandsSubject.subscribe(command => writeToServer(socket, command));

  fromEvent(socket, 'data').subscribe(data => responseParser.write(data));
  authsub = response$.subscribe(response => responseController(socket, response));
  socket.once('connect', () => console.log('Connected!'));
  socket.on('error', error => console.error(error));
  socket.connect(21, 'localhost');
  setTimeout(() => {
    commandsWithResponse$.subscribe();
    list().then(console.log);
  }, 1500);
  //setInterval(() => commandsSubject.next({ type: Commands.NOOP }), 200);  
}

start();