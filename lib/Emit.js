"use strict"

function callHandler (scope, handler, data, stream, next, done) {
    setImmediate(() => {
        try {
            handler.fn(scope, handler.state, handler.args || {}, data, stream, next);
        } catch (err) {
            done(err);
        }
    });
}

module.exports = (scope, sequence, data, stream, done) => {

    let handler = sequence.seq[sequence.first];
    const next = (err, data, _stream) => {

        if (err) {
            return done(err);
        }

        handler = sequence.seq[handler.next];
        if (!handler) {
            return done(null, data, _stream || stream);
        }

        // emit stream errors on flow stream
        if (_stream && _stream.listenerCount('error') < 1) {
            _stream.on('error', (err) => stream.emit('error', err));
        }

        //next(null, data, stream.pipe(scope.flow(handler.E, data)));
        callHandler(scope, handler, data, _stream || stream, next, done);
    }

    stream.on('error', (err) => {console.error(err)});
    callHandler(scope, handler, data, stream, next, done);
}
