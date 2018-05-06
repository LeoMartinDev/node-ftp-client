import { Subject } from 'rxjs';
import { Socket } from 'net';
import { Command } from './interfaces/commands';

interface Response {
  code: number,
  text: string,
  isMark: boolean,
  isError: boolean,
}
export default class FTPClient {
  private host: string;
  private port: number;
  private socket: Socket;
  private request$: Subject<Command>;
  private response$: Observable<Response>;
  
  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
    this.socket = new Socket();
  }


}