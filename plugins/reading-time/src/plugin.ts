import type { IPlugin, IEventRegistrar } from '../../../src/IPlugin';
import type { Article } from '../../../src/Articles/IArticleService';

const AVERAGE_WPM = 200;
const EVENT_RENDER_ARTICLE_HEADER = 'EVENT_RENDER_ARTICLE_HEADER';

class ReadingTimePlugin implements IPlugin {
    name = 'reading-time';
    version = '0.1';
    description = 'Displays estimated reading time for articles';

    async initialize(registrar: IEventRegistrar): Promise<void> {
        registrar.register(EVENT_RENDER_ARTICLE_HEADER, this.handleRenderHeader.bind(this));
    }

    private handleRenderHeader(article: Article): string {
        const text = article.parsedContent.replace(/<[^>]+>/g, ' ');
        const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
        const minutesRaw = words.length / AVERAGE_WPM;
        const label = minutesRaw < 1 ? 'Less than 1 min read' : `${Math.ceil(minutesRaw)} min read`;
        return `<p class="has-text-grey-light is-size-6">${label}</p>`;
    }
}

export default ReadingTimePlugin;
