'use strict'

const Transform = require('stream').Transform;

module.exports = (scope, event, args, stream) => {

    stream._s = {};

    // pipe handler streams into sequence
    console.log('\n', event.iri, '\n-----------------------------------------------------');
    for(let handler in event.handlers) {
        join(scope, stream, args, handler, event.handlers, event.iri);
    };

    let output = (stream._o || stream._i);

    // end event
    if (event.e) {
        stream._ee = scope.flow(event.e, args);
        output.on('end', () => {

            stream._ee.end();

            // end also error event
            if (stream._re) {
                stream._re.end();
            }
        });
    }

    // error events
    if (event.r) {
        stream._re = scope.flow(event.r, args);
        stream.on('error', error => stream._re.write(error));

    // log error and prevent process crash
    } else if (stream.listenerCount('error') < 1) {
        stream.on('error', error => console.error(error));
    }

    output.on('data', chunk => stream.emit('data', chunk));
	output.once('end', () => {
		scope.cache.del('s:' + stream.event);
		stream.emit('end');
	});

    stream.ready = true;
    stream.emit('ready');
    stream._i.uncork();
}

function join (scope, stream, args, handler, handlers, iri) {

    let A = handler;
    let B = handlers[handler].next;
    let _A = handler;
    let _B = handlers[handler].next;

    // create or get stream A
    if (!stream._s[A]) {
        A = stream._s[A] = createHandler(scope, stream, args, handlers[A]);
        A.on('error', error => stream.emit('error', error));
    } else {
        A = stream._s[A];
    }

    // pipe stream to first stream in sequence
    if (A.writable && handlers[handler].first) {
        console.log('Pipe:', iri, 'to', _A);
        stream.pipe(A);
    }

    if (B) {

        // create or get stream B
        if (!stream._s[B]) {
            B = stream._s[B] || (stream._s[B] = createHandler(scope, stream, args, handlers[B]));
            B.on('error', error => stream.emit('error', error));
        } else {
            B = stream._s[B];
        }

        // pipe A to B
        if (A.readable && B.writable) {
            console.log('Pipe:', _A, 'to', _B);
            A.pipe(B);
        }

    // set last stream as stream output
    } else {
        console.log('Output:', _A);
        stream._o = A;
    }
}

function createHandler (scope, stream, args, handler) {
 
    // TODO this will break module functionality! Update module arguments.
    let handler_args = Object.assign({}, handler.args, args);
    let handler_stream;

    if (handler.data) {
        handler_stream = transform(handler_args, handler);
    }

    if (handler.stream) {
        if (!(handler_stream = handler.stream.call(handler.instance, handler_args, stream))) {
            stream.emit('error', new Error('Link.stream: Empty return.'));
        }
    }

    if (handler.emit) {
        handler_stream = scope.flow(handler.emit, handler_args);
    }

    return handler_stream;
}

function transform (args, handler) {
    return Transform({
        objectMode: typeof args.objectMode !== 'undefined' ? !!args.objectMode : true,
        transform: (chunk, enc, next) => {

            // once handler
            if (stream.called && handler.once) {
                return next(null, chunk);
            }

            stream.called = true;

            handler.data.call(handler.instance, args, chunk, next, enc);
        }
    });
}
