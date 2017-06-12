Flow = (adapter) => {
    "use strict";
    const PROMISE = Promise;
    const checkRoleAccess = (role) => {
        return (sequence) => {
            if (sequence[1] && sequence[1].R && !sequence[1].R[role]) {
                return PROMISE.reject(new Error("Sorry, no access."));
            }
            return sequence;
        }
    };

    const parse = (role) => {
        return (sequence) => {
            const jobs = [];
            sequence[0].forEach((handler, index) => {

                jobs.push(Fn(handler[0], role));

                if (handler[1]) {
                    handler[1] = getState(handler[1]);
                }

                if (handler[2]) {
                    handler[2] = Object.freeze(handler[2]);
                }
            });

            if (sequence[1] && sequence[1].A) {
                sequence[1].A = Object.freeze(sequence[1].A);
            }

            return PROMISE.all(jobs).then((values) => {
                values.forEach((fn, index) => {
                    sequence[0][index][0] = fn;
                });
                return sequence;
            });
        }
    };

    const Fn = (fn_iri) => {
        const cached = adapter.cache.get(fn_iri);
        if (!cached) {
            return adapter.fn(fn_iri).then((fn) => {
                adapter.cache.set(fn_iri, fn);
                return fn;
            });
        }
        return PROMISE.resolve(cached);
    };

    const getState = (state_id) => {
        let state = adapter.cache.get(state_id);
        if (state) {
            return state;
        }

        state = {};
        adapter.cache.set(state_id, state);
        return state;
    };

    const callHandler = (handler, event, input) => {
        return new PROMISE((resolve, reject) => {
            handler[0](event, handler[2], handler[1], input, resolve, reject);
        });
    };

    return Flow = (event, input) => {

        event = typeof event === "string" ? event = {sequence: event} : event;
        event.emit = Flow;

        let parsed_sequence = adapter.cache.get(event.sequence);
        if (!parsed_sequence) {
            parsed_sequence = adapter.seq(event.sequence, event.role)
            .then(checkRoleAccess(event.role))
            .then(parse(event.role))
            .then((parsed) => {
                adapter.cache.set(event.sequence, parsed);
                return parsed;
            });
        } else {
            parsed_sequence = PROMISE.resolve(parsed_sequence).then(checkRoleAccess(event.role));
        }

        return parsed_sequence.then((sequence) => {
            event.args = sequence[1].A;
            let rt_sequence = callHandler(sequence[0][0], event, input);
            for (let i = 1; i < sequence[0].length; ++i) {
                rt_sequence = rt_sequence.then((output) => {
                    return callHandler(sequence[0][i], event, output);
                });
            };

            if (sequence[1] && sequence[1].E) {
                rt_sequence.catch((err) => {
                    err.data = input;
                    event.emit(sequence[1].E, err);
                });
            }

            return rt_sequence;

        }).catch((err) => {
            if (typeof adapter.error === "function") {
                adapter.error(event.sequence, err);
            }
            return PROMISE.reject(err);
        });
    };
};
