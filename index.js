'use strict'

const Stream = require('./lib/Stream');

// factory
module.exports = (adapter) => {

    if (!adapter.read || !adapter.mod) {
        throw new Error('Flow: No Module or MIC adapter found.');
    }

    const scope = {
        env: adapter.env,
        mod: adapter.mod,
        read: adapter.read,

        // cache must have "get", "set" and "reset" methods
        cache: adapter.cache,

        // reset cache
        reset: () => {

            if (typeof adapter.reset === 'function') {
                adapter.reset();
            }

            adapter.cache.reset();
        }
    };

    return scope.flow = (event, args) => {
        return Stream(scope, event, args)
    };
};
