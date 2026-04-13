import { EventBus } from './EventBus';

class TestableEventBus extends EventBus {
    public getCallbacks(event: string): Array<Function> {
        let callbacks: Array<Function> = this._eventMap.get(event) ?? [];
        return callbacks;
    }
}

test('Callback register returns success', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    let success = false;

    success = eb.register(event, () => {});
    expect(success).toBe(true);
});

test('Callback dispatches correctly', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    let success = false;
    const fn = () => {
        success = true;
    };

    eb.register(event, fn);
    eb.dispatch(event);

    expect(success).toBe(true);
});

test('Callbacks dispatch in registered order', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    let success = false;
    const fn1 = () => {
        success = false;
    };
    const fn2 = () => {
        success = true;
    };

    eb.register(event, fn1);
    eb.register(event, fn2);
    eb.dispatch(event);

    expect(success).toBe(true);
});

test('Unregistred callbacks do not dispatch', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    let success = false;
    const fn = () => {
        success = true;
    };

    eb.register(event, fn);
    eb.unregister(event, fn);
    eb.dispatch(event);

    expect(success).toBe(false);
});

test('Dispatch does not affect other events', () => {
    const event1 = 'TEST1';
    const event2 = 'TEST2';
    const eb = new TestableEventBus();
    let success = false;
    const fn1 = () => {
        success = true;
    };
    const fn2 = () => {
        success = false;
    };

    eb.register(event1, fn1);
    eb.register(event2, fn2);
    eb.dispatch(event1);

    expect(success).toBe(true);
});

test('Callback registers correctly', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    const fn = () => {};

    eb.register(event, fn);

    const callbacks = eb.getCallbacks(event);
    expect(callbacks).toContain(fn);
});

test('Same Callback cannot register twice', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    const fn = () => {};

    eb.register(event, fn);
    eb.register(event, fn);

    const callbacks = eb.getCallbacks(event);
    expect(callbacks.length).toBe(1);
});

test('Multiple Callbacks can be added for same event', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    const fn1 = () => {};
    const fn2 = () => {};

    eb.register(event, fn1);
    eb.register(event, fn2);

    const callbacks = eb.getCallbacks(event);
    expect(callbacks.length).toBe(2);
});

test('Same callback can be registered for multiple events', () => {
    const event1 = 'TEST1';
    const event2 = 'TEST2';
    const eb = new TestableEventBus();
    const fn = () => {};

    eb.register(event1, fn);
    eb.register(event2, fn);

    const callbacks1 = eb.getCallbacks(event1);
    expect(callbacks1).toContain(fn);
    const callbacks2 = eb.getCallbacks(event1);
    expect(callbacks2).toContain(fn);
});

test('Callback unregister returns success', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    const fn = () => {};

    eb.register(event, fn);
    const success = eb.unregister(event, fn);
    expect(success).toBe(true);
});

test('Callback unregisters correctly', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    const fn = () => {};

    eb.register(event, fn);
    eb.unregister(event, fn);

    const callbacks = eb.getCallbacks(event);
    expect(callbacks.length).toBe(0);
});

test('Callback unregister does not affect other callbacks registered for event', () => {
    const event = 'TEST';
    const eb = new TestableEventBus();
    const fn1 = () => {};
    const fn2 = () => {};

    eb.register(event, fn1);
    eb.register(event, fn2);
    eb.unregister(event, fn1);

    const callbacks = eb.getCallbacks(event);
    expect(callbacks.length).toBe(1);
});
