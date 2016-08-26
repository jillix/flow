const libob = require('libobject');

exports.module = (loader, subject, predicate, object) => {
    //console.log('Load module:', object, '\n');
};

exports.instance = (loader, subject, predicate, object) => {
    //console.log('Create and load instance:', object, '\n');
};

exports.listener = (loader, subject, predicate, object) => {
    //console.log('Create event', object, '\n');
};

exports.sequence = (loader, subject, predicate, object) => {
    //console.log('Create new sequence', object, '\n');
};

exports.handler = (loader, subject, predicate, object) => {
    //console.log('Create handler and add to seqence', object, '\n');
};

exports.event = (loader, subject, predicate, object) => {
    //console.log('Get event stream and pipe to sequence', object, '\n');
};

exports.method = (loader, subject, predicate, object) => {
    //console.log('Load instance, get method ref', object, '\n');
};

exports.object = (loader, subject, predicate, object) => {
    //console.log('Build object', object, 'of type', predicate, 'attach to', subject, '\n');
};
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

function parse (scope, event, event_id, options, instance) {

    var sequence = scope.events[event_id];

    if (!instance.flow || !instance.flow[event]) {
        return sequence.emit('error', new Error('Flow.parse: Event "' + event + '" not found on instance "' + instance.name + '".'));
    }

    if (!instance.flow[event].d) {
        return sequence.emit('error', new Error('Flow.parse: No data handlers.'));
    }

    var parsedEvent = parseEvent(scope, instance, instance.flow[event].d);
    var count = 0;
    var check = function () {
        if (++count === parsedEvent.l.length) {
            parseSequence(scope, sequence, parsedEvent.s);
        }
    };

    // set instance ref
    sequence.i = instance;

    // set end and error events
    sequence.e = instance.flow[event].e;
    sequence.r = instance.flow[event].r;

    if (parsedEvent.l.length > 0) {
        parsedEvent.l.forEach(function (instName) {
            Load(scope, sequence, instName, options, check);
        });

    } else {
        parseSequence(scope, sequence, parsedEvent.s);
    }
}

function parseEvent (scope, instance, config) {

    var instances = {};
    var sequences = [];
    var pointer = 0;

    config.forEach(function (handler) {

        // resolve handler
        var path = handler;
        var args = {};

        if (handler.constructor === Array) {
            path = handler[0];
            args = handler[1] || {};
        }

        let type = path.substr(0, 1);
        path = path.substr(1);

        // parse path
        let instance_name = instance.name;
        if (path.indexOf('/') > 0) {
            path = path.split('/', 2);
            instance_name = path[0];
            path = path[1];
        }

        if (!scope.instances[instance_name] || !scope.instances[instance_name].ready) {
            instances[instance_name] = 1;
        }

        switch (type) {

            // data handlers
            case ':':
            case '.':

                // create new section if current is a even/stream handler
                if (sequences[pointer] && sequences[pointer][0] > 0) {
                    ++pointer;
                }

                sequences[pointer] = sequences[pointer] || [0, []];
                sequences[pointer][1].push([instance_name, path, args, (type === '.')]);
                return;

            // stream handlers
            case '>':
            case '*':

                sequences.push([(type === '*' ? 1 : 2), [instance_name, path, args]]);

                ++pointer;
                return;
        }

        sequence.emit('error', new Error('Flow.parse: Invalid handler type:', type));
    });

    return {
        l: Object.keys(instances),
        s: sequences
    };
}

// update sequences with method refs
function parseSequence (scope, event, sequences) {

    var getMethodRef = function (handler) {
        handler[0] = scope.instances[handler[0]].inst;

        if (!(handler[1] = libob.path(handler[1], handler[0]))) {
            return event.emit('error', new Error('Flow.parse: Method on instance "' + handler[0]._name + '" not found.'));
        }
    };

    for (var i = 0, l = sequences.length, sequence; i < l; ++i) {
        sequence = sequences[i];

        switch (sequence[0]) {
            case 0:
                sequence[1].forEach(getMethodRef);
                break;
            case 1:
                getMethodRef(sequence[1]);
                break;
            case 2:
                sequence[1][0] = scope.instances[sequence[1][0]].inst;
        }
    }

    event.s = sequences;
    event.ready = true;
    event.emit('ready', event);
}