export enum Commands {
  ABOR = 'ABOR',
  USER = 'USER',
  PASS = 'PASS',
  QUIT = 'QUIT',
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

export type Command = UserCommand | PassCommand | QuitCommand;