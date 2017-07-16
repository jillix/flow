Flow = (adapter) => {
    "use strict";
    const PROMISE = Promise;

    const getSourceValue = (sources, config) => {
        if (config.constructor === Number) {
            return sources[config];
        }

        if (config[0].constructor === Number) {
            if (config[1] && config[1].constructor === String && sources[config[0]] !== undefined && sources[config[0]] !== null) {
                return sources[config[0]][config[1]];
            }
            return sources[config[0]];
        }
    };

    const createInput = (sources, config) => {
        let handler_input = getSourceValue(sources, config);
        if (handler_input !== undefined) {
            return handler_input;
        }

        for (let i = 0, l = config.length; i < l; ++i) {
            handler_input = getSourceValue(sources, config[i]);
            if (handler_input !== undefined) {
                return handler_input;
            }
        }
    };

    const getInput = (handler, sargs, input) => {
        if (handler[3]) {
            const sources = [sargs, handler[2], input];
            if (handler[3].constructor === Object) {
                const handler_input = {};
                for (let key in handler[3]) {
                    handler_input[key] = createInput(sources, handler[3][key]);
                }
                return handler_input;
            }
            return createInput(sources, handler[3]);
        }
        return input;
    };

    const mergeOutput = (handler, next_input, output) => {
        if (handler[4]) {
            next_input = next_input || {};
            switch (handler[4].constructor) {
                case String:
                    next_input = output[handler[4]];
                    break;
                case Object:
                    for (let key in handler[4]) {
                        next_input[key] = handler[4][key] === 1 ? output : output[handler[4][key]];
                    }
                    break;
                default:
                    next_input = output;
            }
        }
        return next_input;
    };

    const callHandler = (handler, sargs) => {
        return (input) => {
            return new PROMISE((resolve, reject) => {
                handler[0](handler[1], getInput(handler, sargs, input), (output) => {

                    if (output === undefined) {
                        return resolve(input);
                    }

                    if (output.constructor === PROMISE) {
                        return output.then((output) => {
                            resolve(mergeOutput(handler, input, output));
                        }).catch(reject);
                    }

                    resolve(mergeOutput(handler, input, output));
                }, reject);
            });
        };
    };

    const getFromCache = (id, load, scoped) => {
        let item = adapter.get(id);
        if (item !== undefined) {
            return item.constructor === PROMISE ? item : PROMISE.resolve(item);
        }
        return adapter.set(id, load(id, scoped));
    };

    Flow = (sequenceId, input, role) => {
        return getFromCache(sequenceId, () => {
            return adapter.seq(sequenceId, role)
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
                                return adapter.dep(name, dependency, role).then(() => {
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
                        return adapter.fnc(handler_id, role).then(adapter.get);
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
                return adapter.set(sequenceId, parsed);
            });
        }).then((sequence) => {
            if (sequence[1] && sequence[1].R && !sequence[1].R[role]) {
                return PROMISE.reject(new Error("EACCES"));
            }
            return sequence;
        }).then((sequence) => {

            // Call handlers in order
            let rt_sequence = callHandler(sequence[0][0], sequence[1] && sequence[1].A)(input);
            for (let i = 1; i < sequence[0].length; ++i) {
                rt_sequence = rt_sequence.then(callHandler(sequence[0][i], sequence[1] && sequence[1].A));
            };

            // Handle error sequence
            if (sequence[1] && sequence[1].E) {
                rt_sequence.catch((err) => {
                    err.data = input;
                    Flow(sequence[1].E, err);
                });
            }

            return rt_sequence;
        }).catch((err) => {console.error(err)});
    };

    Flow.set = adapter.set;
    Flow.abp = adapter.abp;
    return Flow;
};
