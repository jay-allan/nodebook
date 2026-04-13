export type EventHandler<T = unknown> = (payload: T) => string;

export interface EventDispatcher {
    dispatch<T>(event: string, payload?: T): string[];
    register<T>(event: string, handler: EventHandler<T>): boolean;
    unregister<T>(event: string, handler: EventHandler<T>): boolean;
}
