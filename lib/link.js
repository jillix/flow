var Node = require('./node');
var Sequence = require('./sequence');
var Load = require('./load');
var Parse = require('./parse');

module.exports = function Link (scope, event, options) {

    var node = Node(options);

    // load instance, parse event and get flow stream sequences
    Load(scope, node, event[0], options).once('_flow_load', function (instance) {
        Parse(scope, node, instance, event[1], options).once('_flow_event', function (event) {

            var seq, first, prev;
            event.s.forEach(function (sequence) {

                // create sequence transform
                if (sequence.s) {
                    seq = Sequence(options, sequence.s);
                    seq.on('error', node.emit.bind(node, 'error'));
                    first = first || seq;
                    prev = prev ? prev.pipe(seq) : seq;
                }

                // link to next node
                if (sequence.p) {

                    // pipe to flow event
                    if (typeof sequence.p[1] === 'string') {
                        seq = sequence.p[0].flow(sequence.p[1], options);


                    // call stream handler
                    } else {
                        options._ = sequence.a || {};
                        seq = sequence.p[1].call(sequence.p[0], options);
                    }

                    seq.on('error', node.emit.bind(node, 'error'));
                    first = first || seq;
                    prev = prev ? prev.pipe(seq) : seq;
                }
            });

            // end event
            if (sequence.e) {
                var endNode = instance.flow(sequence.e);
                node.on('end', endNode.write.bind(endNode, true));
            }

            // error event
            if (sequence.r) {
                var errNode = instance.flow(sequence.r);
                node.on('error', errNode.write.bind(errNode));
            }

            // set sequence on node
            node.link(first, prev);
        });
    });

    return node;
};
