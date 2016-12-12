"use strict"

const EventEmitter = require("events");
const PassThrough = require("stream").PassThrough;
const Sequence = require("./Sequence");
const Link = require("./Link");
const cache_ns = "s:";

module.exports = (scope, sequence_id, options = {}) => {

    let role = (options.session ? options.session.role : null) || scope.env.role;
    let stream = scope.cache.get(cache_ns + sequence_id);
    if (!stream) {
        stream = Stream(scope, sequence_id, options.objectMode);
        scope.cache.set(cache_ns + sequence_id, stream);
        Sequence(scope, sequence_id, role, stream);
    }

    return stream;
};

function Stream (scope, sequence_id, objectMode = true) {

    const stream = new EventEmitter();
    stream.readable = true;
    stream.writable = true;
    stream.objectMode = objectMode;
    stream.id = sequence_id;

    stream._i = new PassThrough({objectMode: objectMode});
    stream._i.on("unpipe", () => stream.end());
    stream._i.on("error", error => stream.emit("error", error));
    stream._i.cork();

    stream.write = chunk => {
        stream._chunk = chunk;
        !stream.ended && stream._i.write(chunk);
    };

    stream.end = chunk => {
		scope.cache.del(cache_ns + sequence_id);
        stream.ready ? stream._i.end(chunk) : stream.once("ready", () => stream._i.end(chunk));
        stream.ended = true;
        stream.readable = false;
        stream.writable = false;
	};

    stream.cork = () => stream._i.cork();
    stream.uncork = () => stream._i.uncork();

    stream.unpipe = dest => stream._i.unpipe(dest);
    stream.pipe = dest => {return stream._i.pipe(dest)};

    return stream;
}
