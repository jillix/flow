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

    const event = args[0];
    const sequence = args[1];
    event.output = event.input;

    return new Promise((resolve, reject) => {

        let handler = sequence[sequence.first];
        const next = (err, data, stream) => {

            if (err) {
                return reject(err);
            }

            event.data = data || event.data;
            event.output = stream || event.output; 

            // emit stream errors on event
            if (event.output.listenerCount('error') < 1) {
                event.output.on('error', (err) => event.emit('error', err));
            }

            handler = sequence[handler.next];
            if (!handler) {
                return resolve(event);
            }

            callHandler(event, handler, next, reject);
        };

        callHandler(event, handler, next, reject);
    });
};
