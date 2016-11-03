'use strict'

const EventEmitter = require('events');
const PassThrough = require('stream').PassThrough;
const Event = require('./Event');
const Link = require('./Link');
const cache_ns = 's:';

module.exports = (scope, event_iri, options = {}) => {

    let stream = scope.cache.get(cache_ns + event_iri);
    if (!stream) {

        stream = Stream(scope, event_iri, options.objectMode);
        scope.cache.set(cache_ns + event_iri, stream);

        Event(scope, event_iri, options.session, (error, event) => {

            if (error) {
                return stream._i.emit('error', error);
            }

            Link(scope, event.seq, event.end, event.err, stream);
            stream._i.uncork();
        });
    }

    return stream;
};

function Stream (scope, event_iri, objectMode = true) {

    const stream = new EventEmitter();
    stream.readable = true;
    stream.writable = true;
    stream.objectMode = objectMode;


    stream._i = new PassThrough({objectMode: objectMode});
    stream._i.on('unpipe', () => stream.end());
    stream._i.on('error', error => stream.emit('error', error));
    stream._i.cork();

    stream.write = chunk => {
        stream._chunk = chunk;
        !stream.ended && stream._i.write(chunk);
    };

    stream.end = chunk => {
		scope.cache.del(cache_ns + event_iri);
        stream.ready ? stream._i.end(chunk) : stream.once('ready', () => stream._i.end(chunk));
        stream.ended = true;
	};

    stream.unpipe = dest => stream._i.unpipe(dest);
    stream.pipe = dest => {return stream._i.pipe(dest)};

    return stream;
}
