export interface IContentParserService {
    parse(content: string): Promise<string>;
}
