import * as path from 'path';

export class AppSettings {
    public static BASE_PATH: string = process.env.BASE_PATH
        ? path.resolve(process.env.BASE_PATH)
        : __dirname;
    public static PORT: number = process.env.PORT
        ? parseInt(process.env.PORT, 10)
        : 3001;
}
