const EventEmitter = require('events');

module.exports = (scope, event, instance, options, cb) => {

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
    scope.mic(instance, options, (err, composition) => {

        const unique = {
            subjects: {},
            predicates: {},
            objects: {}
        };

        composition.on('data', (triple) => {

            let subject = triple[0];
            let predicate = triple[1];
            let object = triple[2];

            if (!unique.subjects[subject]) {
                unique.subjects[subject] = 0;
            }
            if (!unique.predicates[predicate]) {
                unique.predicates[predicate] = 0;
            }
            if (!unique.objects[object]) {
                unique.objects[object] = 0;
            }
            ++unique.subjects[subject];
            ++unique.predicates[predicate];
            ++unique.objects[object];

            // - read type and handle data accordingly
            switch (predicate) { 

                // MODULE instance -> module
                case '<http://schema.jillix.net/vocab/module>':
                    // Actions:
                    // - load module
                    // - emit module complete or error
                    console.log('Module:', subject, object);
                    break;

                // ROLE instance -> role
                case '<http://schema.jillix.net/vocab/roles>':
                    // Actions:
                    // - save all roles on instance
                    console.log('Roles:', subject, object);
                    break;

                // LISTENER: instance -> listener
                case '<http://schema.jillix.net/vocab/listener>':
                    // Actions:
                    // - create new sequence
                    // - save sequence on instance
                    console.log('Listener:', subject, object);
                    break;

                // HANDLERS: listener -> handler
                case '<http://schema.jillix.net/vocab/chunkHandler>':
                    // Actions:
                    // - add data chunk handler to sequence
                    console.log('Chunk-handler:', subject, object);
                    break;
                case '<http://schema.jillix.net/vocab/streamHandler>':
                    // Actions:
                    // - add stream handler to sequence
                    console.log('Stream-handler:', subject, object);
                    break;
                case '<http://schema.jillix.net/vocab/eventEmit>':
                    // Actions:
                    // - add event emit to sequence
                    console.log('Listener(event):', subject, object);
                    break;

                // INSTANCE handler -> instance
                case '<http://schema.jillix.net/vocab/instance>':
                    // Actions:
                    // - load instance
                    console.log('Instance:', subject, object);
                    break;

                // METHOD handler -> method
                case '<http://schema.jillix.net/vocab/arguments>':
                    // Actions:
                    // - listen to instance "ready"
                    // - get method reference
                    // - add it to handler
                    console.log('Arguments:', subject, object);
                    break;
                // ARGUMENTS method -> arguments
                case '<http://schema.jillix.net/vocab/method>':
                    // Actions:
                    // - collect all arguments for this handler
                    // - create a object
                    // - add it to handler emit/call
                    //console.log('Method:', subject, object);
                    break;

                //case '':
                //    console.log(':', subject, object);
                //    break;
                default:
                    // error type not supported
            }
        });

        composition.on('end', () => {
            console.log('END STREAM');

            unique.subjects = Object.keys(unique.subjects);
            unique.predicates= Object.keys(unique.predicates);
            unique.objects = Object.keys(unique.objects);

            //console.log(unique);

            process.exit(1);
        });

        return;

        if (err || (!composition || !composition.module) || !roleAccess(composition, options.session)) {
            return loader.emit('error', err || new Error('Flow.load: No access or invalid composition'));
        }

        // emit flow events on load
        if (composition.load) {
            composition.load.forEach((event) => {
                scope.flow(event).end(options);
            });
        }

        // get CommonJS module
        if (scope.modules[composition.module]) {
            build(scope, loader, composition, scope.modules[composition.module]);
            return;
        }

        loader.once('module', (module) => {
            scope.modules[composition.module] = module;
            build(scope, loader, composition, module);
        });

        if (scope.modules[composition.module] === null) {
            return;
        }

        scope.modules[composition.module] = null;
        scope.mod(composition.module, options, (err, module) => {

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
