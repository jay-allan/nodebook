export class Article {
    private _id: string;
    private _date: Date;
    private _title: string;
    private _published: boolean;
    private _rawContent: string;
    private _parsedContent: string;

    constructor(
        id: string,
        date: Date,
        title: string,
        published: boolean,
        rawContent: string
    ) {
        this._id = id;
        this._date = date;
        this._title = title;
        this._published = published;
        this._rawContent = rawContent;
        this._parsedContent = '';
    }

    get id(): string {
        return this._id;
    }

    get date(): Date {
        return this._date;
    }

    get title(): string {
        return this._title;
    }

    get published(): boolean {
        return this._published;
    }

    get rawContent(): string {
        return this._rawContent;
    }

    get parsedContent(): string {
        return this._parsedContent;
    }

    set parsedContent(value: string) {
        this._parsedContent = value;
    }

    get isVisible(): boolean {
        const currentDate = new Date();
        const articleDate = new Date(this._date);
        const isDateReached = currentDate >= articleDate;
        const isPublished = this._published === true;
        return isDateReached && isPublished;
    }
}

export interface IArticleService {
    getAllArticles(filter: (a: Article) => boolean): Promise<Article[]>;
    getArticleById(articleId: string): Promise<Article>;
}
