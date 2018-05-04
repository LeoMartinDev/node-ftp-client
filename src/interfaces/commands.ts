import { PasvCommand } from './commands';
export enum Commands {
  ABOR = 'ABOR',
  USER = 'USER',
  PASS = 'PASS',
  QUIT = 'QUIT',
  LIST = 'LIST',
  NOOP = 'NOOP',
  PASV = 'PASV',
}

interface ICommand {
  type: Commands,
}

export interface UserCommand extends ICommand {
  type: Commands.USER,
  username: string,
}

export interface PassCommand extends ICommand {
  type: Commands.PASS,
  password: string,
}

export interface QuitCommand extends ICommand {
  type: Commands.QUIT,
}

export interface ListCommand extends ICommand {
  type: Commands.LIST,
}

export interface NoopCommand extends ICommand {
  type: Commands.NOOP,
}

export interface PasvCommand extends ICommand {
  type: Commands.PASV,
}

export type Command = UserCommand | PassCommand | QuitCommand | ListCommand | NoopCommand | PasvCommand;