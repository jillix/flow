"use strict"

module.exports = (adapter) => {
    const call = (event, input) => {

        event = typeof event === "string" ? event = {sequence: event} : event;
        event.emit = call;

        let parsed_sequence = adapter.cache.get(event.sequence);
        if (!parsed_sequence) {
            parsed_sequence = adapter.seq(event.sequence, event.role)
            .then(checkRoleAccess(event.role))
            .then(parse(adapter, event.role))
            .then((parsed) => {
                adapter.cache.set(event.sequence, parsed);
                return parsed;
            });
        } else {
            parsed_sequence = Promise.resolve(parsed_sequence).then(checkRoleAccess(event.role));
        }

        return parsed_sequence.then((sequence) => {
            event.args = sequence[1].A;
            let rt_sequence = callHandler(event, sequence[0][0][0], sequence[0][0][1], sequence[0][0][2], input);
            for (let i = 1; i < sequence[0].length; ++i) {
                rt_sequence.then((output) => {
                    if (output !== undefined) {
                        input = output;
                    }
                    callHandler(event, sequence[0][i][0], sequence[0][i][1], sequence[0][i][2], input);
                });
            };

            if (sequence[1] && sequence[1].E) {
                handler_p.catch((err) => {
                    err.data = input;
                    flow.emit(sequence[1].E, err);
                });
            }

            return rt_sequence;

        }).catch((err) => {
            if (typeof adapter.error === "function") {
                adapter.error(event.sequence, err);
            }
            return Promise.reject(err);
        });
    };

    return call;
};

function checkRoleAccess (role) {
    return (sequence) => {
        if (sequence[1] && sequence[1].R && !sequence[1].R[role]) {
            return Promise.reject(new Error("Sorry, no access."));
        }
        return sequence;
    }
}

function parse (adapter, role) {
    return (sequence) => {
        const jobs = [];
        sequence[0].forEach((handler, index) => {

            jobs.push(Fn(adapter, handler[0], role));

            // state (memory scope)
            if (handler[1]) {
                handler[1] = getState(adapter, handler[1]);
            }

            // handler arguments (readonly)
            if (handler[2]) {
                handler[2] = Object.freeze(handler[2]);
            }
        });

        // sequence arguments (readonly)
        if (sequence[1] && sequence[1].A) {
            sequence[1].A = Object.freeze(sequence[1].A);
        }

        return Promise.all(jobs).then((values) => {
            values.forEach((fn, index) => {
                sequence[0][index][0] = fn;
            });
            return sequence;
        });
    }
};

function Fn (adapter, fn_iri) {
    const cached = adapter.cache.get(fn_iri);
    if (!cached) {
        return adapter.fn(fn_iri).then((fn) => {
            adapter.cache.set(fn_iri, fn);
            return fn;
        });
    }
    return Promise.resolve(cached);
};

function getState (adapter, state_id) {
    let state = adapter.cache.get(state_id);
    if (state) {
        return state;
    }

    state = {};
    adapter.cache.set(state_id, state);
    return state;
}

function callHandler (event, handler, state, args, input) {
    return new Promise((resolve, reject) => {
        handler(event, args, state, input, resolve, reject);
    });
}
