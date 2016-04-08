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
    node.end = end.bind(node._i, scope, key);
    node.pipe = node._i.pipe.bind(node._i);
    node.unpipe = node._i.unpipe.bind(node._i);

    node.join = join;
    node.link = link;
    node.name = key;

    node.on('error', function (err) {
        node.emit('end', err);
    });

    return node;
};

function end (scope, key, chunk) {
    this.end(chunk);
    delete scope.streams[key];
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

function link (options, instance, event) {
    var node = this;

    // pipe event transform streams
    event.s.forEach(function (sequence) {

        options._ = sequence.a || {};

        // create sequence transform
        if (sequence.s) {
            node.join(Sequence(options, sequence.s));
        }

        // link to next node
        if (sequence.p) {

            // pipe to flow event
            if (typeof sequence.p[1] === 'string') {
                node.join(sequence.p[0].flow(sequence.p[1], options));

            // call stream handler
            } else {
                node.join(sequence.p[1].call(sequence.p[0], options, node._o || node._i));
            }
        }
    });

    // end event
    if (event.e) {
        node.on('end', function () {
            instance.inst.flow(event.e, options).end(event);

            // end also error event
            if (node._re) {
                node._re.end();
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
