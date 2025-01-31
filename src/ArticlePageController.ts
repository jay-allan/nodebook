import { IArticleService } from './Articles/IArticleService';
import { IContentParserService } from './Parsing/IContentParserService';
import { IHttpResponseController } from './IHttpResponseController';
import { ITemplateRenderService } from './Rendering/ITemplateRenderService';
import { Logger } from './Logger';

export class ArticlePageController implements IHttpResponseController {
    private articles: IArticleService;
    private renderer: ITemplateRenderService;
    private parser: IContentParserService;

    constructor(
        articles: IArticleService,
        renderer: ITemplateRenderService,
        parser: IContentParserService
    ) {
        this.articles = articles;
        this.renderer = renderer;
        this.parser = parser;
    }

    public async execute(req: any, res: any) {
        const urlParts = req.path.split('/');
        const articleName = urlParts[1];
        const isPreview = urlParts[2] === 'preview';

        Logger.info(
            `Request received for article ${articleName} (preview mode: ${isPreview})`
        );
        try {
            const html = await this.renderArticle(articleName, isPreview);
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
        } catch (err) {
            Logger.error('Article not found: ' + req.path);
            res.statusCode = 404;
            res.end('File not found');
        }
    }

    private async renderArticle(
        articleName: string,
        previewMode?: boolean
    ): Promise<string> {
        Logger.info('Attempting to render article ' + articleName);
        const article = await this.articles.getArticleById(articleName);
        let articleVisible = false;
        if (!previewMode) {
            articleVisible = article.isVisible;
        }
        if (previewMode || articleVisible) {
            const renderedContent = await this.parser.parse(article.rawContent);
            const html = await this.renderer.render('article', {
                title: article.title,
                subtitle: 'Really, just a test',
                content: renderedContent
            });
            return html;
        } else {
            throw Error('Article not found');
        }
    }
}
