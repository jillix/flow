const EE = require('events');

module.exports = (instance_name, args, scope) => {

    // get/load instance
    //console.log('Instance.factory:', instance_name);
    const obs = new EE();
    const cache_key = 'i:' + instance_name; 
    const onModule = (_obs) => {
        _obs.on('ready', (module) => {

            var instance = Object.create(module);
            instance.flow = (inst_name, event, args) => {
                scope.flow(inst_name || instance_name, event, args);
            };
            instance._name = instance_name;
            instance._reset = scope.reset;

            obs.instance = instance;
            check(obs);
        });
    };

    const check = (obs) => {

        if (!obs.instance || !obs.args) {
            return;
        }

        let args = obs.args;
        let instance = obs.instance;
        let ready = function (err, data) {

            if (err) {
                return obs.emit('error', err);
            }

            // update cache
            scope.cache.set(cache_key, instance);

            // ?mark instance as ready
            //obs.ready = true;

            obs.emit('ready', instance);
        };

        // append args to instance, for modules with no init method
        instance._args = args;

        // init loader instance
        instance.init ? instance.init(args, ready) : ready();
    };

    const onArgs = (_obs) => {
        _obs.on('ready', (args) => {
            obs.args = args[instance_name] || {};
            check(obs);
        });
    };

    obs.module = onModule;
    obs.args = onArgs;

    // get cached instance
    let cached_inst = scope.cache.get(cache_key);
    if (cached_inst) {
        process.nextTick(() => {
            obs.emit('ready', cached_inst);
        });
        return obs;
    }

    if (cached_inst === null) {
        return obs;
    }
    scope.cache.set(cache_key, null);

    // TODO load module instance configuration 
    scope.read(instance_name, null, args); 

    return obs;
};