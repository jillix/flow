"use strict"

// Polyfill for setImmediate, extends the global scope.
require("setimmediate");

const Stream = require("./lib/Stream");
const Sequence = require("./lib/Sequence");
const Emit = require("./lib/Emit");

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

    return scope.flow = (sequence_id, data, options, next) => {

        const io_stream = Stream(options, sequence_id); 

        Sequence(scope, sequence_id, env.role, data)
        .then(Emit)
        .then(io_stream.setup)
        .then(next)
        .catch(io_stream.error);

        return io_stream; 
    };
};
