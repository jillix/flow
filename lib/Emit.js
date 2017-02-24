"use strict"

function callHandler (scope, handler, data, stream, next, reject) {
    setImmediate(() => {
        try {
            handler.fn(scope, handler.state, handler.args || {}, data, stream, next);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = (scope, sequence, data, stream) => {

    return new Promise((res, rej) => {

        let handler = sequence.seq[sequence.first];
        const seqStream = stream;
        const next = (err, data, _stream) => {

            if (err) {
                return reject(err);
            }

            stream = _stream || stream;
            handler = sequence.seq[handler.next];
            if (!handler) {
                return resolve(data, stream);
            }

            // emit stream errors on flow stream
            if (stream.listenerCount('error') < 1) {
                stream.on('error', (err) => seqStream.emit('error', err));
            }

            callHandler(scope, handler, data, stream, next, reject);
        }

        stream.on('error', (err) => {console.error(err)});
        callHandler(scope, handler, data, stream, next, reject);
    });
};
