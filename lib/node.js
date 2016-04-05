var EventEmitter = require('events');
var PassThrough = require('stream').PassThrough;

module.exports = function () {

    // TODO make objectMode configurable
    var node = new EventEmitter();
    node._i = new PassThrough({objectMode: true});
    node._i.on('error', node.emit.bind(node, 'error'));
    node._i.cork();
    node._i.pause();

    node.write = node._i.write.bind(node._i);
    node.end = node._i.end.bind(node._i);
    node.pipe = node._i.pipe.bind(node._i);
    node.unpipe = node._i.unpipe.bind(node._i);

    node.join = join;
    node.link = link;

    node.on('error', node.emit.bind(node, 'end'));

    return node;
};

function join (output) {
    if (output) {

        // bind sequence errors to node
        output.on('error', this.emit.bind(this, 'error'));

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

function link () {

    var output = (this._o || this._i);
    output.on('data', this.emit.bind(this, 'data'));
    output.on('end', this.emit.bind(this, 'end'));

    this._i.uncork();
    this._i.resume();
}
