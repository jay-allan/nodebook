import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import { IContentParserService } from './IContentParserService';

export class MarkdownParserService implements IContentParserService {
    private marked: Marked;

    constructor() {
        this.marked = new Marked(
            { async: true },
            markedHighlight({
                async: true,
                highlight(code, lang, info): Promise<string> {
                    return new Promise((resolve, reject) => {
                        const language = hljs.getLanguage(lang)
                            ? lang
                            : 'plaintext';
                        const result = hljs.highlight(code, { language });
                        return resolve(result.value);
                    });
                }
            })
        );
    }

    public async parse(content: string): Promise<string> {
        const html = await this.marked.parse(content);
        return html;
    }
}
