export default function (adapter) {
    "use strict";

    const PROMISE = Promise;

    const getObjVal = (path, object) => {
        if (path === "." || path === 1) {
            return object;
        }
        path = path.split(".");
        for (let i = 0, l = path.length; i < l; ++i) {
            if ((object = object[path[i]]) === undefined) {
                return;
            }
        }
        return object;
    };

    const setObjVal = (path, object, value) => {
        if (path === "." || path === 1) {
            object = value;
        } else {
            path = path.split(".");
            for (let i = 0, l = path.length - 1; i <= l; ++i) {
                object = (
                    object[path[i]] = l === i ? value :
                        (object[path[i]] !== undefined ? object[path[i]] :
                            (object.constructor === Array ? [] : {}))
                );
            }
        }
    };

    const getSrcVal = (sources, config) => {
        if (config.constructor === Number) {
            return sources[config];
        }
        if (sources[config[0]] !== undefined) {
            if (config[1].constructor === String) {
                return getObjVal(config[1], sources[config[0]]);
            }
            return sources[config[0]];
        }
    };

    const getInput = (handler, sargs, input) => {
        if (handler[3]) {
            const sources = [sargs, handler[2], input];
            if (
                handler[3].constructor === Array &&
                handler[3][0].constructor === Array &&
                handler[3][0][0].constructor === String
            ) {
                const handler_input = {};
                for (let i = 0, l = handler[3].length; i < l; ++i) {
                    setObjVal(handler[3][i][0], handler_input, getSrcVal(sources, handler[3][i][1]));
                }
                return handler_input;
            } else {
                return getSrcVal(sources, handler[3]);
            }
        }
        return input;
    };

    const mergeOutput = (handler, next_input, output) => {
        if (handler[4]) {
            next_input = next_input || {};
            switch (handler[4].constructor) {
                case String:
                    next_input = getObjVal(handler[4], output);
                    break;
                case Array:
                    for (let i = 0, l = handler[4].length; i < l; ++i) {
                        setObjVal(handler[4][i][0], next_input, getObjVal(handler[4][i][1], output));
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
                try {
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
                } catch(err) {
                    err.message = handler[5] + ": " + err.message;
                    reject(err);
                }
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

    return function flow (sequenceId, input, role) {
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
                        return adapter.fnc(handler_id, role).then((fn) => {
                            try {
                                return fn(adapter, flow);
                            } catch(err) {
                                err.message = handler_id + ": " + err.message;
                                return Promise.reject(err);
                            }
                        });
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
                        sequence[0][index][5] = sequence[0][index][0];
                        sequence[0][index][0] = fn;
                    });
                    return sequence;
                });
            }).then((parsed) => {
                return adapter.set(sequenceId, parsed);
            });
        }).then((sequence) => {

            // role check
            if (sequence[1] && sequence[1].R && !sequence[1].R[role]) {
                return PROMISE.reject(new Error("EACCES"));
            }

            // Call handlers in order
            let rt_sequence = callHandler(sequence[0][0], sequence[1] && sequence[1].A)(input);
            for (let i = 1; i < sequence[0].length; ++i) {
                rt_sequence = rt_sequence.then(callHandler(sequence[0][i], sequence[1] && sequence[1].A));
            };

            // Handle error sequence
            if (sequence[1] && sequence[1].E) {
                rt_sequence.catch((err) => {
                    input.err = err;
                    return flow(sequence[1].E, input).catch((err)=>{return err;});
                });
            }

            return rt_sequence;
        });
    }
}
