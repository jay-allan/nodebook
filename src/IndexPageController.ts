import { IArticleService } from './Articles/IArticleService';
import { IHttpResponseController } from './IHttpResponseController';
import { ITemplateRenderService } from './Rendering/ITemplateRenderService';

export class IndexPageController implements IHttpResponseController {
    private articles: IArticleService;
    private renderer: ITemplateRenderService;

    constructor(articles: IArticleService, renderer: ITemplateRenderService) {
        this.articles = articles;
        this.renderer = renderer;
    }

    public async execute(req: any, res: any) {
        const articleList = await this.articles.getAllArticles(
            (a) => a.isVisible
        );
        const html = await this.renderer.render('index', {
            title: 'Index',
            articles: articleList
        });
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
    }
}
