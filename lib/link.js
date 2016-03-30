var Node = require('./node');
var Sequence = require('./sequence');
var Load = require('./load');
var Parse = require('./parse');

module.exports = function Link (scope, event, options) {

    var node = Node();

    // load instance, parse event and get flow stream sequences
    Load(scope, node, event[0], options, function (instance) {
        Parse(scope, node, instance, event[1], options, function (event) {

            // pipe event transform streams
            event.s.forEach(function (sequence) {

                options._ = sequence.a || {};

                // create sequence transform
                if (sequence.s) {
                    node._seq(Sequence(options, sequence.s));
                }

                // link to next node
                if (sequence.p) {

                    // pipe to flow event
                    if (typeof sequence.p[1] === 'string') {
                        node._seq(sequence.p[0].flow(sequence.p[1], options));

                    // call stream handler
                    } else {
                        node._seq(sequence.p[1].call(sequence.p[0], options, node._o));
                    }
                }
            });

            // link sequence to node
            node._link(instance, event);

            // end event
            if (event.e) {
                node.on('end', function () {
                    var eventName = event.e;
                    var options;
                    if (eventName instanceof Array) {
                        options = eventName[1];
                        eventName = eventName[0];
                    }
                    var ee = instance.inst.flow(eventName, options);
                    ee.end();
                    if (node._re) {
                        node._re.end();
                    }
                });
            }

            // error events
            if (event.r) {
                node.on('error', function (err) {
                    if (!node._re) {
                        var eventName = event.r;
                        var options;
                        if (eventName instanceof Array) {
                            options = eventName[1];
                            eventName = eventName[0];
                        }
                        node._re = instance.inst.flow(eventName, options);
                    }
                    node._re.write(err)
                });
            }
        });
    });

    return node;
};
