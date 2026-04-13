/* eslint-disable @typescript-eslint/no-non-null-assertion */
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

    register(event: string, handler: EventHandler): boolean {
        let handlers: Array<EventHandler>;
        if (!this._eventMap.has(event)) {
            handlers = new Array<EventHandler>();
            this._eventMap.set(event, handlers);
        } else {
            handlers = this._eventMap.get(event)!;
        }

        let exists = false;
        handlers.some((element) => {
            if (element === handler) {
                exists = true;
                return exists;
            }
        });

        if (!exists) {
            handlers.push(handler);
        }

        return !exists;
    }

    unregister(event: string, handler: EventHandler): boolean {
        if (!this._eventMap.has(event)) {
            return false;
        }

        const handlers = this._eventMap.get(event)!;
        let found = false;
        for (let i = 0; i < handlers.length; i++) {
            if (handlers[i] === handler) {
                found = true;
                handlers.splice(i, 1);
                break;
            }
        }

        return found;
    }
}
