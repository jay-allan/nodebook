export interface ITemplateRenderService {
    render(templateName: string, data?: any): Promise<string>;
}
