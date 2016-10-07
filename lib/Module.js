'use strict'

module.exports = function (scope, args, module_iri, callback) {

    let module = scope.cache.get(module_iri);
    if (module) {
        module.ready ? callback(null, module.exports) : module.queue.push(callback);
        return;
    }

    module = {queue: [callback]};
    scope.cache.set(module_iri, module);
    scope.mod(module_iri, args, (error, exports) => {

        if (error) {
            scope.cache.del(module_iri);
            return loaded(error, module);
        }

        module.exports = exports;
        module.ready = true;
        scope.cache.set(module_iri, module);
        loaded(null, module);
    });

    return module;
};

function loaded (error, module) {
    module.queue.forEach(callback => callback(error, module.exports));
    module.queue = [];
}
