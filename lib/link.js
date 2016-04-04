var Node = require('./node');
var Sequence = require('./sequence');
var Load = require('./load');
var Parse = require('./parse');

module.exports = function Link (scope, event, options) {

    var node = Node(event);

    // load instance, parse event and get flow stream sequences
    Load(scope, node, event[0], options, function (instance) {
        Parse(scope, node, instance, event[1], options, function (parsed) {

            // pipe event transform streams
            parsed.s.forEach(function (sequence) {

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
                        node._seq(sequence.p[1].call(sequence.p[0], options, node._o || node._i));
                    }
                }
            });

            // end event
            if (parsed.e) {
                node.on('end', function () {
                    instance.inst.flow(parsed.e, options).end(node._event);

                    // end also error event
                    if (node._re) {
                        node._re.end();
                    }
                });
            }

            // error events
            if (parsed.r) {
                node.on('error', function (err) {
                    node._re = node._re || instance.inst.flow(parsed.r, options);
                    node._re.write(err);
                });

            // log error and prevent process crash
            } else if (node.listenerCount('error') < 1) {
                node.on('error', console.error.bind(console));
            }

            // link sequence to node
            node._link();
        });
    });

    return node;
};
