var EventEmitter = require('events');
var PassThrough = require('stream').PassThrough;
var Sequence = require('./sequence');

module.exports = function (scope, key) {

    // TODO make objectMode configurable
    var node = new EventEmitter();
    node._i = new PassThrough({objectMode: true});
    node._i.on('error', node.emit.bind(node, 'error'));
    node._i.cork();

    node.write = node._i.write.bind(node._i);
    node.end = function (chunk) {

		delete scope.streams[node.name];

		// wait until node is ready, so no bufferted chunks are missed
        if (!node.ready) {
            node.once('ready', node._i.end.bind(node._i, chunk));
        } else {
		    node._i.end(chunk);
        }
	};

	// TODO find a better solution for substring that are closed (duplex, writable)
    node.on('unpipe', node.end.bind(node));

    node.pipe = pipe;
    node.unpipe = node._i.unpipe.bind(node._i);

    node.join = join;
    node.link = link;
    node.name = key;
    node.scope = scope;

    return node;
};

function pipe (dest) {
    if (this.ready) {
        return this._i.pipe(dest);
    }

    this.once('ready', this._i.pipe.bind(this._i, dest));

    return dest;
}

function join (output) {
    if (output) {

        // don't pipe the same node into itself
        if (this._o && this._o.name && output.name === this._o.name) {
            return;
        }

        // bind sequence errors to node
        output.on('error', this.emit.bind(this, 'error'));

        // pipe and set node output if ouput is duplex
        if ((output.readable && output.writable) || (output._i && output.join && output.link)) {
            this._o = this._o ? this._o.pipe(output) : this.pipe(output);

        // overwrite output if sequence is readonly
        } else if (output.readable && !output.writable) {
            this._o = output;

        // pipe output to custom writable
        } else if (output.writable && !output.readable) {
            (this._o || this).pipe(output);
        }
    }
}

function link (options, event) {
    var node = this;
    var instance = event.i;

    node.ready = true;

    // pipe event transform streams
    event.s.forEach(function (sequence, index) {
        switch (sequence[0]) {
            case 0:
                sequence[1].forEach(function (handler) {
                    node.join(Sequence(options, handler));
                });
                break;

            case 1:
                options._ = sequence[1][1] || {};
                node.join(sequence[1][0][0].call(sequence[1][0][1], options, node._o || node._i));
                break;

            case 2:
                options._ = sequence[1][1] || {};
                node.join(sequence[1][0][0].flow(sequence[1][0][1], options));
                break;
        }
    });

    this.emit('ready');

    var output = (this._o || this);

    // end event
    if (event.e) {
        node._ee = instance.inst.flow(event.e, options);
        output.on('end', function () {

            node._ee.end();

            // end also error event
            if (node._re) {
                node._re.end();
            }
        });
    }

    // error events
    if (event.r) {
        node._re = node._re || instance.inst.flow(event.r, options);
        node.on('error', node._re.write.bind(node._re));

    // log error and prevent process crash
    } else if (node.listenerCount('error') < 1) {
        node.on('error', console.error.bind(console));
    }

    output.on('data', this.emit.bind(this, 'data'));
	output.once('end', function () {
		delete node.scope.streams[node.name];
		node.emit('end');
	});
    this._i.uncork();
}
