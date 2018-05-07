
import { Observable, Subject, fromEvent, Subscription, zip, from } from 'rxjs';
import { Command } from 'interfaces/commands';
import { Socket } from 'net';
import * as ResponseParser from 'ftp-response-parser';
import { map, skip, last, concat, concatMap, switchMap } from 'rxjs/operators';
import { Commands } from './interfaces/commands';
import { rejects } from 'assert';

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
            .pipe(map(([command, response]) => {
                console.log({ command, response })
                return { command, response }
            }));
        this.commandRunnerSubscription = zip(this.requestWithResponse$, this.commandsRunner)
            .subscribe(([reqRes, next]) => {
                if (reqRes.response.isError) return next(reqRes);
                return next(null, reqRes)
            });
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

    public async execute(command: Command): Promise<any> {
        return new Promise(async (resolve, reject) => {
            this.request.next(command);
            this.commandsRunner.next((error, result) => {
                if (error) return reject(error);
                return resolve(result);
            });
        });
    }

    private parsePasv(value: string): { host: string, port: number } {
        let rawHostPort = value.substring(value.indexOf('(') + 1, value.indexOf(')')).split(',');
        let host = rawHostPort.slice(0, 4).join('.');
        let [p1, p2] = rawHostPort.slice(4, 6).map(e => parseInt(e));
        let port = p1 * 256 + p2;

        return { host, port };
    }

    private createPasvSocket(host: string, port: number): Socket {
        const socket = new Socket();

        return socket.connect(port, host);
    }

    public async command(command: Command): Promise<any> {
        let { response } = await this.execute({ type: Commands.PASV });
        let { host, port } = this.parsePasv(response.text);
        let result;
        
        return new Promise((resolve, reject) => {
            try {
                let pasvSocket = this.createPasvSocket(host, port);

                pasvSocket.once('connect', async () => {
                    result = await this.execute(command);
                    pasvSocket.on('data', data => console.log(data.toString()));
                    pasvSocket.on('close', () => {
                        pasvSocket.destroy();
                        return resolve(result);
                    });
                    pasvSocket.on('error', console.error)
                    if (result.response.isMark) {
                        result = await this.execute(command);
                    }
                });
            } catch (error) {
                reject(error);
            }
        })
    }

}