const libob = require('libobject');

exports.module = (loader, subject, predicate, object) => {

    //console.log('instance:', subject);
    //console.log('module:  ', object);

    const cache_key = 'm:' + object;
    let scope = loader.scope;

    // get cached module
    let cached_module = scope.cache.get(cache_key);
    if (cached_module) {
        loader.emit('done', 'module', cached_module);
        return;
    }

    if (cached_module === null) {
        return;
    }

    scope.cache.set(cache_key, null);
    scope.mod(object, loader.args, (err, module) => {

        if (err) {
            return loader.emit('error', err);
        }

        scope.cache.set(cache_key, module);
        loader.emit('done', 'module', module);
    });
};

// handler target instance
exports.instance = (loader, subject, predicate, object) => {

    const cache_key = 'i:' + object;
    let scope = loader.scope;

    // get cached instance
    let cached_inst = scope.cache.get(cache_key);
    if (cached_inst) {
        loader.emit('done', 'instance', cached_inst);
        return;
    }

    if (cached_inst === null) {
        return;
    }

    //console.log('sequence:', subject);
    //console.log('instance:', object);
/*
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
*/
};

exports.event = (loader, subject, predicate, object) => {
    //console.log('Create event', object, '\n');
    // subject = instance id

    //console.log('instance:', subject);
    //console.log('event:   ', object);
/*
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
*/
};

exports.sequence = (loader, subject, predicate, object) => {
    //console.log('sequence:     ', object);
    //console.log(subject[0] === '_' ? 'sequence:     ' : 'event:        ', subject);
};

exports.dataHandler = (loader, subject, predicate, object) => {
    //console.log('dataHandler:  ', object);
    //console.log('sequence:     ', subject);
    //console.log('Create handler and add to seqence', object, '\n');
    // check if seqence exists
    // 0 -> wait for sequence
    // 1 -> check if handler exists
    //      0 -> wait for handler
    //      1 -> check if instance exists
    //           0 -> wait and try again on instance ready
    //           1 -> get method ref and pass it to handler
    //console.log('get method ref', object, '\n');
};

exports.streamHandler = (loader, subject, predicate, object) => {
    //console.log('streamHandler:', object);
    //console.log('sequence:     ', subject);
    //console.log('Create handler and add to seqence', object, '\n');
};

exports.eventHandler = (loader, subject, predicate, object) => {
    //console.log('eventHandler: ', object);
    //console.log('sequence:     ', subject);
    // check if sequence exists
    // 0 -> wait for sequence
    // 1 -> check if handler exists
    //      0 -> wait for handler
    //      1 -> emit flow event and pass it to handler
    //console.log('Get event stream and pipe to sequence', object, '\n');
};

exports.object = (loader, subject, predicate, object) => {
   // console.log('Build object', object, 'of type', predicate, 'attach to', subject, '\n');
};

function roleAccess (item, role) {

    var roles = item && (item._roles || item.roles || {}) || {};
    role = role && role.role ? role.role : role;

    if (roles['*'] || (typeof role === 'string' && roles[role])) {
        return true;
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
