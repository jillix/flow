"use strict"

function Q (fn, cb) {

    const queue = {
        q: cb ? [cb] : [],
        ready: cb => queue.q.push(cb),
        done: (err, data) => {
            if (queue.d) return;
            queue.d = true;
            setImmediate(fn, err, data, (err, data) => {
                queue.q.forEach(cb => cb(err, data));
                queue.q = [];
            });
        }
    };

    return Object.create(queue);
}

exports.Fn = (scope, method_iri, session, callback) => {
    let method = scope.cache.get(method_iri);
    if (method) {
        return method.ready(callback);
    }

    method = Q((error, fn, done) => {

        if (error) {
            scope.cache.del(method_iri);
            return done(error);
        }

        scope.cache.set(method_iri, {
            fn: fn,
            ready: cb => setImmediate(cb, null, fn)
        });

        done(null, fn);
    }, callback);

    scope.cache.set(method_iri, method);
    scope.fn(method_iri, session, method.done);
};
