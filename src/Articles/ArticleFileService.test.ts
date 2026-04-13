import { ArticleFileService } from './ArticleFileService';
import { Article } from './IArticleService';
import * as fsPromise from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';

jest.mock('fs/promises');
jest.mock('gray-matter');
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    join: jest.fn().mockReturnValue('/mock/articles'),
    extname: jest.fn().mockReturnValue('.md'),
}));

class TestableArticleFileService extends ArticleFileService {
    public readArticleFile(articleFileName: string): Promise<string> {
        return super.readArticleFile(articleFileName);
    }
    public parseArticleFileContent(articleFileContent: string): Promise<Article> {
        return super.parseArticleFileContent(articleFileContent);
    }
}

describe('ArticleFileService', () => {
    const mockArticlesDir = '/mock/articles';
    const mockArticleFileExt = '.md';
    const mockArticleFileService = new TestableArticleFileService();

    beforeEach(() => {
        (path.join as jest.Mock).mockReturnValue(mockArticlesDir);
        (path.extname as jest.Mock).mockReturnValue(mockArticleFileExt);
    });

    afterEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    describe('getAllArticles', () => {
        it('should retrieve and filter articles', async () => {
            const mockFiles = ['article1.md', 'article2.md'];
            const mockArticle1 = new Article('1', new Date('2024-06-01'), 'Title 1', true, 'Content 1');
            const mockArticle2 = new Article('2', new Date('2024-01-01'), 'Title 2', true, 'Content 2');

            (fsPromise.readdir as jest.Mock).mockResolvedValue(mockFiles);
            jest.spyOn(mockArticleFileService, 'getArticleById')
                .mockResolvedValueOnce(mockArticle1)
                .mockResolvedValueOnce(mockArticle2);

            const filter = (article: Article) => article.published;
            const articles = await mockArticleFileService.getAllArticles(filter);

            expect(articles).toEqual([mockArticle1, mockArticle2]);
            expect(fsPromise.readdir).toHaveBeenCalledWith(mockArticlesDir);
            expect(mockArticleFileService.getArticleById).toHaveBeenCalledTimes(2);
        });
    });

    describe('getArticleById', () => {
        it('should retrieve an article by ID', async () => {
            const mockArticleId = '1';
            const mockFileContent = '---\nid: 1\ndate: 2023-01-01\ntitle: Title 1\npublished: true\n---\nContent 1';
            const mockArticle = new Article('1', new Date('2023-01-01'), 'Title 1', true, 'Content 1');

            jest.spyOn(mockArticleFileService, 'readArticleFile').mockResolvedValue(mockFileContent);
            (matter as unknown as jest.Mock).mockReturnValue({
                data: { id: '1', date: '2023-01-01', title: 'Title 1', published: true },
                content: 'Content 1'
            });

            const article = await mockArticleFileService.getArticleById(mockArticleId);

            expect(article).toEqual(mockArticle);
            expect(mockArticleFileService.readArticleFile).toHaveBeenCalledWith(
                path.join(mockArticlesDir, mockArticleId) + mockArticleFileExt
            );
        });
    });

    describe('readArticleFile', () => {
        it('should read the content of an article file', async () => {
            const mockArticleFileName = 'article1.md';
            const mockFileContent = 'File content';

            (fsPromise.readFile as jest.Mock).mockResolvedValue(mockFileContent);

            const fileContent = await mockArticleFileService.readArticleFile(mockArticleFileName);

            expect(fileContent).toBe(mockFileContent);
            expect(fsPromise.readFile).toHaveBeenCalledWith(mockArticleFileName, { encoding: 'utf8' });
        });

        it('should throw an error if the file cannot be read', async () => {
            const mockArticleFileName = 'article1.md';

            (fsPromise.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

            await expect(mockArticleFileService.readArticleFile(mockArticleFileName)).rejects.toThrow(
                'Unable to read file ' + mockArticleFileName
            );
        });
    });

    describe('parseArticleFileContent', () => {
        it('should parse the content of an article file', async () => {
            const mockFileContent = '---\nid: 1\ndate: 2023-01-01\ntitle: Title 1\npublished: true\n---\nContent 1';
            const mockArticle = new Article('1', new Date('2023-01-01'), 'Title 1', true, 'Content 1');

            (matter as unknown as jest.Mock).mockReturnValue({
                data: { id: '1', date: '2023-01-01', title: 'Title 1', published: true },
                content: 'Content 1'
            });

            const article = await mockArticleFileService.parseArticleFileContent(mockFileContent);

            expect(article).toEqual(mockArticle);
        });
    });
});
