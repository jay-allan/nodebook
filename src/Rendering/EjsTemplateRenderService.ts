import * as ejs from 'ejs';
import { Logger } from '../Logger';
import * as path from 'path';
import { ITemplateRenderService } from './ITemplateRenderService';
import { AppSettings } from '../AppSettings';

export class EjsTemplateRenderService implements ITemplateRenderService {
    private static TEMPLATE_DIR = path.join(AppSettings.BASE_PATH, 'templates');
    private static TEMPLATE_FILE_EXT = '.ejs';

    public async render(templateName: string, data?: any): Promise<string> {
        const templateFilePath =
            path.join(EjsTemplateRenderService.TEMPLATE_DIR, templateName) +
            EjsTemplateRenderService.TEMPLATE_FILE_EXT;
        Logger.info('Attempting to render template ' + templateFilePath);
        const html: string = await ejs.renderFile(templateFilePath, data);
        return html;
    }
}
