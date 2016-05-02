var EventEmitter = require('events');

module.exports = function Load (scope, event, instance, options, cb) {

    if (scope.get(
            scope.instances,
            instance,
            event,
            cb
    )) {
        process.nextTick(load,
            scope,
            instance,
            options
        );
    }
};

function load (scope, instance, options) {

    var loader = scope.instances[instance];
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
        if (scope.modules[composition.module]) {
            build(scope, loader, composition, scope.modules[composition.module]);
            return;
        }

        loader.once('module', function (module) {
            scope.modules[composition.module] = module;
            build(scope, loader, composition, module);
        });

        if (scope.modules[composition.module] === null) {
            return;
        }

        scope.modules[composition.module] = null;
        scope.mod(composition.module, function (err, module) {

            if (err) {
                return loader.emit('error', err);
            }

            loader.emit('module', module);
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

function build (scope, loader, config, module) {

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
        loader.emit('ready', loader);
    };

    // init loader instance
    instance.init ? instance.init(config.config || {}, ready) : ready();
}
