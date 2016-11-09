"use strict"

// Polyfill for setImmediate, extends the global scope.
require("setimmediate");

const Stream = require("./lib/Stream");

module.exports = (env, adapter) => {

    if (!adapter.cache || !adapter.read || !adapter.mod) {
        throw new Error("Flow: Invalid adapter.");
    }

    const scope = {
        env: env || {},
        mod: adapter.mod,
        read: adapter.read,
        cache: adapter.cache,
        reset: () => {

            if (typeof adapter.reset === "function") {
                adapter.reset();
            }

            adapter.cache.reset();
        }
    };

    return scope.flow = (event, options) => {
        return Stream(scope, event, options);
    };
};
