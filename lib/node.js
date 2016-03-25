var EventEmitter = require('events');

module.exports = function Node () {

    var node = new EventEmitter();
    node._corked = true;
    node._writableState = {needDrain: false};
    node.chunks = [];
    node.pipes = [];

    // write to input sequence
    node.write = function (chunk) {

        if (!node._corked) {

            // emit data on node if no input is set
            if (node._i === null) {
                node.emit('data', chunk);
                return;
            }

            // buffer writes if input is full or not yet set
            if (node._i) {
                if (!node._i.write(chunk)) {
                    node._corked = true;
                    node._writableState.needDrain = true;
                }

                return;
            }
        }

        // buffer chunks until node is linked
        if (chunk !== undefined) {
            node.chunks.push(chunk);
        }
    };

    // ending
    node.end = function (chunk) {
        node.ended = true;

        if (node._i === null) {
            return node.emit('end', chunk);
        }

        if (node._i) {
            node._i.end(chunk);
        }

        if (chunk !== undefined) {
            node.chunks.push(chunk);
        }
    };

    // pipe
    node.pipe = function (dest) {

        if (node._o === null) {
            node.on('data', dest.write.bind(dest));
            node.on('end', dest.end.bind(dest));
        }

        if (node._o) {
            return node._o.pipe(dest);
        }

        node.pipes.push(dest);
    };

    // unpipe
    node.unpipe = function (dest) {

        if (node._o) {
            return node._o.unpipe(dest);
        }

        // ..remove from node.pipes array
    };

    // build sequence
    node._seq = function (output) {
        if (output) {
            output.on('error', node.emit.bind(node, 'error'));
            node._i = node._i || output;
            node._o = node._o && output.write ? node._o.pipe(output) : output;
        }
        return output;
    };

    // link sequence I/O to node
    node._link = function (instance, event) {

        var input = node._i = node._i || null;
        var output = node._o = node._o || null;

        // link input
        if (input) {

            // write bufferd chunks to input after drain
            input.on('drain', function () {
                node._corked = false;
                node._writableState.needDrain = false;
                node.emit('drain');

                // emit buffered chunks
                node.chunks.forEach(input.write.bind(input));
                node.chunks = [];
            });
        }

        // write chunks to input if node has ended already
        if (node.ended) {
            if (input) {
                node.chunks.forEach(input.write.bind(input));
                input.end(node.chunks.length ? undefined : 1);
            } else {
                node.chunks.forEach(node.emit.bind(node, 'data'));
            }

            node.chunks = [];
        }

        // bind output events to node
        if (output) {

            // end event
            output.on('end', function () {
                if (event.e && !node._ee) {
                    node._ee = instance.flow(event.e);
                    node._ee.end(1);
                }
                node.emit('end');
            });

            // error event
            output.on('error', function (err) {
                if (event.r) {
                    node._re = node._re || instance.flow(event.r);
                    node._re.write(err);
                }
                node.emit('error', err);
            });

            // data event
            output.on('data', node.emit.bind(node, 'data'));

            // pipe ouput
            if (node.pipes[0]) {
                node.pipes.forEach(output.pipe.bind(output));
            }

        } else if (node.pipes.length) {
            node.pipes.forEach(node.pipe.bind(node));
            node.pipes = [];
        }

        node._corked = false;
    };

    return node;
};
