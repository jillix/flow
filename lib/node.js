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
    node.end = function (lastChunk) {
        end.call(scope, key);
        node._i.end(lastChunk);
    };

    node.pipe = pipe;
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

function pipe (dest) {
    if (this.ready) {
        return this._i.pipe(dest);
    }

    this.once('ready', this._i.pipe.bind(this._i, dest));

    return dest;
}

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

    var output = (this._o || this);
    output.on('data', this.emit.bind(this, 'data'));
    output.on('end', this.emit.bind(this, 'end'));

//console.log('Uncork input:', node.name, '..output exists?', (this._o ? 'Yes' : 'No'));

    this._i.uncork();
}
