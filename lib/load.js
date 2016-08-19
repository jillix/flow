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

        if (err) {
            return loader.emit('error', err);
        }

        const unique = {};
        const data = {};

        composition.on('data', (triple) => {

            // validate triple structure
            let subject, predicate, object;
            if (triple instanceof Array && triple.length === 3) {
                subject = triple[0];
                predicate = triple[1];
                object = triple[2];

            } else if (triple.subject && triple.predicate && triple.object) {
                subject = triple.subject;
                predicate = triple.predicate;
                object = triple.object;

            } else {
                composition.emit(new Error('Flow.load: Invalid triple:' + triple.toString()));
                return;
            }

            unique[predicate] = true;

            // build subjects from triples
            if (data[subject]) {
                if (data[subject][predicate]) {
                    if (!(data[subject][predicate] instanceof Array)) {
                        data[subject][predicate] = [data[subject][predicate]];
                    }
                    data[subject][predicate].push(object);
                } else {
                    data[subject][predicate] = object;
                }
            } else {
                data[subject] = {};
                data[subject][predicate] = object;
            }

            /*
                // Rule: P:module, S:instance
                // Load module and emit module ready on instance
                '<http://schema.jillix.net/vocab/module>',

                // Rule: P:config, S:instance,subkey of config object
                // Build one level objects and create deep object on stream end
                '<http://schema.jillix.net/vocab/config>',

                // Rule: P:listener, S:instance
                // Create sequence add to instance
                '<http://schema.jillix.net/vocab/listener>',

                // Rule: P:dataHandler, S:listener or dataHandler
                // Add to sequence
                '<http://schema.jillix.net/vocab/dataHandler>',
                '<http://schema.jillix.net/vocab/streamHandler>',
                '<http://schema.jillix.net/vocab/eventEmit>',

                // Rule: P:instance, S:dataHandler,streamHandler,eventEmit
                // Load instance (with module) emit ready event on sequence
                '<http://schema.jillix.net/vocab/instance>',

                // Rule: P:method, S:dataHandler,streamHandler
                // Get method reference add it to sequence
                '<http://schema.jillix.net/vocab/method>',

                // Rule: P:arguments, S:dataHandler,streamHandler(,eventEmit?)
                // Build one level objects and create deep object on stream end, add it to sequence
                '<http://schema.jillix.net/vocab/arguments>'
            */
        });

        composition.on('end', () => {
            console.log('END STREAM');
            console.log(Object.keys(unique));

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

        // get cached module
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
