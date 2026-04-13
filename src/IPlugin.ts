export interface IEventRegistrar {
    register(event: string, handler: (payload: any) => any): boolean;
}

export interface IPlugin {
    initialize(registrar: IEventRegistrar): Promise<void>;
    name: string;
    version: string;
    description: string;
}
