"use strict"

const EventEmitter = require("events");
const PassThrough = require("stream").PassThrough;
const Sequence = require("./Sequence");

module.exports = (scope, sequence_id, options = {}) => {

    let role = (options.session ? options.session.role : scope.env.role) || scope.env.role;
    let stream = Stream(scope, sequence_id, options.objectMode);
    Sequence(scope, sequence_id, role, stream);

    return stream;
};

function Stream (scope, sequence_id, objectMode = true) {

    const stream = new EventEmitter();
    stream.readable = true;
    stream.writable = true;
    stream.objectMode = objectMode;
    stream.id = sequence_id;

    // create input stream
    stream._i = new PassThrough({objectMode: objectMode});
    stream._i.cork();

    // create output stream
    stream._o = new PassThrough({objectMode: objectMode});
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
}
