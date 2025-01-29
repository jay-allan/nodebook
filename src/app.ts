import { Logger } from './Logger';
import polka from 'polka';
import { Marked } from 'marked';
import { markedHighlight } from "marked-highlight";
import { markedSmartypantsLite } from "marked-smartypants-lite";
import hljs from 'highlight.js';
import * as fsPromise from 'fs/promises';
import * as ejs from 'ejs';

const marked = new Marked(
    { async: true },
    markedHighlight({
        async: true,
        highlight(code, lang, info): Promise<string> {
            return new Promise((resolve, reject) => {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                const result = hljs.highlight(code, { language });
                return resolve(result.value);
            });
        }
    }),
    markedSmartypantsLite()
);

async function readArticleFile(articleFileName: string): Promise<string> {
    Logger.info("Attempting to read file " + articleFileName);
    try {
        const fileContents: string =
            await fsPromise.readFile(articleFileName, { encoding: 'utf8' });
        return fileContents;
    }
    catch (err) {
        throw Error("Unable to read file " + articleFileName);
    }
}

async function parseMarkdown(markdown: string): Promise<string> {
    Logger.info("Parsing markdown");
    const html = await marked.parse(markdown);
    return html;
}

async function renderTemplate(templateName: string, data: ejs.Data): Promise<string> {
    Logger.info("Attempting to render template " + templateName);
    const html = await ejs.renderFile(`templates/${templateName}.ejs`, data);
    return html;
}

async function renderArticle(articleName: string): Promise<string> {
    Logger.info("Attempting to render article " + articleName);
    const articleFileContent = await readArticleFile(`articles/${articleName}.md`);
    const articleContent = await parseMarkdown(articleFileContent);
    const html = await renderTemplate('article',
        { title: 'Test', subtitle: 'Really, just a test', content: articleContent });
    return html;
}

function servePage(res: any, html: string) {
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}

polka()
    .get('/', async (req, res) => {
        Logger.info("Request received for index");
        const html = await renderTemplate('index', { title: 'Index' });
        servePage(res, html);
        Logger.info('Served /');
    })
    .get('/*', async (req, res) => {
        Logger.info("Request received for article " + req.path);

        const articleName = req.path.substring(1);
        let html = "";
        try {
            html = await renderArticle(articleName);
        }
        catch (err) {
            Logger.error('Article not found: ' + req.path);
            return (res.statusCode = 404, res.end("File not found"));
        }

        servePage(res, html);
        Logger.info('Served ' + req.path);
    })
    .listen(3000, () => {
        Logger.info('Server running on localhost:3000');
    });
