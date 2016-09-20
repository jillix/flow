const EE = require('events');

module.exports = (module_name, args, scope) => {

    //console.log('Module.factory:', module_name);
    const obs = new EE();
    const cache_key = 'm:' + module_name;

    // get cached module
    let cached_module = scope.cache.get(cache_key);
    if (cached_module) {
        process.nextTick(() => {
            obs.emit('ready', cached_module);
        });
        return obs;
    }

    if (cached_module === null) {
        return obs;
    }

    scope.cache.set(cache_key, null);
    scope.mod(module_name, args, (err, module) => {

        if (err) {
            return obs.emit('error', err);
        }

        scope.cache.set(cache_key, module);
        obs.emit('ready', module);
    });

    return obs;
};
