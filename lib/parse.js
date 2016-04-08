var EventEmitter = require('events');
var libob = require('libobject');
var Load = require('./load');

module.exports = function Parse (scope, emitter, instance, event, options, cb) {

    instance.parsed[event] = instance.parsed[event] || new EventEmitter();

    if (!scope.get(instance.parsed[event], emitter, cb)) {
        process.nextTick(parse, scope, instance.parsed[event], instance, event, options);
    }
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
    var check = function () {
        if (++count === parsedEvent.l.length) {
            parseSequence(scope, sequence, parsedEvent.s);
        }
    };

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

        var type = path[0];
        path = scope.path(path.substr(1), instance.name);

        if (!scope.cache[path[0]] || !scope.cache[path[0]].ready) {
            instances[path[0]] = 1;
        }

        switch (type) {

            // data handlers
            case ':':
            case '.':
                sequences[pointer] = sequences[pointer] || {};
                sequences[pointer].s = sequences[pointer].s || [];
                sequences[pointer].s.push([path[1], args, path[0], (type === '.')]);
                return;

            // stream handlers
            case '>':
            case '*':
                sequences.push({
                    t: type,
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
function parseSequence (scope, event, sequences) {

    for (var i = 0, l = sequences.length, sequence; i < l; ++i) {
        sequence = sequences[i];

        // sequence path
        if (sequence.p) {
            sequence.p[0] = scope.cache[sequence.p[0]].inst;
            if (sequence.t === '*' && !(sequence.p[1] = libob.path(sequence.p[1], sequence.p[0]))) {
                return event.emit('error', new Error('Flow.parse: Method "' + sequence[1] + '" not found.'));
            }
        }

        // sequence handlers
        if (sequence.s) {
            sequence.s.forEach(function (value, index) {

                value[2] = scope.cache[value[2]].inst;

                if (!(value[0] = libob.path(value[0], value[2]))) {
                    return event.emit('error', new Error('Flow.parse: Method on instance "' + value[2]._name + '" not found.'));
                }
            });
        }
    }

    event.s = sequences;
    event.ready = true;
    event.emit('ready', event);
}
