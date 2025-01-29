import { Logger } from './Logger';
import polka from 'polka';
import { Marked } from 'marked';
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';
import * as fsPromise from 'fs/promises';
import * as ejs from 'ejs';
import matter from 'gray-matter';
import * as path from 'path';
import * as fs from 'fs';

const BASE_PATH = process.env.BASE_PATH ? path.resolve(process.env.BASE_PATH) : __dirname;
Logger.info(`Application base path: ${BASE_PATH}`);

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
);

export async function readArticleFile(articleFileName: string): Promise<string> {
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

export async function parseArticleFileContent(markdown: string): Promise<{ html: string, metadata: any}> {
    Logger.info("Parsing markdown");
    const parsed = matter(markdown);
    Logger.info(`Extracted Metadata: ${JSON.stringify(parsed.data)}`);
    const html = await marked.parse(parsed.content);
    return { html, metadata: parsed.data };
}

export async function renderTemplate(templateName: string, data: ejs.Data): Promise<string> {
    Logger.info("Attempting to render template " + templateName);
    const html = await ejs.renderFile(`templates/${templateName}.ejs`, data);
    return html;
}

export async function getArticleData(articleName: string): Promise<{ html: string, metadata: any }> {
    const articleFileContent = await readArticleFile(`articles/${articleName}.md`);
    const article = await parseArticleFileContent(articleFileContent);
    return article;
}

export function isArticleVisible(article: any): boolean {
    const currentDate = new Date();
    const articleDate = new Date(article.metadata.date);
    const isDateReached = currentDate >= articleDate;
    const isPublished = article.metadata.published === true;
    Logger.info(`Article visibility: Date reached (${articleDate}): ${isDateReached}, Published: ${isPublished}`);
    return isDateReached && isPublished
}

export async function renderArticle(articleName: string, previewMode?: boolean): Promise<string> {
    Logger.info("Attempting to render article " + articleName);
    const article = await getArticleData(articleName);
    let articleVisible = false;
    if (!previewMode) {
        articleVisible = isArticleVisible(article);
    }
    if (previewMode || articleVisible) {
        const html = await renderTemplate('article',
            { title: article.metadata.title, subtitle: 'Really, just a test', content: article.html });
        return html;
    } else {
        throw Error("Article not found");
    }
}

function servePage(res: any, html: string) {
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}

export async function getAllArticleMetadata(): Promise<any[]> {
    const articlesDir = path.join(BASE_PATH, 'articles');
    Logger.info(`Attempting to retrieve list of articles at ${articlesDir}`);

    const files = await fsPromise.readdir(articlesDir);
    const articles = [];
    for (const file of files) {
        if (path.extname(file) !== '.md') {
            continue;
        }

        const filePath = path.parse(file);
        const articleData = await getArticleData(filePath.name);
        if (isArticleVisible(articleData)) {
            articles.push({
                id: articleData.metadata.id,
                title: articleData.metadata.title,
                date: new Date(articleData.metadata.date),
            });
        }
    }

    articles.sort((a, b) => a.date > b.date ? -1 : 1);

    Logger.info(`${articles.length} article(s) found`);
    return articles;
}

function getExecutionTime(startTime: number) {
    const endTime = new Date().getTime();
    const executionTime = ((endTime - startTime) / 1000).toFixed(1);
    return executionTime;
}

polka()
    .get('/', async (req, res) => {
        Logger.info("Request received for index");
        const startTime = new Date().getTime();
        const articles = await getAllArticleMetadata();
        const html = await renderTemplate('index', { title: 'Index', articles });
        servePage(res, html);
        Logger.info(`Served / in ${getExecutionTime(startTime)}s`);
    })
    .get('/*', async (req, res) => {
        const startTime = new Date().getTime();
        const urlParts = req.path.split('/');
        const fileName = urlParts[1];
        const isPreview = urlParts[2] === 'preview';

        const filePath = path.join(BASE_PATH, fileName);
        if (fs.existsSync(filePath)) {
            Logger.info(`Request received for existing file ${fileName}`);
            res.end(fs.readFileSync(filePath));
        } else {
            Logger.info(`Request received for article ${fileName} (preview mode: ${isPreview})`);
            let html = "";
            try {
                html = await renderArticle(fileName, isPreview);
            }
            catch (err) {
                Logger.error('Article not found: ' + req.path);
                return (res.statusCode = 404, res.end("File not found"));
            }
            servePage(res, html);
        }
        Logger.info(`Served ${fileName} in ${getExecutionTime(startTime)}s`);
    })
    .listen(3000, () => {
        Logger.info('Server running on localhost:3000');
    });
