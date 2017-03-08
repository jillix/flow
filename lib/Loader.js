"use strict"

const EventEmitter = require("events");

module.exports = (adapter, cache_id, cached, resolve, main) => {

    const fromCache = adapter.cache.get(cache_id);
    if (fromCache) {
        if (fromCache.loading) {
            return new Promise((res, reject) => {
                fromCache.once("resolve", (value) => {
                    resolve(res, value);
                });
                fromCache.once("reject", reject);
            });
        } else {
            return cached(fromCache);
        }
    }

    return new Promise((res, reject) => {

        const loader = new EventEmitter();
        loader.loading = true;
        loader.wait = [];
        loader.once("reject", (err) => {
            adapter.cache.del(cache_id);
            reject(err);
        });
        loader.once("resolve", (value) => {
            adapter.cache.set(cache_id, value);
            resolve(res, value);
        });

        loader.resolve = (value) => {
            if (loader.wait.length) {
                Promise.all(loader.wait)
                .then(() => {loader.emit("resolve", value)})
                .catch((err) => {loader.emit("reject", err)});
            } else {
                loader.emit("resolve", value);
            }
        };

        loader.reject = (err) => {
            loader.emit("reject", err);
        };

        adapter.cache.set(cache_id, loader);

        main(loader);
    });
};
