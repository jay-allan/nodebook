import { EventBus } from '../Core/EventBus';
import { EventHandler } from '../Core/EventDispatcher';
import { Events } from './Events';

export class EventChannel {
    private static _instance: EventBus;

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

    public static register<T>(
        event: Events,
        handler: EventHandler<T>
    ): boolean {
        return EventChannel.instance.register(event, handler);
    }
}
