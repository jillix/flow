const EE = require('events');

module.exports = (event_name, args, scope, node) => {

    const obs = new EE();
    const cache_key = 'l:' + event_name;

    obs.link = (sequence) => {
        // if sequence is ready
        // pipe to node._i (input)
        return obs;
    };
    obs.onEnd = (event) => {
        // emit args on node end
        return obs;
    };
    obs.onError = (event) => {
        // pipe node errors to event
        return obs;
    };

    // get cached module
    let cached_event = scope.cache.get(cache_key);
    if (cached_event) {
        process.nextTick(() => {
            obs.emit('ready', cached_event);
        });
        return obs;
    }

    if (cached_event === null) {
        return obs;
    }

    scope.cache.set(cache_key, null);

    return obs;
};
