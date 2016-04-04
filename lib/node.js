var EventEmitter = require('events');
var isStream = require('isstream');

module.exports = function Node (event) {

    var node = new EventEmitter();
    node._event = event
    node._corked = true;
    node._writableState = {needDrain: false};
    node._readable = true;
    node._writable = true;
    node.chunks = [];
    node.pipes = [];

    // remove all event listeners on end
    node.on('end', process.nextTick.bind(process, node.removeAllListeners.bind(node)));

    // write to input sequence
    node.write = function (chunk) {

        if (node.ended) {
            return;
        }

        if (!node._corked) {

            // emit data on node if no input is set
            if (node._i === null) {
                node.emit('data', chunk);
                return;
            }

            // write to input
            if (node._i) {

                // cork node if input is full
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
            node.write(chunk);
            return node.emit('end');
        }

        if (node._i) {
            return node._i.end(chunk);
        }

        if (chunk !== undefined) {
            node.chunks.push(chunk);
        }
    };

    // pipe
    node.pipe = function (dest) {

        if (node._o) {
            return node._o.pipe(dest);
        }

        if (node._o === null) {
            node.on('data', dest.write.bind(dest));
            node.on('end', dest.end.bind(dest));
            return;
        }

        node.pipes.push(dest);
        return dest;
    };

    // unpipe
    node.unpipe = function (dest) {

        if (node._o) {
            return node._o.unpipe(dest);
        }

        // reset pipes cache
        // TODO not yet tested
        node.pipes = [];
    };

    // build sequence
    node._seq = function (output) {

        if (output) {

            // bind sequence errors to node
            output.on('error', node.emit.bind(node, 'error'));

            // pipe and set node output if ouput is duplex
            if ((
                output._event instanceof Array &&
                output._chunks instanceof Array
            ) || isStream.isDuplex(output)) {
                node._i = node._i || output;
                node._o = node._o ? node._o.pipe(output) : output;

            // overwrite output if sequence is readonly
            } else if (isStream.isReadable(output) && !isStream.isDuplex(output)) {
                node._oow = true;
                node._o = output;

            // pipe output to custom writable
            } else if (isStream.isWritable(output) && !isStream.isDuplex(output)) {
                (node._o || node).pipe(output);
            }
        }
    };

    // link sequence I/O to node
    node._link = function () {

        var input = node._i = node._i || null;
        var output = node._o = node._o || null;
        node._corked = false;

        // link input
        if (input) {

            node.chunks.forEach(input.write.bind(input));

            // write bufferd chunks to input after drain
            // TODO not yet tested
            input.on('drain', function () {

                node._corked = false;
                node._writableState.needDrain = false;
                node.emit('drain');

                // emit buffered chunks
                node.chunks.forEach(input.write.bind(input));
                node.chunks = [];
            });
        }

        // bind output events to node
        if (output) {

            // end event
            output.on('end', node.emit.bind(node, 'end'));

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

        // write chunks to input if node has ended already
        if (node.ended) {

            if (input) {
                input.end(node.chunks.length ? undefined : 1);

            // if a custom readable stream pipes into the flow stream,
            // we don't have to emit "end" here. cause the custom stream
            // will end the flow stream.
            } else if (!node._oow) {
                node.chunks.forEach(node.emit.bind(node, 'data'));
                node.emit('end');
            }

            node.chunks = [];
        }
    };

    return node;
};
