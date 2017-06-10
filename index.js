"use strict"

module.exports = (adapter) => {
    const call = (options, data, done) => {

        const flow = {
            emit: call,
            sequence: options.sequence,
            role: options.role || null
        };

        let parsed_sequence = adapter.cache.get(options.sequence);
        if (!parsed_sequence) {
            parsed_sequence = adapter.seq(options.sequence, options.role)
            .then(checkRoleAccess(options.role))
            .then(parse(adapter))
            .then((parsed) => {
                adapter.cache.set(options.sequence, parsed);
                return parsed;
            });
        } else {
            parsed_sequence = Promise.resolve(parsed_sequence).then(checkRoleAccess(options.role));
        }

        parsed_sequence.then((sequence) => {
            flow.args = sequence[1] ? sequence[1].A : undefined;
            let input = data;
            let rt_sequence;
            sequence[0].forEach((handler, index) => {
                rt_sequence.then((output) => {
                    if (output !== undefined) {
                        input = output;
                    }
                    callHandler(flow, sequence[0][i][0], sequence[0][i][1], sequence[0][i][2], input);
                });
            });

            if (sequence[1] && sequence[1].E) {
                handler_p.catch((err) => {
                    err.data = input;
                    flow.emit(sequence[1].E, err);
                });
            }

            return rt_sequence;

        }).catch((err) => {
            if (typeof adapter.error === "function") {
                adapter.error(options.sequence, err);
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

            // state
            if (handler[1]) {
                handler[1] = getState(adapter, handler[1]);
            }

            // handler arguments
            if (handler[2]) {
                handler[2] = Object.freeze(handler[2]);
            }
        });

        // sequence arguments
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

function callHandler (flow, handler, state, args, data) {
    return new Promise((resolve, reject) => {
        try {
            handler(flow, state, args, data, resolve, reject);
        } catch (err) {
            reject(err);
        }
    });
}
