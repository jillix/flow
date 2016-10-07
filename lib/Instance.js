'use strict'

module.exports = function (scope, args, instance_iri, callback) {

    let instance = scope.cache.get(instance_iri);
    if (instance) {
        instance.ready ? callback(null, instance.clone) : instance.queue.push(callback);
        return;
    }

    instance = {
        roles: {},
        queue: [callback],
        role: role => instance.roles[role] = value,
        args: args => instance.args = args,
        module: module => {

            let clone = instance.clone = Object.create(module); 
            clone.flow = scope.flow;
            clone._reset = scope.reset;
            clone._name = iri;

            let ready = error => {

                if (error) {
                    return loaded(error);
                }

                scope.cache.set(iri, instance);
                loaded(null, instance);
            };

            instance.init ? instance.init(instance.args || {}, ready) : ready();
        }
    };

    scope.cache.set(instance_iri, instance);
    return instance;
}

function loaded (error, module) {
    instance.queue.forEach(callback => callback(error, instance.clone));
    instance.queue = [];
}
