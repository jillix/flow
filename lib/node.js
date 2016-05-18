var EventEmitter = require('events');
var PassThrough = require('stream').PassThrough;
var Sequence = require('./sequence');

module.exports = function (scope, key) {

    // TODO make objectMode configurable
    var node = new EventEmitter();
    node._i = new PassThrough({objectMode: true});
    node._i.on('end', end.bind(scope, node, '(from input)'));
    node._i.on('error', node.emit.bind(node, 'error'));
    node._i.cork();

    node.write = node._i.write.bind(node._i);
    node.end = function (lastChunk) {
        //end.call(scope, key, 'from method');
        //node.ended = 1;
        node._i.end(lastChunk);
    };

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

function end (node, origin) {
    console.log('Flow.node.end:', node.name, origin, node.ready, node.ended);

    if (!node.ended && node.ready) {
        node.emit('end');
    }
    node.ended = 1;

    delete this.streams[node.name];
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
//console.log('Duplex pipe to', (this._o ? '"output"' : '"input"'), 'and set as output.');
            this._o = this._o ? this._o.pipe(output) : this.pipe(output);

        // overwrite output if sequence is readonly
        } else if (output.readable && !output.writable) {
//console.log('Set Readable as output.');
            this._o = output;

        // pipe output to custom writable
        } else if (output.writable && !output.readable) {
//console.log('Writable pipe to', (this._o ? '"output"' : '"input"'));
            (this._o || this).pipe(output);
        }
    }
}

function link (options, event) {
    var node = this;
    var instance = event.i;

    node.ready = true;

//console.log('\nEvent:', node.name);

    // pipe event transform streams
    event.s.forEach(function (sequence, index) {
        switch (sequence[0]) {
            case 0:

//console.log(index + ' Data:');
//sequence[1].forEach(function (handler) {
//    console.log('    - handler:', handler[0][2]);
//});

                node.join(Sequence(options, sequence[1]));
                break;
            case 1:
//console.log(index + ' Stream:');
                options._ = sequence[1][1] || {};
                node.join(sequence[1][0][0].call(sequence[1][0][1], options, node._o || node._i));
                break;
            case 2:
//console.log(index + ' Flow:', sequence[1][0][1]);
                options._ = sequence[1][1] || {};
                node.join(sequence[1][0][0].flow(sequence[1][0][1], options));
                break;
        }
    });
//console.log('\n');

    this.emit('ready');

    var output = (this._o || this);

    // end event
    if (event.e) {
        output.on('end', function () {
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
        output.on('error', function (err) {
            node._re = node._re || instance.inst.flow(event.r, options);
            node._re.write(err);
        });

    // log error and prevent process crash
    } else if (node.listenerCount('error') < 1) {
        node.on('error', console.error.bind(console));
    }

    output.on('data', this.emit.bind(this, 'data'));
    output.on('end', end.bind(node.scope, node, '(from output)'));

//console.log('Uncork input:', node.name, '..output exists?', (this._o ? 'Yes' : 'No'));

    this._i.uncork();
}
