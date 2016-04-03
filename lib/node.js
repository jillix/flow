var EventEmitter = require('events');
var Stream = require('stream');

function debug (node, type, msg) {
    //if (type === 'WRITE' || type === 'LINK') {
        console.log('DEBUG', '"' + type + '"', node._debugName, '|', msg);
    //}
} 

module.exports = function Node (_event) {

    var node = new EventEmitter();
    node._corked = true;
    node._writableState = {needDrain: false};
    node.chunks = [];
    node.pipes = [];

    // ! debug
    node._debugName = _event[0] + '/' + _event[1];

    // write to input sequence
    node.write = function (chunk) {

debug(node, 'WRITE', chunk);

        if (!node._corked) {

debug(node, 'WRITE', 'pipe open');

            // emit data on node if no input is set
            if (node._i === null) {

debug(node, 'WRITE', 'no input');

                node.emit('data', chunk);
                return;
            }

            // write to input
            if (node._i) {

debug(node, 'WRITE', 'input exists');

                // cork node if input is full
                if (!node._i.write(chunk)) {

debug(node, 'WRITE', 'input full');
                    node._corked = true;
                    node._writableState.needDrain = true;
                }

                return;
            }
        }

debug(node, 'WRITE', 'buffer chunk');

        // buffer chunks until node is linked
        if (chunk !== undefined) {
            node.chunks.push(chunk);
        }
    };

    // ending
    node.end = function (chunk) {
        node.ended = true;

        if (node._i === null) {

debug(node, 'END', 'no input');

            return node.emit('end', chunk);
        }

        if (node._i) {

debug(node, 'END', 'end input');

            return node._i.end(chunk);
        }

debug(node, 'END', 'buffer chunks', typeof node._o);

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
        }

        node.pipes.push(dest);
        return dest;
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

debug(node, 'SEQ', 'Output:' + typeof output);

        if (output) {
            //output.on('error', node.emit.bind(node, 'error'));
            node._i = node._i || output;
            node._o = node._o && output.write ? node._o.pipe(output) : output;

debug(node, 'SEQ', 'Output.write:' + typeof output.write);

        }
        return output;
    };

    // link sequence I/O to node
    node._link = function (instance, event) {

debug(node, 'LINK', 'Input: ' + typeof node._i + ' Output: ' + typeof node._o);

        var input = node._i = node._i || null;
        var output = node._o = node._o || null;
        node._r = event.r;
        node._e = event.e;
        node._corked = false;

// bufferd chunks?
// input? write to input

        // link input
        if (input && input.write) {

debug(node, 'LINK', 'input exists');

            node.chunks.forEach(input.write.bind(input));

            // write bufferd chunks to input after drain
            input.on('drain', function () {

debug(node, 'LINK', 'input drain');

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

            // error event
            output.on('error', function (err) {
                node.emit('error', err);
            });

debug(node, 'LINK', 'output: pipe:' + typeof output.pipe + ', write: ' + typeof output.write);

            // handle writable output
            if (output instanceof Stream.Writable) {
                output.on('finish', function () {
debug(node, 'LINK', 'output finish (writable)')
                    node.emit('end');
                });
            } else {

                // end event
                output.on('end', function () {

debug(node, 'LINK', 'output ended');

                    node.emit('end');
                    node.removeAllListeners();
                });

                // data event
                output.on('data', node.emit.bind(node, 'data'));

                // pipe ouput
                if (node.pipes[0]) {
                    node.pipes.forEach(output.pipe.bind(output));
                }
            }

        } else if (node.pipes.length) {
            node.pipes.forEach(node.pipe.bind(node));
            node.pipes = [];
        }

        // write chunks to input if node has ended already
        if (node.ended) {
            if (input) {
                if (input.end) {
                    input.end(node.chunks.length ? undefined : 1);
                }
            } else {
                node.chunks.forEach(node.emit.bind(node, 'data'));
                node.emit('end');
            }

            node.chunks = [];
        }

    };

    return node;
};
