"use strict"

const Stream = require("stream");
const Emit = require("./Emit");

module.exports = (options, done) => {

    options = typeof options === "string" ? {sequence: options} : options;

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
    event.sequence = options.sequence;
    event.role = options.role || null;
    event.base = options.base || "/var/lib/flow";
    event.error = (err) => {event.emit('error', err)};

    // event done callback
    event.done = typeof done === "function" ? done : (err) => {
        // TODO error emit
        err && console.error('Flow: Sequence "' + event.sequence + '" has error:', err);
    };

    // create input stream for handlers
    event.input = Stream.PassThrough();
    event.input.on('error', event.error);
    event.input.cork();
    event.on('end', () => {event.input.push(null)});
    event.output = event.input;

    // read from ouput and open corked input
    event.open = (output) => { 

        output.on('end', () => {event.push(null)});
        output.on('error', event.error);
        output.on('data', (chunk) => {
            if (!event.push(chunk)) {
                output.pause();
            }
        });

        event.done(null, output.data);

        // open input resume emitting data
        event.input.uncork();
        event.resume();
    };

    return event;
};
