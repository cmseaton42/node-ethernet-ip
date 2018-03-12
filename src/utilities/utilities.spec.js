const { promiseTimeout, delay, TaskQueue } = require("./index");

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

    describe("Task Queue Class", () => {
        describe("New Instance", () => {
            it("Rejects Improper Constructor Arguments", () => {
                const fn = arg => () => new TaskQueue(arg);

                expect(fn()).toThrow();
                expect(fn("hello")).toThrow();
                expect(fn({ a: 6 })).toThrow();
                expect(fn(() => console.log("hello"))).not.toThrow();
            });
        });

        describe("Private Methods", () => {
            let compare;
            let arr;
            let q;

            beforeEach(() => {
                arr = [];
                compare = (obj1, obj2) => obj1.value >= obj2.value;

                for (let i = 0; i < 15; i++) {
                    arr.push({
                        task: delay,
                        args: [100 * i],
                        priority_obj: { value: i }
                    });
                }

                q = new TaskQueue(compare);
                q.tasks = arr;
            });

            it("Primitive Heap Methods Generate Correct Values", () => {
                expect(q._getParent(5)).toEqual(2);
                expect(q._getParent(6)).toEqual(2);

                expect(q._getLNode(5)).toEqual(11);
                expect(q._getLNode(25)).toEqual(51);

                expect(q._getRNode(5)).toEqual(12);
                expect(q._getRNode(25)).toEqual(52);
            });

            it("Reorder Method Produces Correct Output", () => {
                q._reorder(0);
                expect(q.tasks).toMatchSnapshot();
            });

            it("Build Heap Works Correctly", () => {
                q._orderQueue();
                expect(q.tasks).toMatchSnapshot();
            });

            it("Runs Tasks on Push", async () => {
                const delayReturn = ms => new Promise((resolve, reject) => {
                        console.log(typeof ms);
                        if (typeof ms !== "number") reject("Bad Input");
                        else setTimeout(() => {
                                resolve(ms);
                            }, ms);
                    });

                const q = new TaskQueue(compare);
                const p1 = q.schedule(delayReturn, [50], { value: 1 });
                const p2 = q.schedule(delayReturn, [60], { value: 1 });
                const p3 = q.schedule(delayReturn, [70], { value: 1 });

                await expect(p1).resolves.toBe(50);
                await expect(p2).resolves.toBe(60);
                await expect(p3).resolves.toBe(70);
            });

            it("Runs Tasks on Priority", async () => {
                const delayReturn = ms =>
                    new Promise((resolve, reject) => {
                        console.log(typeof ms)
                        if (typeof ms !== "number") reject("Bad Input");
                        else
                            setTimeout(() => {
                                resolve(ms);
                            }, ms);
                    });

                const q = new TaskQueue(compare);
                const p1 = q.schedule(delayReturn, [50], { value: 1, id: 1 });
                const p2 = q.schedule(delayReturn, [60], { value: 1, id: 2 });
                const p3 = q.schedule(delayReturn, [70], { value: 2, id: 3 });
                const p4 = q.schedule(delayReturn, [40], { value: 3, id: 4 });
                const p5 = q.schedule(delayReturn, [30], { value: 1, id: 5 });
                const p6 = q.schedule(delayReturn, ["hello"], { value: 0, id: 6 });

                await expect(p1).resolves.toBe(50);
                await expect(p2).resolves.toBe(60);
                await expect(p3).resolves.toBe(70);
                await expect(p4).resolves.toBe(40);
                await expect(p5).resolves.toBe(30);
                await expect(p6).rejects.toBe("Bad Input");
            });
        });
    });
});
