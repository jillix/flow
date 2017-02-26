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

module.exports = (args) => {

    const event = args[0];
    const sequence = args[1];

    return new Promise((resolve, reject) => {

        let handler = sequence[sequence.first];
        let stream = event.input;
        const next = (err, data, _stream) => {

            if (err) {
                return reject(err);
            }

            stream = _stream || stream;
            handler = sequence[handler.next];
            if (!handler) {
                return resolve([data, stream]);
            }

            // emit stream errors on event
            if (stream.listenerCount('error') < 1) {
                stream.on('error', (err) => event.emit('error', err));
            }

            callHandler(event.scope, handler, data, stream, next, reject);
        };

        callHandler(event.scope, handler, event.data, stream, next, reject);
    });
};
