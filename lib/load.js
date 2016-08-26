const rules = require('./rules');

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

    const loader = scope.instances[instance];
    scope.read(instance, options, (err, read) => {

        if (err) {
            return loader.emit('error', err);
        }

        // propagate error to the loader
        read.on('error', loader.emit.bind(loader, 'error'));

        // const data = {};
        read.on('data', (triple) => {

            // validate triple structure
            let subject, predicate, object;
            if (
                    triple instanceof Array &&
                    triple.length === 3 &&
                    triple[0] && triple[1] && triple[2]
            ) {
                subject = triple[0];
                predicate = triple[1];
                object = triple[2];

            } else if (triple.subject && triple.predicate && triple.object) {
                subject = triple.subject;
                predicate = triple.predicate;
                object = triple.object;

            } else {
                read.emit('error', new Error('Flow.load: Invalid triple:' + triple));
                return;
            }

            let rule = rules.getRule(subject, predicate, object);
            if (rule instanceof Error) {
                read.emit('error', rule);
                return;
            }

            console.log(rule, subject, predicate);

            // build subjects from triples
            /*if (data[subject]) {
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
            }*/
        });

        read.on('end', () => {
            console.log('END STREAM');
            //console.log(Object.keys(data));

            process.exit(1);
        });
    });
}

        /*if (err || (!composition || !composition.module) || !roleAccess(composition, options.session)) {
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
    instance.flow = scope.flow.bind(null, config.name);
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
}*/
