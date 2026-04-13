import { EventDispatcher, EventHandler } from './EventDispatcher';

export class EventBus implements EventDispatcher {
    protected readonly _eventMap: Map<string, Array<EventHandler>>;

    public constructor() {
        this._eventMap = new Map<string, Array<EventHandler>>();
    }

    dispatch<T>(event: string, payload?: T): string[] {
        const results: string[] = [];
        if (!this._eventMap.has(event)) {
            return [];
        }

        const handlers: Array<EventHandler> = this._eventMap.get(event)!;
        handlers.forEach((callback) => {
            results.push(callback(payload));
        });
        return results;
    }

    register<T>(event: string, handler: EventHandler<T>): boolean {
        let handlers: Array<EventHandler>;
        if (!this._eventMap.has(event)) {
            handlers = new Array<EventHandler>();
            this._eventMap.set(event, handlers);
        } else {
            handlers = this._eventMap.get(event)!;
        }

        const h = handler as EventHandler;
        let exists = false;
        handlers.some((element) => {
            if (element === h) {
                exists = true;
                return exists;
            }
        });

        if (!exists) {
            handlers.push(h);
        }

        return !exists;
    }

    unregister<T>(event: string, handler: EventHandler<T>): boolean {
        if (!this._eventMap.has(event)) {
            return false;
        }

        const handlers = this._eventMap.get(event)!;
        const h = handler as EventHandler;
        let found = false;
        for (let i = 0; i < handlers.length; i++) {
            if (handlers[i] === h) {
                found = true;
                handlers.splice(i, 1);
                break;
            }
        }

        return found;
    }
}
