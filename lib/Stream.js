"use strict"

const Stream = require("stream");
const Emit = require("./Emit");

module.exports = (scope, sequence_id, data, options, done) => {

    if (typeof options !== "object") {
        options = {};
    }

    // input
    options.write = (chunk, enc, done) => {

        // write to input and handle back pressure
        if (!event.input.write(chunk)) {
            event.cork();
            event.input.once('drain', () => {
                event.uncork()
            });
        }

        done();
    };

    // output
    options.read = (size) => {

        // wait for output source to be set
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
        err && console.error("Flow.event.done:", sequence_id, err);
    };

    // create input stream for handlers
    event.sequence = sequence_id;
    event.input = Stream.PassThrough();
    event.input.on('error', event.error);
    event.input.cork();
    event.on('end', () => {
        event.input.push(null);
    });

    // emit sequence and get out stream
    event.open = (args) => { 

        const sequence = args[0];
        const data  = args[1];
        const stream = args[2];

        event.output = stream;

        // read from ouput
        stream.on('end', () => {event.push(null)});
        stream.on('error', event.error);
        stream.on('data', (chunk) => {
            if (!event.push(chunk)) {
                stream.pause();
            }
        });

        event.done(null, data, event);

        // open input resume emitting data
        event.input.uncork();
        event.resume();
    };

    return event;
};
