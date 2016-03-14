var EventEmitter = require('events');

module.exports = function Node (options) {

    var node = new EventEmitter();
    node._corked = true;
    node._writableState = {needDrain: false};
    node.chunks = [];
    node.pipes = [];

    // write to input sequence
    node.write = function (chunk) {

        // buffer writes if input is full or not yet set
        if (!node._corked && node.input) {
            if (!node.input.write(chunk)) {
                node._corked = true;
                node._writableState.needDrain = true;
            }

            return;
        }

        node.chunks.push(chunk);
    };

    // pipe
    node.pipe = function (dest) {

        if (node.output) {
            return node.output.pipe(dest);
        }

        node.pipes.push(des);
    };

    node.unpipe = function (dest) {

        if (node.output) {
            return node.output.unpipe(dest);
        }

        // ..remove from node.pipes array
    };
    
    // set seq
    node._link = function (input, output) {

        node.output = output;
        node.input = input;

        // bind ouput events to node
        output.on('end', node.emit.bind(node, 'end'));
        output.on('data', node.emit.bind(node, 'data'));
        output.on('error', node.emit.bind(node, 'error'));

        if (node.pipes[0]) {
            node.pipes.forEach(output.pipe.bind(output));
        }

        // write bufferd chunks to input after drain
        input.on('drain', function () {
            node._corked = false;
            node._writableState.needDrain = false;
            node.emit('drain');

            // emit buffered chunks
            node.chunks.forEach(input.write.bind(input));
            node.chunks = [];
        });

        // write chunks to input if node has ended already
        if (node.ended) {
            node.chunks.forEach(input.write.bind(input));
            node.chunks = [];
            input.end();
        }

        node._corked = false;
    };

    // ending
    node.end = function (chunk) {
        node.ended = true;
        if (node.input) {
            node.input.end(chunk);
        }
    };

    return node;
};
