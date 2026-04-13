export interface IEventRegistrar {
    register<T>(event: string, handler: (payload: T) => string): boolean;
}

export interface IPlugin {
    initialize(registrar: IEventRegistrar): Promise<void>;
    name: string;
    version: string;
    description: string;
}
