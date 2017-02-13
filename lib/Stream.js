"use strict"

const EventEmitter = require("events");
const PassThrough = require("stream").PassThrough;

module.exports = (options) => {

    const stream = new EventEmitter();

    if (!options) {
        return stream;
    }

    stream.readable = true;
    stream.writable = true;
    stream.options = options; 

    // create input stream
    stream._i = new PassThrough(options);
    stream._i.cork();

    // create output stream
    stream._o = new PassThrough(options);
    stream._o.on("unpipe", () => stream.end());
    stream._o.on('data', (chunk) => stream.emit('data', chunk));
	stream._o.once('end', () => stream.emit('end'));

    stream.write = chunk => {
        stream._chunk = chunk;
        !stream.ended && stream._i.write(chunk);
    };

    stream.end = chunk => {
        stream.ready ? stream._i.end(chunk) : stream.once("ready", () => {
            stream._i.end(chunk);
        });
        stream.ended = true;
        stream.readable = false;
        stream.writable = false;
	};

    // input
    stream.cork = () => stream._i.cork();
    stream.uncork = () => stream._i.uncork();

    // output
    stream.unpipe = dest => stream._o.unpipe(dest);
    stream.pipe = dest => {return stream._o.pipe(dest)};

    return stream;
};
