import ReadingTimePlugin from './plugin';

function makeRegistrar(onRegister?: (event: string, handler: (payload: any) => any) => void) {
    let captured: ((payload: any) => any) | null = null;
    return {
        registrar: {
            register: (event: string, handler: (payload: any) => any) => {
                captured = handler;
                onRegister?.(event, handler);
                return true;
            }
        },
        getHandler: () => captured
    };
}

describe('ReadingTimePlugin', () => {
    describe('metadata', () => {
        it('has a name', () => {
            const plugin = new ReadingTimePlugin();
            expect(plugin.name).toBe('reading-time');
        });

        it('has a version', () => {
            const plugin = new ReadingTimePlugin();
            expect(plugin.version).toBe('0.1');
        });

        it('has a description', () => {
            const plugin = new ReadingTimePlugin();
            expect(plugin.description).toBeTruthy();
        });
    });

    describe('initialize', () => {
        it('registers a handler for the article header event', async () => {
            const plugin = new ReadingTimePlugin();
            const registeredEvents: string[] = [];
            const { registrar } = makeRegistrar((event) => registeredEvents.push(event));

            await plugin.initialize(registrar);

            expect(registeredEvents).toContain('EVENT_RENDER_ARTICLE_HEADER');
        });
    });

    describe('reading time calculation', () => {
        async function getHandler(plugin: ReadingTimePlugin) {
            const { registrar, getHandler } = makeRegistrar();
            await plugin.initialize(registrar);
            return getHandler()!;
        }

        it('returns "Less than 1 min read" for very short articles', async () => {
            const handler = await getHandler(new ReadingTimePlugin());
            const result = handler({ parsedContent: '<p>Short article.</p>' });
            expect(result).toContain('Less than 1 min read');
        });

        it('calculates 1 min read for ~200 words', async () => {
            const handler = await getHandler(new ReadingTimePlugin());
            const content = '<p>' + 'word '.repeat(200) + '</p>';
            const result = handler({ parsedContent: content });
            expect(result).toContain('1 min read');
        });

        it('calculates 2 min read for ~400 words', async () => {
            const handler = await getHandler(new ReadingTimePlugin());
            const content = '<p>' + 'word '.repeat(400) + '</p>';
            const result = handler({ parsedContent: content });
            expect(result).toContain('2 min read');
        });

        it('strips HTML tags before counting words', async () => {
            const handler = await getHandler(new ReadingTimePlugin());
            // 200 words wrapped in many tags — should still read as 1 min
            const words = Array.from({ length: 200 }, (_, i) => `<span>word${i}</span>`).join('');
            const result = handler({ parsedContent: words });
            expect(result).toContain('1 min read');
        });

        it('returns an HTML string', async () => {
            const handler = await getHandler(new ReadingTimePlugin());
            const result = handler({ parsedContent: '<p>Hello world.</p>' });
            expect(result).toMatch(/^<.*>$/s);
        });
    });
});
