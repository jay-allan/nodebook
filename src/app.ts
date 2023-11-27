import { Logger } from './Logger';
import polka from 'polka';
import { marked } from 'marked';
import * as fsPromise from 'fs/promises';
import * as ejs from 'ejs';

async function readArticle(filePath: string): Promise<string> {
    try {
        const fileContents: string =
            await fsPromise.readFile(filePath, { encoding: 'utf8' });
        return fileContents;
    }
    catch (err) {
        throw Error("Unable to read file " + filePath);
    }
}

polka()
    .get('/articles/*', async (req, res) => {
        let articleContent = "";
        try {
            articleContent = await readArticle(req.path.substring(1) + '.md');
        }
        catch (err) {
            Logger.error('File not found: ' + req.path);
            return (res.statusCode = 404, res.end("File not found"));
        }

        articleContent = marked.parse(articleContent);

        const html = await ejs.renderFile('templates/article.ejs',
            { title: 'Test', subtitle: 'Really, just a test', content: articleContent });

        res.setHeader('Content-Type', 'text/html');
        res.end(html);
        Logger.info('Served ' + req.path);
    })
    .listen(3000, () => {
        Logger.info('Server running on localhost:3000');
    });
