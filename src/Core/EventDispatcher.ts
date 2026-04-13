export type EventHandler = (payload: any) => any;

export interface EventDispatcher {
    dispatch<T>(event: string, payload?: T): any;
    register(event: string, handler: EventHandler): boolean;
    unregister(event: string, handler: EventHandler): boolean;
}
