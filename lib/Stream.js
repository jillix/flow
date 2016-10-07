const EventEmitter = require('events');
const PassThrough = require('stream').PassThrough;
const Event = require('./Event');
const Link = require('./Link');
const cache_ns = 's:';

module.exports = (scope, event, args = {}) => {

    let stream = scope.cache.get(cache_ns + event);
    if (stream) {
        return stream;
    } 

    stream = Stream(scope, event, args);
    Event(scope, event, args, (error, event) => {

        if (error) {
            return stream.emit('error', error);
        }

        Link(scope, event, args, stream);
        stream._i.uncork();
    });

    scope.cache.set(cache_ns + event, stream);
    return stream;
};

function Stream (scope, event, args) {

    const stream = new EventEmitter();
    stream.readable = true;
    stream.writable = true;
    stream.objectMode = args.objectMode !== undefined ? !!args.objectMode : true;
    stream._i = new PassThrough({objectMode: stream.objectMode});
    stream._i.on('error', error => stream.emit('error', error));
    stream._i.cork();

    stream.write = chunk => stream._i.write(chunk);
    stream.end = chunk => {
		scope.cache.del(cache_ns + event);

        if (!stream.ready) {
            stream.once('ready', () => stream._i.end(chunk));
        } else {
		    stream._i.end(chunk);
        }
	};

	// TODO find a better solution for substream that are closed (duplex, writable)
    stream.on('unpipe', () => stream.end());
    stream.unpipe = dest => stream._i.unpipe(dest);
    stream.pipe = dest => {

        if (stream.ready) {
            return stream._i.pipe(dest);
        }

        stream.once('ready', () => stream._i.pipe(dest));
        return dest;
    };

    return stream;
}
