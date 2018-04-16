const { promiseTimeout, delay } = require("./index");

describe("Utilites", () => {
    describe("Promise Timeout Utility", () => {
        it("Resolves and Rejects as Expected", async () => {
            const fn = (ms, arg) => {
                return promiseTimeout(
                    new Promise(resolve => {
                        setTimeout(() => {
                            if (arg) resolve(arg);
                            resolve();
                        }, ms);
                    }),
                    100,
                    "error"
                );
            };

            await expect(fn(200)).rejects.toMatch("error");
            await expect(fn(110)).rejects.toMatch("error");
            await expect(fn(90)).resolves.toBeUndefined();
            await expect(fn(50)).resolves.toBeUndefined();
            await expect(fn(50, "hello")).resolves.toBe("hello");
            await expect(fn(50, { a: 5, b: 6 })).resolves.toMatchObject({ a: 5, b: 6 });
        });
    });

    describe("Delay Utility", () => {
        it("Resolves and Rejects as Expected", async () => {
            const fn = ms => {
                return promiseTimeout(
                    new Promise(async resolve => {
                        await delay(ms);
                        resolve();
                    }),
                    100,
                    "error"
                );
            };

            await expect(fn(200)).rejects.toMatch("error");
            await expect(fn(110)).rejects.toMatch("error");
            await expect(fn(90)).resolves.toBeUndefined();
            await expect(fn(50)).resolves.toBeUndefined();
        });
    });
});
