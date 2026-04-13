export interface ITemplateRenderService {
    render(
        templateName: string,
        data?: Record<string, unknown>
    ): Promise<string>;
}
