var EventEmitter = require('events');

module.exports = function Load (scope, emitter, instance, options) {
    
    scope.cache[instance] = scope.cache[instance] || new EventEmitter();
    scope.get(scope.cache[instance], emitter, 'load', function () {
        delete scope.cache[instance];
    });
    process.nextTick(load, scope, scope.cache[instance], instance, options);
    return emitter;
};

function load (scope, loader, instance, options) {

    scope.mic(instance, function (err, composition) {

        if (err || (!composition || !composition.module) || !roleAccess(composition, options.session)) {
            return loader.emit('error', err || new Error('Flow.load: No access or invalid composition'));
        }

        // emit flow events on load
        if (composition.load) {
            composition.load.forEach(function (event) {
                scope.flow(event).end(options);
            });
        }

        // get CommonJS module
        scope.mod(composition.module, function (err, module) {

            if (err) {
                return loader.emit('error', err);
            }

            build(scope, loader, module, composition);
        });
    });
}

function roleAccess (item, role) {

    var roles = item && (item._roles || item.roles || {}) || {};
    role = role && role.role ? role.role : role;

    if (roles['*'] || (typeof role === 'string' && roles[role])) {
        return true;
    }
}

function build (scope, loader, module, config) {

    // create new flow emitter
    var instance = Object.create(module);
    instance.flow = scope.flow;
    instance._name = config.name;
    instance._reset = scope.reset;
    instance._config = config.config || {};

    // extend loader
    loader.module = config.module;
    loader.name = config.name;
    loader.roles = config.roles || {};
    loader.flow = config.flow || {};
    loader.parsed = {};

    var ready = function (err, data) {

        if (err) {
            return loader.emit('error', err);
        }

        // mark instance as ready
        loader.inst = instance;
        loader.ready = true;
        loader.emit('ready', instance);
    };

    // init loader instance
    instance.init ? instance.init(config.config || {}, ready) : ready();
}
