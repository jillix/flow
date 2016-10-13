'use strict'

module.exports = function (scope, instance_iri) {

    let instance = scope.cache.get(instance_iri);
    if (!instance) {

        instance = {
            iri: instance_iri,
            roles: {},
            queue: [],
            done: callback => instance.ready ? callback(null, instance) : instance.queue.push(callback),
            module: module => Module(scope, instance, module)
        };

        scope.cache.set(instance_iri, instance);
    }

    return instance;
}

function loaded (error, instance) {
    instance.ready = true;
    instance.queue.forEach(callback => callback(error, instance));
    instance.queue = [];
}

function Module (scope, instance, module) {

    if (instance.ready) {
        return;
    }

    let clone = instance.clone = Object.create(module); 
    clone.flow = scope.flow;
    clone._reset = scope.reset;
    clone._name = instance.iri;

    let ready = error => loaded(error, instance);

    // TODO wait for parser finish, before passing arguments to init method
    clone.init ? clone.init(instance.args || {}, ready) : ready();
}
