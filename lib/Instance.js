
module.exports = (loader, instance_name) => {

    return {
        build: () => {},
        event: () => {},
        args: () => {}
    };
};

/*
// handler target instance
exports.instance = (loader, subject, object) => {

    //console.log('sequence:', subject);
    //console.log('#I instance:', object);

    const cache_key = 'i:' + object;
    let scope = loader.scope;

    // get cached instance
    let cached_inst = scope.cache.get(cache_key);
    if (cached_inst) {
        loader.emit('done', 'instance', cached_inst);
        return;
    }

    if (cached_inst === null) {
        return;
    }

    // TODO load module instance configuration

    // create new flow emitter
    var instance = Object.create(module);
    instance.flow = scope.flow.bind(null, config.name);
    instance._name = config.name;
    instance._reset = scope.reset;
    instance._config = config.config || {};

    // extend loader
    loader.module = config.module;
    loader.name = config.name;
    loader.roles = config.roles || {};
    loader.flow = config.flow || {};
    loader.parsed = {};

    var ready = function (err, data) {

        if (err) {
            return loader.emit('error', err);
        }

        // mark instance as ready
        loader.inst = instance;
        loader.ready = true;
        loader.emit('ready', loader);
    };

    // init loader instance
    instance.init ? instance.init(config.config || {}, ready) : ready();
};
*/
