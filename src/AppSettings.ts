import * as path from 'path';

export class AppSettings {
    public static BASE_PATH: string = process.env.BASE_PATH
        ? path.resolve(process.env.BASE_PATH)
        : __dirname;
    public static PORT = 3000;
}
