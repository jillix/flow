Flow = (adapter) => {
    "use strict";
    const PROMISE = Promise;

    const callHandler = (handler, event) => {
        return (input) => {
            return new PROMISE((resolve, reject) => {
                handler[0](event, handler[2], handler[1], input, resolve, reject);
            });
        };
    };

    const getFromCache = (id, load, scoped) => {
        let item = adapter.get(id);

        // loading
        if (item instanceof PROMISE) {
            return item;
        }

        // available
        if (item !== undefined) {
            return PROMISE.resolve(item);
        }

        return adapter.set(id, load(id, scoped));
    };

    Flow = (event, input) => {
        event = typeof event === "string" ? event = {sequence: event} : event;
        event.emit = Flow;
        return getFromCache(event.sequence, () => {

            return adapter.seq(event.sequence, event.role)
            .then((sequence) => {
                if (sequence[1]) {

                    // Freeze sequence arguments
                    if (sequence[1].A) {
                        sequence[1].A = Object.freeze(sequence[1].A);
                    }

                    // Ensure dependencies
                    if (sequence[1].D) {
                        const deps = [];
                        for (let name in sequence[1].D) {
                            deps.push(getFromCache(sequence[1].D[name], (dependency, name) => {
                                return adapter.dep(name, dependency, event.role).then(() => {
                                    adapter.set(dependency, name);
                                });
                            }, name));
                        }
                        return Promise.all(deps).then(()=>{
                            return sequence;
                        });
                    }
                }
                return sequence;
            })
            .then((sequence) => {
                const refs = [];
                sequence[0].forEach((handler, index) => {

                    // Get handler method references
                    refs.push(getFromCache(handler[0], (handler_id) => {
                        return adapter.fnc(handler_id, event.role).then(adapter.get);
                    }));

                    // Get or create a state reference
                    if (handler[1]) {
                        handler[1] = adapter.get(handler[1]) || adapter.set(handler[1], {});
                    }

                    // Freeze handler arguments
                    if (handler[2]) {
                        handler[2] = Object.freeze(handler[2]);
                    }
                });

                return PROMISE.all(refs).then((values) => {
                    values.forEach((fn, index) => {
                        sequence[0][index][0] = fn;
                    });
                    return sequence;
                });
            }).then((parsed) => {
                return adapter.set(event.sequence, parsed);
            });
        }).then((sequence) => {
            if (sequence[1] && sequence[1].R && !sequence[1].R[event.role]) {
                return PROMISE.reject(new Error("EACCES"));
            }
            return sequence;
        }).then((sequence) => {

            // Call handlers
            event.args = sequence[1] ? sequence[1].A : undefined;
            let rt_sequence = callHandler(sequence[0][0], event)(input);
            for (let i = 1; i < sequence[0].length; ++i) {
                rt_sequence = rt_sequence.then(callHandler(sequence[0][i], event));
            };

            // Handle error sequence
            if (sequence[1] && sequence[1].E) {
                rt_sequence.catch((err) => {
                    err.data = input;
                    event.emit(sequence[1].E, err);
                });
            }

            return rt_sequence;
        });
    };

    Flow.set = adapter.set;
    return Flow;
};
