var EventEmitter = require('events');
var PassThrough = require('stream').PassThrough;
var Sequence = require('./sequence');

module.exports = (scope, key, args) => {

    var node = new EventEmitter();
    node._om = args.objectMode !== undefined ? args.objectMode : true;
    node._i = new PassThrough({objectMode: node._om});
    node._i.on('error', error => node.emit('error', error));
    node._i.cork();

    node.write = chunk => node._i.write(chunk);
    node.end = chunk => {

		scope.cache.del('s:' + node.name);

		// wait until node is ready, so no bufferted chunks are missed
        if (!node.ready) {
            node.once('ready', () => {
                node._i.end(chunk);
            });
        } else {
		    node._i.end(chunk);
        }
	};

	// TODO find a better solution for substream that are closed (duplex, writable)
    node.on('unpipe', () => node.end());
    node.pipe = pipe;
    node.unpipe = dest => node._i.unpipe(dest);

    node.link = link;
    node.name = key;
    node.scope = scope;

    return node;
};

function pipe (dest) {
    const self = this;

    if (self.ready) {
        return self._i.pipe(dest);
    }

    self.once('ready', () => self._i.pipe(dest));

    return dest;
}

function join (node, output) {

    if (output) {

        // don't pipe the same node into itself
        if (node._o && node._o.name && output.name === node._o.name) {
            return;
        }

        // emit sequence errors on node
        output.on('error', error => node.emit('error', error));

        // pipe and set node output if ouput is duplex
        if ((output.readable && output.writable) || (output._i && output.link)) {
            node._o = node._o ? node._o.pipe(output) : node.pipe(output);

        // overwrite output if sequence is readonly
        } else if (output.readable && !output.writable) {
            node._o = output;

        // pipe output to custom writable
        } else if (output.writable && !output.readable) {
            (node._o || node).pipe(output);
        }
    }
}

function link (args, event) {
    const node = this;

    node.ready = true;

    // pipe event transform streams
    event.s.forEach(function (sequence, index) {
        switch (sequence[0]) {

            // data handler
            case 0:
                sequence[1].forEach(function (handler) {
                    join(node, Sequence(args, handler));
                });
                break;

            // stream handler
            case 1:
                args._ = sequence[1][2] || {};
                join(node, sequence[1][1].call(sequence[1][0], args, node._o || node._i));
                break;

            // flow emit
            case 2:
                args._ = sequence[1][2] || {};
                join(node, sequence[1][0].flow(sequence[1][1], args));
                break;
        }
    });

    node.emit('ready');

    let output = (node._o || node);

    // end event
    if (event.e) {
        node._ee = node.scope.flow(event.e, args);
        output.on('end', () => {

            node._ee.end();

            // end also error event
            if (node._re) {
                node._re.end();
            }
        });
    }

    // error events
    if (event.r) {
        node._re = node._re || node.scope.flow(event.r, args);
        node.on('error', (error) => {
            node._re.write(error);
        });

    // log error and prevent process crash
    } else if (node.listenerCount('error') < 1) {
        node.on('error', (error) => {
            console.error(error);
        });
    }

    output.on('data', chunk => node.emit('data', chunk));
	output.once('end', () => {
		node.scope.cache.del('s:' + node.name);
		node.emit('end');
	});
    node._i.uncork();
}
