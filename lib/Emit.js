"use strict"

function callHandler (event, handler, next, reject) {
    setImmediate(() => {
        try {
            handler.fn(event, handler.state, handler.args, next);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = (args) => {

    const call = args[0]
    const sequence = args[1];
    const event = args[2];
    let data = args[3];

    return new Promise((resolve, reject) => {

        let handler = sequence[sequence.first];
        const next = (err, chunk, stream) => {

            if (err) {
                return reject(err);
            }

            if (chunk !== undefined && chunk !== null) {
                data = chunk;
            }

            if (stream) {
                event.output = stream;
            } else {
                stream = event.output;
            }

            stream.flow = call;
            stream.args = sequence.args;
            stream.data = data;

            // emit stream errors on event
            if (stream.listenerCount('error') < 1) {
                stream.on('error', (err) => event.emit('error', err));
            }

            handler = sequence[handler.next];
            if (!handler) {
                return resolve(event.output);
            }

            callHandler(stream, handler, next, reject);
        };

        callHandler(event, handler, next, reject);
    });
};
