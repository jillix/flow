"use strict"

const Stream = require("stream");
const Emit = require("./Emit");

module.exports = (options, sequence_id) => {

    const io_stream = new Stream.Duplex({

        // input
        write(chunk, enc, done) {

            // write to input and handle back pressure
            if (!io_stream.input.write(chunk)) {
                io_stream.cork();
                io_stream.input.once('drain', () => {
                    io_stream.uncork()
                });
            }

            done();
        },

        // output
        read(size) {

            // wait for output source to be set
            if (io_stream.output && io_stream.output.isPaused()) {
                io_stream.output.resume();
            }
        } 
    });

    // error helper
    io_stream.error = (err) => {
        io_stream.emit('error', err);
    };

    // create input stream for handlers
    io_stream.id = sequence_id;
    io_stream.input = Stream.PassThrough();
    io_stream.input.on('error', io_stream.error);
    io_stream.input.cork();
    io_stream.on('end', () => {
        io_stream.input.push(null);
    });

    // setup default error handling
    setImmediate(() => {
        if (!io_stream.listenerCount('error')) {
            io_stream.on('error', (err) => {console.error(err)});
        }
    });

    // emit sequence and get out stream
    io_stream.setup = (scope, sequence, data, next) => { 
        console.log(arguments);
        /*Emit(scope, sequence, data, io_stream.input, (err, data, stream) => {

            io_stream.output = stream;

            if (typeof next === "function") {
                next(err, data, io_stream);
            }

            if (err) {

                // error sequence
                if (sequence.err) {
                    scope.flow(sequence.err, err);
                }

                return io_stream.error(err);
            }

            // read from ouput
            stream.on('end', () => {io_stream.push(null)});
            stream.on('error', io_stream.error);
            stream.on('data', (chunk) => {
                if (!io_stream.push(chunk)) {
                    stream.pause();
                }
            });

            // open input resume emitting data
            io_stream.input.uncork();
            io_stream.resume();
        });*/
    };

    return io_stream;
};
