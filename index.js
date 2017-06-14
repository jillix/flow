Flow = (adapter) => {
    "use strict";
    const PROMISE = Promise;

    const callHandler = (handler, event, input) => {
        return new PROMISE((resolve, reject) => {
            handler[0](event, handler[2], handler[1], input, resolve, reject);
        });
    };

    const getFromCache = (id, load) => {
        let item = adapter.get(id);

        // loading
        if (item instanceof PROMISE) {
            return item;
        }

        // available
        if (item !== undefined) {
            return PROMISE.resolve(item);
        }

        item = load(id);
        adapter.set(id, item);
        return item;
    };

    Flow = (event, input) => {
        event = typeof event === "string" ? event = {sequence: event} : event;
        event.emit = Flow;
        return getFromCache(event.sequence, () => {

            // Load and cache sequence
            return adapter.seq(event.sequence, event.role)
            .then((sequence) => {

                const refs = [];
                const deps = [];

                // load all dependencies
                sequence[0].forEach((dependency) => {
                    deps.push(getFromCache(dependency, () => {
                        return adapter.dps(dependency).then((exported) => {
                            adapter.set(dependency, exported);
                            return exported
                        });
                    }));
                });

                sequence[1].forEach((handler, index) => {

                    // Get function reference
                    refs.push(getFromCache(handler[0], () => {
                        return adapter.fnc(handler[0], event.role).then(() => {
                            return adapter.get(handler[0]);
                        });
                    }));

                    // Get or create a state reference
                    if (handler[1]) {
                        let state = adapter.get(handler[1]);
                        if (!state) {
                            state = {};
                            adapter.set(handler[1], state);
                        }
                        handler[1] = state;
                    }

                    // Freeze handler arguments
                    if (handler[2]) {
                        handler[2] = Object.freeze(handler[2]);
                    }
                });

                // Freeze sequence arguments
                if (sequence[2] && sequence[2].A) {
                    sequence[2].A = Object.freeze(sequence[2].A);
                }

                // Wait for depencecies and function references
                return PROMISE.all([
                    PROMISE.all(deps),
                    PROMISE.all(refs)
                ]).then((values) => {
                    values[1].forEach((fn, index) => {
                        sequence[1][index][0] = fn;
                    });
                    return sequence;
                });
            })
            .then((parsed) => {
                adapter.set(event.sequence, parsed);
                return parsed;
            });
        })
        .then((sequence) => {
            if (sequence[2] && sequence[2].R && !sequence[2].R[event.role]) {
                return PROMISE.reject(new Error("EACCES"));
            }
            return sequence;
        })
        .then((sequence) => {
            event.args = sequence[2] ? sequence[2].A : undefined;
            let rt_sequence = callHandler(sequence[1][0], event, input);
            for (let i = 1; i < sequence[1].length; ++i) {
                rt_sequence = rt_sequence.then((output) => {
                    return callHandler(sequence[1][i], event, output);
                });
            };

            // Handle error sequence
            if (sequence[2] && sequence[2].E) {
                rt_sequence.catch((err) => {
                    err.data = input;
                    event.emit(sequence[2].E, err);
                });
            }

            return rt_sequence;
        })
        .catch(console.error);
    };

    Flow.set = adapter.set;
    return Flow;
};
