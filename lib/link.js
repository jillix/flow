var Node = require('./node');
var Sequence = require('./sequence');
var Load = require('./load');
var Parse = require('./parse');

module.exports = function Link (scope, event, options) {

    var node = Node(options);

    // load instance, parse event and get flow stream sequences
    Load(scope, node, event[0], options, function (instance) {
        Parse(scope, node, instance, event[1], options, function (event) {

            // pipe event transform streams
            event.s.forEach(function (sequence) {

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
                        options._ = sequence.a || {};
                        node._seq(sequence.p[1].call(sequence.p[0], options, node.output));
                    }
                }
            });

            // link sequence to node
            node._link(instance, event);
        });
    });

    return node;
};
