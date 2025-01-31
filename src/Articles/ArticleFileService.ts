import { IArticleService } from './IArticleService';
import { Article } from './IArticleService';
import { AppSettings } from '../AppSettings';
import * as path from 'path';
import { Logger } from '../Logger';
import * as fsPromise from 'fs/promises';
import matter from 'gray-matter';

export class ArticleFileService implements IArticleService {
    private static ARTICLES_DIR = path.join(AppSettings.BASE_PATH, 'articles');
    private static ARTICLE_FILE_EXT = '.md';

    public async getAllArticles(
        filter: (a: Article) => boolean
    ): Promise<Article[]> {
        Logger.info(
            `Attempting to retrieve list of articles at ${ArticleFileService.ARTICLES_DIR}`
        );

        const files = await fsPromise.readdir(ArticleFileService.ARTICLES_DIR);
        const articles: Article[] = [];
        for (const file of files) {
            if (path.extname(file) !== ArticleFileService.ARTICLE_FILE_EXT) {
                continue;
            }

            const filePath = path.parse(file);
            const article = await this.getArticleById(filePath.name);
            if (filter(article)) {
                articles.push(article);
            }
        }

        articles.sort((a, b) => (a.date > b.date ? -1 : 1));

        Logger.info(`${articles.length} article(s) found`);
        return articles;
    }

    public async getArticleById(articleId: string): Promise<Article> {
        const articleFileName =
            path.join(ArticleFileService.ARTICLES_DIR, articleId) +
            ArticleFileService.ARTICLE_FILE_EXT;
        const fileContent = await this.readArticleFile(articleFileName);
        const article = await this.parseArticleFileContent(fileContent);
        return article;
    }

    private async readArticleFile(articleFileName: string): Promise<string> {
        Logger.info('Attempting to read file ' + articleFileName);
        try {
            const fileContents: string = await fsPromise.readFile(
                articleFileName,
                { encoding: 'utf8' }
            );
            return fileContents;
        } catch (err) {
            throw Error('Unable to read file ' + articleFileName);
        }
    }

    private async parseArticleFileContent(
        articleFileContent: string
    ): Promise<Article> {
        const parsed = matter(articleFileContent);
        return new Article(
            parsed.data.id,
            new Date(parsed.data.date),
            parsed.data.title,
            parsed.data.published,
            parsed.content
        );
    }
}
