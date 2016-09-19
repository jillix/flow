module.exports = (loader, module, instance) => {

    //console.log('#M instance:', subject);
    //console.log('module:  ', object);

    const cache_key = 'm:' + module;
    let scope = loader.scope;

    // get cached module
    let cached_module = scope.cache.get(cache_key);
    if (cached_module) {
        loader.emit('done', 'module', cached_module);
        return;
    }

    if (cached_module === null) {
        return;
    }

    scope.cache.set(cache_key, null);
    scope.mod(module, loader.args, (err, module) => {

        if (err) {
            return loader.emit('error', err);
        }

        scope.cache.set(cache_key, module);
        loader.emit('done', 'module', module);
    });
};
