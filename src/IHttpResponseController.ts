export interface IHttpResponseController {
    execute(req: any, res: any): Promise<void>;
}
