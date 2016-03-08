var EventEmitter = require('events');
var libob = require('libobject');
var Load = require('./load');

module.exports = function Parse (scope, emitter, instance, event, options) {

    instance.parsed[event] = instance.parsed[event] || new EventEmitter();
    scope.get(instance.parsed[event], emitter, 'event');
    process.nextTick(parse, scope, instance.parsed[event], instance, event, options);
    return emitter;
};

function parse (scope, sequence, instance, event, options) {

    if (!instance.flow || !instance.flow[event]) {
        return sequence.emit('error', new Error('Flow.parse: Event not found on instance.'));
    }

    if (!instance.flow[event].d) {
        return sequence.emit('error', new Error('Flow.parse: No data handlers.'));
    }

    var parsedEvent = parseEvent(scope, instance, instance.flow[event].d);
    var count = 0;

    if (parsedEvent.l.length > 0) {
        sequence.on('_flow_load', function (instance) {

            if (++count === parsedEvent.l.length) {
                sequence.s = parseSequence(scope, parsedEvent.s);
                sequence.emit('ready', sequence);
                sequence.ready = true;
            }
        });

        parsedEvent.l.forEach(function (instName) {
            Load(scope, sequence, instName, options);
        });

    } else {
        sequence.s = parseSequence(scope, parsedEvent.s);
        sequence.emit('ready', sequence);
        sequence.ready = true;
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

        var type = path[0];
        path = path.substr(1);

        if (type === ':' || type === '.') {

            path = scope.path(path, instance.name);

            if (!scope.cache[path[0]] || !scope.cache[path[0]].ready) {
                instances[path[0]] = 1;
            }

            sequences[pointer] = sequences[pointer] || {};
            sequences[pointer].s = sequences[pointer].s || [];
            sequences[pointer].s.push([path, args, (type === '.')]);
            return;
        }
        
        if (type === '>' || type === '|') {

            var net = path[0];
            path = scope.path(path.substr(1), instance.name);

            if (!scope.cache[path[0]] || !scope.cache[path[0]].ready) {
                instances[path[0]] = 1;
            }

            sequences.push({
                t: net,
                n: type,
                p: path,
                a: args
            });

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
function parseSequence (scope, sequences) {

    sequences.forEach(function (sequence) {

        // TODO check if refs are found

        // sequence path
        if (sequence.p) {
            sequence.p[0] = scope.cache[sequence.p[0]].inst;

            if (sequence.t === '*') {
                sequence.p[1] = libob.path(sequence.p[1], sequence.p[0]);
            }
        }

        // sequence handlers
        if (sequence.s) {
            sequence.s.forEach(function (value, index) {
                sequence.s[index][0][0] = scope.cache[value[0][0]].inst;
                sequence.s[index][0][1] = libob.path(value[0][1]);
            });
        }
    });

    return sequences;
}
