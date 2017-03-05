"use strict"

const Stream = require("stream");
const Emit = require("./Emit");

module.exports = (scope, sequence_id, data, options, done) => {

    if (typeof options !== "object") {
        options = {};
    }

    // write to input and handle back pressure
    options.write = (chunk, enc, done) => {
        if (!event.input.write(chunk)) {
            event.cork();
            event.input.once('drain', event.uncork);
        }
        done();
    };

    // wait for output source to be set
    options.read = (size) => {
        if (event.output && event.output.isPaused()) {
            event.output.resume();
        }
    };

    const event = new Stream.Duplex(options);

    // error helper
    event.error = (err) => {event.emit('error', err)};

    // event info
    event.scope = scope;
    event.role = (options && options.role) || scope.env.role;
    event.data = data;

    // event done callback
    event.done = typeof done === "function" ? done : (err) => {
        err && console.error('Flow: Sequence "' + sequence_id + '" has error:', err);
    };

    // create input stream for handlers
    event.sequence = sequence_id;
    event.input = Stream.PassThrough();
    event.input.on('error', event.error);
    event.input.cork();
    event.on('end', () => {event.input.push(null)});
    event.output = event.input;

    // emit sequence and get out stream
    event.open = (event) => { 

        // read from ouput
        event.output.on('end', () => {event.push(null)});
        event.output.on('error', event.error);
        event.output.on('data', (chunk) => {
            if (!event.push(chunk)) {
                event.output.pause();
            }
        });

        event.done(null, event);

        // open input resume emitting data
        event.input.uncork();
        event.resume();
    };

    return event;
};
