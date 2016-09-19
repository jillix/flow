module.exports = (loader, event_name, instance_name) => {

    return {
        link: () => {},
        onEnd: () => {},
        onError: () => {}
    };
};
/*
exports.event = (loader, subject, object) => {
    loader.emit('done', 'event')
    //console.log('#E instance:', subject);
    //console.log('event:   ', object);
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
};

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
*/
