'use strict'

const Q = require('libobject').queue;

exports.Instance = (scope, instance_iri, callback) => {

    let instance = scope.cache.get(instance_iri);
    if (instance) {

        if (callback) {
            return instance.ready(callback);
        }

        return instance.done ? instance : null;
    }

    instance = Q((error, module, done) => {

        if (error) {
            scope.cache.del(instance_iri);
            return done(error);
        }

        let clone = instance.clone = Object.create(module); 
        clone._name = instance_iri;

        scope.cache.set(instance_iri, {
            clone: clone,
            ready: fn => setImmediate(fn, null, clone)
        });

        done(null, clone);
    }, callback); 

    scope.cache.set(instance_iri, instance);

    if (!callback) {
        return instance.done ? instance : null;
    }
};

exports.Module = (scope, module_iri, session, callback) => {

    let module = scope.cache.get(module_iri);
    if (module) {
        return module.ready(callback);
    }

    module = Q((error, exports, done) => {

        if (error) {
            scope.cache.del(module_iri);
            return done(error);
        }

        scope.cache.set(module_iri, {
            exports: exports,
            ready: fn => setImmediate(fn, null, exports)
        });

        done(null, exports);
    }, callback);

    scope.cache.set(module_iri, module);
    scope.mod(module_iri, session, module.done);
};
