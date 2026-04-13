import { EventBus } from '../Core/EventBus';
import { EventHandler } from '../Core/EventDispatcher';
import { Events } from './Events';

export class EventChannel {
    private static _instance: EventBus;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {}

    public static get instance(): EventBus {
        if (!EventChannel._instance) {
            EventChannel._instance = new EventBus();
        }

        return EventChannel._instance;
    }

    public static dispatch<T>(event: Events, payload?: T): string[] {
        return EventChannel.instance.dispatch<T>(event, payload);
    }

    public static register(event: Events, handler: EventHandler): boolean {
        return EventChannel.instance.register(event, handler);
    }
}
