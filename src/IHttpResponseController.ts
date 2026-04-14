import type { IncomingMessage, ServerResponse } from 'http';

export interface HttpRequest extends IncomingMessage {
    path: string;
    params: Record<string, string | string[]>;
}

export interface IHttpResponseController {
    execute(req: HttpRequest, res: ServerResponse): Promise<void>;
}
