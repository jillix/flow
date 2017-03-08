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

    function call (options, data, done) {

        const event = Event(options, done);

        Sequence(adapter, call, event, data)
        .then(Emit)
        .then(event.open)
        .catch(event.done);

        return event;
    };

    return call;
};
