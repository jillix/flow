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

function extendEvent (event, call, args, data) {
    event.flow = call;
    event.data = data;
    event.args = args;
    return event;
}

module.exports = (resolved) => {
    return new Promise((resolve, reject) => {

        const call = resolved[0]
        const sequence = resolved[1];
        const event = resolved[2];
        const args = sequence[1] ? sequence[1].A : undefined;
        let data = resolved[3];
        let index = 0;
        let handler = sequence[0][index];

        const next = (err, chunk, stream) => {

            if (err) {
                return reject(err);
            }

            if (chunk !== undefined && chunk !== null) {
                data = chunk;
            }

            event.output = extendEvent(stream || event.output, call, args, data);

            // emit stream errors on event
            if (event.output.listenerCount('error') < 1) {
                event.output.on('error', (err) => event.emit('error', err));
            }

            handler = sequence[0][++index];
            if (!handler) {
                return resolve(event.output);
            }

            callHandler(event.output, handler, next, reject);
        };

        event.output = extendEvent(event.output, call, args, data);
        callHandler(event.output, handler, next, reject);
    });
};
