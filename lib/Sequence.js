const EE = require('events');
const libob = require('libobject');

module.exports = (seq_name, args, scope) => {

    //console.log('Sequence.factory:', seq_name);
    const obs = new EE();
    const cache_key = 's:' + seq_name;

    obs.link = (sequence) => {
        //console.log('Sequence.link:', sequence);
        return obs;
    },
    obs.instance = (instance) => {
        //console.log('Sequence.instance:', instance);
        return obs;
    };
    obs.data = (instance, method) => {
        //console.log('Sequence.data:', method);
        return obs;
    };
    obs.stream = (method) => {
        //console.log('Sequence.stream:', method);
        obs.on('instance', (seq) => {
            // get method ref
            // seq.instance[method]
            
        });
        return obs;
    };
    obs.emit = (_obs) => {
        //console.log('Sequence.emit:', event);
        return obs;
    };
    obs.args = (_obs) => {
        _obs.on('ready', (args) => {
            //console.log('Sequence.args:', args[cache_key]);
        });
        return obs;
    };

    // get cached sequence
    let cached_sequence = scope.cache.get(cache_key);
    if (cached_sequence) {
        process.nextTick(() => {
            obs.emit('ready', cached_sequence);
        });
        return obs;
    }

    if (cached_sequence === null) {
        return obs;
    }
    scope.cache.set(cache_key, null);

    return obs;
};
/*
    var getMethodRef = function (handler) {
        handler[0] = scope.instances[handler[0]].inst;

        if (!(handler[1] = libob.path(handler[1], handler[0]))) {
            return event.emit('error', new Error('Flow.parse: Method on instance "' + handler[0]._name + '" not found.'));
        }
    };
}
*/
