var EventEmitter = require('events');
var PassThrough = require('stream').PassThrough;
var Sequence = require('./sequence');

module.exports = function (scope, key) {

    // TODO make objectMode configurable
    var node = new EventEmitter();
    node._i = new PassThrough({objectMode: true});
    node._i.on('error', node.emit.bind(node, 'error'));
    node._i.cork();
    node._i.pause();

    node.write = node._i.write.bind(node._i);
    node.end = function (lastChunk) {
        end.call(scope, key);
        node._i.end(lastChunk);
    };
    node.pipe = node._i.pipe.bind(node._i);
    node.unpipe = node._i.unpipe.bind(node._i);

    node.join = join;
    node.link = link;
    node.name = key;

    // end node on error
    node.on('error', node.emit.bind(node, 'end'));

    // end input and remove from cache
    node.on('end', end.bind(scope, key));

    return node;
};

function end (key) {
    delete this.streams[key];
}

function join (output) {
    if (output) {

        // don't pipe the same node into itself
        if (this._o && this._o.name && output.name === this._o.name) {
            return;
        }

        // bind sequence errors to node
        if (output.listenerCount('error') < 1) {
            output.on('error', this.emit.bind(this, 'error'));
        }

        // pipe and set node output if ouput is duplex
        if ((output.readable && output.writable) || (output._i && output.join && output.link)) {
            this._o = this._o ? this._o.pipe(output) : this._i.pipe(output);

        // overwrite output if sequence is readonly
        } else if (output.readable && !output.writable) {
            this._o = output;

        // pipe output to custom writable
        } else if (output.writable && !output.readable) {
            (this._o || this._i).pipe(output);
        }
    }
}

function link (options, event) {
    var node = this;
    var instance = event.i;

    // pipe event transform streams
    event.s.forEach(function (sequence) {
        switch (sequence[0]) {
            case 0:
                node.join(Sequence(options, sequence[1]));
                break;
            case 1:
                options._ = sequence[1][1] || {};
                node.join(sequence[1][0][0].call(sequence[1][0][1], options, node._o || node._i));
                break;
            case 2:
                options._ = sequence[1][1] || {};
                node.join(sequence[1][0][0].flow(sequence[1][0][1], options));
        }
    });

    // end event
    if (event.e) {
        node.on('end', function () {
            instance.inst.flow(event.e, options).end();

            // end also error event
            if (node._re) {
                node._re.end();
                node._re = undefined;
            }
        });
    }

    // error events
    if (event.r) {
        node.on('error', function (err) {
            node._re = node._re || instance.inst.flow(event.r, options);
            node._re.write(err);
        });

    // log error and prevent process crash
    } else if (node.listenerCount('error') < 1) {
        node.on('error', console.error.bind(console));
    }

    var output = (this._o || this._i);
    output.on('data', this.emit.bind(this, 'data'));
    output.on('end', this.emit.bind(this, 'end'));

    this._i.uncork();
    this._i.resume();
}
