const EE = require('events');

module.exports = (event_name, args, scope, node) => {

    const Event = new EE();
    const cache_key = 'l:' + event_name;

    Event.handlers = {};
    Event.link = (handler) => {
        Event.handlers[handler.id] = handler;
        return Event;
    };

    Event.onEnd = (event) => {
        Event.e = event;
        return Event;
    };

    Event.onError = (event) => {
        Event.r = event;
        return Event;
    };

    // get cached module
    let cached_event = scope.cache.get(cache_key);
    if (cached_event) {
        process.nextTick(() => {
            Event.emit('ready', cached_event);
        });
        return Event;
    }

    if (cached_event === null) {
        return Event;
    }

    scope.cache.set(cache_key, null);

    return Event;
};
