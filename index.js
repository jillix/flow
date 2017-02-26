"use strict"

// Polyfill for setImmediate, extends the global scope.
require("setimmediate");

const Emit = require("./lib/Emit");
const Event = require("./lib/Event");
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

    return scope.flow = (sequence_id, data, options, done) => {

        if (typeof options === "function") {
            done = options;
            options = {};
        }

        const event = Event(scope, sequence_id, data, options, done);

        Sequence(scope, sequence_id, event)
        .then(Emit)
        .then(event.open)
        .catch(event.done);

        return event;
    };
};
