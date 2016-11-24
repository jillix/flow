'use strict'

const Transform = require('stream').Transform;

module.exports = (scope, sequence, onEnd, onError, stream) => {

    // pipe handler streams into sequence
    stream._s = {};
    for(let handler in sequence) {
        join(scope, stream, {
            from: handler,
            to: sequence[handler].N,
            A: sequence[handler],
            B: sequence[sequence[handler].N]
        });
    };

    let output = (stream._o || stream._i);

    // end event
    // TODO does an end event make sense?
    if (onEnd) {
        stream._ee = scope.flow(onEnd);
        output.on('end', () => {
            stream._ee.end(1);
            stream._re && stream._re.end();
        });
    }

    // error events
    if (onError) {
        stream._re = scope.flow(onError);
        stream.on('error', error => {
            error.data = stream._chunk;
            stream._re.write(error);
        });

    // log error and prevent process crash
    } else if (stream.listenerCount('error') < 1) {
        stream.on('error', error => console.error(error));
    }

    output.on('data', chunk => stream.emit('data', chunk));
	output.once('end', () => stream.emit('end'));

    stream.ready = true;
    stream.emit('ready');
}

function join (scope, stream, config) {

    let A;
    let B;

    // create or get stream A
    if (!stream._s[config.from]) {
        A = stream._s[config.from] = createHandler(scope, stream, config.A);
        (A.listenerCount('error') > 1) && A.on('error', error => stream.emit('error', error));
    } else {
        A = stream._s[config.from];
    }

    // pipe stream to first stream in sequence
    if (A.writable && config.A.F) {
        stream.pipe(A);
    }

    if (config.to) {

        // create or get stream B
        if (!stream._s[config.to]) {
            B = stream._s[config.to] = createHandler(scope, stream, config.B);
            (B.listenerCount('error') > 1) && B.on('error', error => stream.emit('error', error));
        } else {
            B = stream._s[config.to];
        }

        // pipe A to B
        if (A.readable && B.writable) {
            A.pipe(B);
        }

    // set last stream as stream output
    } else {
        stream._o = A;
    }
}

function createHandler (scope, stream, handler) {

    let handler_args;
    let handler_stream;

    try {
        handler_args = handler.A ? JSON.parse(handler.A) : {};
    } catch (error) {
        return stream.emit('error', error);
    }

    if (handler.D) {
        handler_stream = transform(scope, handler_args, stream.objectMode, handler);
    }

    if (handler.S) {
        if (!(handler_stream = handler.S(scope, handler.I, handler_args, stream))) {
            stream.emit('error', new Error('Link.stream: Empty return.'));
        }
    }

    if (handler.E) {
        handler_stream = scope.flow(handler.E, handler_args);
    }

    return handler_stream;
}

function transform (scope, args, objectMode, handler) {

    const stream = Transform({
        objectMode: objectMode,
        transform: (chunk, enc, next) => {

            // once handler
            if (stream.called && handler.once) {
                return next(null, chunk);
            }

            stream.called = true;

            try {
                handler.D(scope, handler.I, args, chunk, next, stream, enc);
            } catch (err) {
                next(err);
            }
        }
    });

    return stream;
}
