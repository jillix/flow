var EventEmitter = require('events');
var libob = require('libobject');
var Load = require('./load');

module.exports = function (scope, node, instance, event, event_id, options) {
    if (scope.get(
            scope.events,
            event_id,
            node,
            node.link.bind(node, options)
    )) {
        Load(
            scope,
            scope.events[event_id],
            instance,
            options,
            parse.bind(null, scope, event, event_id, options)
        );
    }
};

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
