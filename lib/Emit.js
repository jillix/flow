"use strict"

function callHandler (event, handler, next, reject) {
    setImmediate(() => {
        try {
            handler[0](event, handler[1], handler[2], next);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = (args) => {
    return new Promise((resolve, reject) => {

        const call = args[0]
        const sequence = args[1];
        const event = args[2];
        let data = args[3];
        let index = 0;
        let handler = sequence[0][index];

        const next = (err, chunk, stream) => {

            if (err) {
                return reject(err);
            }

            if (chunk !== undefined && chunk !== null) {
                data = chunk;
            }

            stream = stream || event.output;
            stream.flow = call;
            stream.args = sequence[1].A;
            stream.data = data;
            event.output = stream;

            // emit stream errors on event
            if (stream.listenerCount('error') < 1) {
                stream.on('error', (err) => event.emit('error', err));
            }

            handler = sequence[0][++index];
            if (!handler) {
                return resolve(stream);
            }

            callHandler(stream, handler, next, reject);
        };

        event.output.data = data;
        callHandler(event.output, handler, next, reject);
    });
};
