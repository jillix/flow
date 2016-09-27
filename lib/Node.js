const EventEmitter = require('events');
const PassThrough = require('stream').PassThrough;
const Data = require('./Data');

module.exports = (scope, name, args) => {

    const node = new EventEmitter();
    node._om = args.objectMode !== undefined ? args.objectMode : true;
    node._i = new PassThrough({objectMode: node._om});
    node._i.on('error', error => node.emit('error', error));
    node._i.cork();

    node.write = chunk => node._i.write(chunk);
    node.end = chunk => {

		scope.cache.del('s:' + node.name);

		// wait until node is ready, so no bufferted chunks are missed
        if (!node.ready) {
            node.once('ready', () => node._i.end(chunk));
        } else {
		    node._i.end(chunk);
        }
	};

	// TODO find a better solution for substream that are closed (duplex, writable)
    node.on('unpipe', () => node.end());
    node.unpipe = dest => node._i.unpipe(dest);
    node.pipe = dest => {
        if (node.ready) {
            return node._i.pipe(dest);
        }

        node.once('ready', () => node._i.pipe(dest));

        return dest;
    };

    node.link = link;
    node.name = name;
    node.scope = scope;

    return node;
};

function createStream (node, args, handler) {

    // TODO this will break module functionality! Update module arguments.
    let handler_args = Object.assign({}, handler.args, args);
    let stream;

    switch (handler.type) {
        // data handler
        case 0:
            stream = Data(handler_args, handler);
            break;

        // stream handler
        case 1:
            if (!(stream = handler.method.call(handler.instance, handler_args, node._o || node._i))) {
                return;
            }
            break;

        // flow emit
        case 2:
            stream = sequence.method.flow(handler.instance, handler_args);
            break;
    }

    return stream;
}

function join (node, args, handler, sequence, handlers) {

    let A = handler;
    let B = sequence[handler];

    if (!node.sequence[A]) {
        A = node.sequence[A] = createStream(node, args, handler[A]);
        A.on('error', error => node.emit('error', error));
    } else {
        A = node.sequence[A];
    }

    if (B) {
        if (!node.sequence[B]) {
            B = node.sequence[B] || (node.sequence[B] = createStream(node, args, handler[B]));
            B.on('error', error => node.emit('error', error));
        } else {
            B = node.sequence[B];
        }

        if (A.readable && B.writable) {
            A.pipe(B);
        }
    } else {
        node._o = A;
    }

    if (A.writable && handler[A].first) {
        node.pipe(A);
    }
}

function link (args, event) {
    const node = this;

    node.ready = true;
    node.sequence = {};

    // pipe event transform streams
    for(let handler in event.sequence) {
        join(node, args, handler, event.sequence, event.handlers);
    };

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
        node._re = node.scope.flow(event.r, args);
        node.on('error', error => node._re.write(error));

    // log error and prevent process crash
    } else if (node.listenerCount('error') < 1) {
        node.on('error', error => console.error(error));
    }

    output.on('data', chunk => node.emit('data', chunk));
	output.once('end', () => {
		node.scope.cache.del('s:' + node.name);
		node.emit('end');
	});

    node._i.uncork();
}
