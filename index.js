'use strict'

const Stream = require('./lib/Stream');

// factory
module.exports = (env, adapter) => {

    if (!adapter.read || !adapter.mod) {
        throw new Error('Flow: No "mod" or "read" methods on adapter.');
    }

    const scope = {
        env: env || {},
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

    return scope.flow = (event, options) => {
        return Stream(scope, event, options);
    };
};
