import { Observable, Subject, fromEvent, Subscription, zip } from 'rxjs';
import { Command } from 'interfaces/commands';
import { Socket } from 'net';
import * as ResponseParser from 'ftp-response-parser';
import { map, skip } from 'rxjs/operators';
import { Commands } from './interfaces/commands';

interface Credentials {
    username: string,
    password: string,
}

export default class FTPClient {

    private response$: Observable<any>;
    private request: Subject<Command>;
    private requestSubscription: Subscription;
    private data$: Observable<Buffer>;
    private dataSubscription: Subscription;
    private commandsRunner: Subject<Function>;
    private socket: Socket;
    private responseParser: any;
    private requestWithResponse$: Observable<any>;
    private commandRunnerSubscription: Subscription;

    constructor(private host: string, private port: number, private credentials: Credentials) {
        this.socket = new Socket();
        this.responseParser = new ResponseParser();
        this.request = new Subject<Command>();
        this.commandsRunner = new Subject<Function>();
        this.socket.connect(this.port, this.host);
    }

    public initialize(): Promise<any> {
        return new Promise(resolve => {
            this.socket.once('connect', async () => {
                this.bootstrap();
                await this.execute({ type: Commands.USER, username: this.credentials.username });
                await this.execute({ type: Commands.PASS, password: this.credentials.password });
                return resolve();
            });
        })
    }

    private bootstrap() {
        this.data$ = fromEvent(this.socket, 'data');
        this.dataSubscription = this.data$.subscribe(data => this.responseParser.write(data));
        this.response$ = fromEvent(this.responseParser, 'readable')
            .pipe(map(() => this.responseParser.read()));
        this.requestSubscription = this.request
            .subscribe(command => this.writeToServer(command));
        this.requestWithResponse$ = zip(this.request, this.response$.pipe(skip(1)))
            .pipe(map(([command, response]) => ({ command, response })));
        this.commandRunnerSubscription = zip(this.requestWithResponse$, this.commandsRunner)
        .subscribe(([ reqRes, next ]) => next(reqRes));
    }

    private async writeToServer(command: Command) {
        let { type, next, ...args } = command;

        args = Object.values(args).reduce((accumulator, value, index, array) =>
            `${accumulator} ${value}${array.length - 1 < index ? ' ' : ''}`, '');
        return await this.writeToSocket(`${type}${args}\n`);
    }

    private writeToSocket(payload: string) {
        return new Promise(resolve => this.socket.write(payload, null, resolve));
    }

    public execute(command: Command): Promise<any> {
        return new Promise(resolve => {
            this.request.next(command);
            this.commandsRunner.next(resolve);
        });
    }

}