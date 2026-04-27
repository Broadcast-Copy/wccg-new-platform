/**
 * Ambient declaration for `ftp-srv`. The library has no published types;
 * this captures just the surface we actually use.
 */
declare module 'ftp-srv' {
  import type { Server } from 'node:net';
  import type { Readable, Writable } from 'node:stream';

  // The base FileSystem class — we subclass it. Methods are loosely typed
  // because ftp-srv accepts a wide variety of return shapes.
  export class FileSystem {
    constructor(connection: unknown, opts?: unknown);
    currentDirectory(): string;
    get(filename: string): Promise<unknown>;
    list(path?: string): Promise<unknown[]>;
    chdir(path: string): Promise<string>;
    write(filename: string, options?: unknown): Promise<{ stream: Writable; clientPath: string }> | { stream: Writable; clientPath: string };
    read(filename: string): Promise<{ stream: Readable; clientPath: string }>;
    delete(filename: string): Promise<unknown>;
    mkdir(path: string): Promise<unknown>;
    rename(from: string, to: string): Promise<unknown>;
    chmod(path: string, mode: number): Promise<unknown>;
  }

  export interface FtpSrvOptions {
    url?: string;
    pasv_url?: string;
    pasv_min?: number;
    pasv_max?: number;
    anonymous?: boolean;
    greeting?: string[] | string;
    file_format?: string;
    log?: unknown;
    tls?: { key: Buffer | string; cert: Buffer | string; ca?: Buffer | string };
  }

  export interface LoginContext {
    connection: unknown;
    username: string;
    password: string;
  }

  export class FtpSrv {
    constructor(opts?: FtpSrvOptions);
    server: Server;
    on(event: 'login', handler: (ctx: LoginContext, resolve: (r: { fs: FileSystem }) => void, reject: (err: Error) => void) => void): this;
    on(event: 'disconnect', handler: (ctx: { connection: unknown; id: string }) => void): this;
    on(event: string, handler: (...args: unknown[]) => void): this;
    listen(): Promise<void>;
    close(): Promise<void>;
  }

  export default FtpSrv;
}
