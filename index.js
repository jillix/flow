"use strict"

// Polyfill for setImmediate, extends the global scope.
require("setimmediate");

const Emit = require("./lib/Emit");
const Event = require("./lib/Event");
const Sequence = require("./lib/Sequence");

module.exports = (adapter) => {

    if (!adapter.cache || !adapter.seq || !adapter.fn) {
        throw new Error("Flow: Invalid adapter.");
    }

    const call = (options, data, done) => {
        const event = Event(call, options, done);

        Sequence(adapter, event)
        .then(Emit(call, event, data))
        .then(event.open)
        .catch(event.done);

        return event;
    };

    return call;
};
