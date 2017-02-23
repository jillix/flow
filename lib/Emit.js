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
    const seqStream = stream;
    const next = (err, data, _stream) => {

        if (err) {
            return done(err);
        }

        stream = _stream || stream;
        handler = sequence.seq[handler.next];
        if (!handler) {
            return done(null, data, stream);
        }

        // emit stream errors on flow stream
        if (stream.listenerCount('error') < 1) {
            stream.on('error', (err) => seqStream.emit('error', err));
        }

        //next(null, data, stream.pipe(scope.flow(handler.E, data)));
        callHandler(scope, handler, data, stream, next, done);
    }

    stream.on('error', (err) => {console.error(err)});
    callHandler(scope, handler, data, stream, next, done);
};
