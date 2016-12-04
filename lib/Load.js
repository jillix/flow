'use strict'

const Q = require('libobject').queue;

exports.Fn = (scope, method_iri, session, callback) => {
    let method = scope.cache.get(method_iri);
    if (method) {
        return module.ready(callback);
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

    scope.cache.set(method_iri, module);
    scope.fn(method_iri, session, method.done);
};

/*let type, handler_iri;
for (handler_iri in sequence.seq) {
    handler = sequence.seq[handler_iri];
    type = typeof handler.D === 'string' ? 'D' : (typeof handler.S === 'string' ? 'S' : null);
    type && getMethodRef(sequence_id, handler, type, handler.D || handler.S, done);
}*/
