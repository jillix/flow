"use strict"

// Polyfill for setImmediate, extends the global scope.
require("setimmediate");

const Stream = require("./lib/Stream");
const Sequence = require("./lib/Sequence");

module.exports = (env = {}, adapter) => {

    if (!adapter.cache || !adapter.seq || !adapter.fn) {
        throw new Error("Flow: Invalid adapter.");
    }

    const scope = {
        env: env,
        fn: adapter.fn,
        seq: adapter.seq,
        cache: adapter.cache,
        reset: () => {

            if (typeof adapter.reset === "function") {
                adapter.reset();
            }

            adapter.cache.reset();
        }
    };

    return scope.flow = (sequence, data, options) => {
        return Sequence(
            scope,
            sequence,
            data,
            Stream(options),
            (options && options.role) || env.role
        );
    };
};
