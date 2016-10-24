'use strict'

const Q = require('libobject').queue;

exports.Instance = (scope, instance_iri) => {

    let instance = scope.cache.get(instance_iri);
    if (!instance) {
        instance = Q((error, module, done) => {
console.log('Flow.load.instance:', instance_iri);
            if (error) {
                scope.cache.del(instance_iri);
                return done(error);
            }

            if (instance.ready) {
                return done(null, instance);
            }

            let clone = instance.clone = Object.create(module); 
            clone.flow = scope.flow;
            clone._reset = scope.reset;
            clone._name = instance.iri;

            // TODO wait for parser to finish
            try {
                clone._args = instance.args ? JSON.parse(instance.args) : {};
            } catch (error) {
                scope.cache.del(instance_iri);
                done(error);
            }

            clone.init ? clone.init(clone._args, error => {
                scope.cache.del(instance_iri);
                done(error, instance)
            }) : done(null, instance);
        });

        instance.iri = instance_iri;
        instance.roles = {};

        scope.cache.set(instance_iri, instance);
    };

    return instance;
};

exports.Module = (scope, module_iri, session, callback) => {

    let module = scope.cache.get(module_iri);
    if (module) {
        module.ready ? callback(null, module.exports) : module.add(callback);
        return;
    }

    module = Q((error, exports, done) => {

        if (error) {
            scope.cache.del(module_iri);
            return done(error);
        }

        scope.cache.set(module_iri, {
            exports: exports,
            ready: true
        });

        done(null, exports);
    }, callback);

    scope.cache.set(module_iri, module);
    scope.mod(module_iri, session, module.done);
};
