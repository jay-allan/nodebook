import { AppSettings } from './AppSettings';
import { Logger } from './Logger';

import { IContentParserService } from './Parsing/IContentParserService';
import { MarkdownParserService } from './Parsing/MarkdownParserService';

import { IArticleService } from './Articles/IArticleService';
import { ArticleFileService } from './Articles/ArticleFileService';

import { ITemplateRenderService } from './Rendering/ITemplateRenderService';
import { EjsTemplateRenderService } from './Rendering/EjsTemplateRenderService';

import { IndexPageController } from './IndexPageController';
import { ArticlePageController } from './ArticlePageController';

import polka from 'polka';
import * as fs from 'fs';
import * as path from 'path';

const parser: IContentParserService = new MarkdownParserService();
const articles: IArticleService = new ArticleFileService();
const renderer: ITemplateRenderService = new EjsTemplateRenderService();
const indexController: IndexPageController = new IndexPageController(
    articles,
    renderer
);
const articleController: ArticlePageController = new ArticlePageController(
    articles,
    renderer,
    parser
);

function getExecutionTime(startTime: number) {
    const endTime = new Date().getTime();
    const executionTime = ((endTime - startTime) / 1000).toFixed(1);
    return executionTime;
}

polka()
    .get('/', async (req, res) => {
        Logger.info('Request received for index');
        const startTime = new Date().getTime();
        await indexController.execute(req, res);
        Logger.info(`Served / in ${getExecutionTime(startTime)}s`);
    })
    .get('/*', async (req, res) => {
        const startTime = new Date().getTime();
        const filePath = path.join(AppSettings.BASE_PATH, req.path);
        if (fs.existsSync(filePath)) {
            Logger.info(`Request received for existing file ${filePath}`);
            res.end(fs.readFileSync(filePath));
        } else {
            await articleController.execute(req, res);
        }
        Logger.info(`Served ${filePath} in ${getExecutionTime(startTime)}s`);
    })
    .listen(AppSettings.PORT, () => {
        Logger.info(`Server running on localhost:${AppSettings.PORT}`);
    });
