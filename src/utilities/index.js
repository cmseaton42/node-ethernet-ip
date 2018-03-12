/**
 * Wraps a Promise with a Timeout
 *
 * @param {Tag} tag - Tag Object to Write
 * @param {number} - Timeout Length (ms)
 * @param {Error|string} - Error to Emit if Timeout Occurs
 * @returns {Promise}
 * @memberof Controller
 */
const promiseTimeout = (promise, ms, error = new Error("ASYNC Function Call Timed Out!!!")) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject(error), ms);
        promise.then(resolve).catch(reject);
    });
};

/**
 * Delays X ms
 *
 * @param {number} ms - Delay Length (ms)
 * @returns {Promise}
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A simple Job Scheduler/ Task Runner class
 *
 * @param {function} compare_func - Compares Priority Objects
 * @class JobQueue
 */
class TaskQueue {
    constructor(compare_func) {
        this.tasks = [];
        this.taskRunning = false;

        if (typeof compare_func !== "function")
            throw new Error(
                `JobQueue Comparison Function must be of Type <function> instead got ${typeof compare_func}`
            );

        this.compare = compare_func;
    }

    schedule(task, args, priority_obj) {
        if (typeof task !== "function")
            throw new Error(`Scheduler Task must be of Type <function> instead got ${typeof task}`);
        if (!Array.isArray(args))
            throw new Error(`Scheduler args must be of Type <Array> instead got ${typeof args}`);
        if (typeof priority_obj !== "object")
            throw new Error(
                `Scheduler Task must be of Type <Object> instead got ${typeof priority_obj}`
            );

        // return Promise to Caller
        return new Promise((resolve, reject) => {
            // Push Task to Queue
            this.tasks.push({ task, args, priority_obj, resolve, reject });
            this._next();
        });
    }

    _getParent(index) {
        return Math.trunc((index - 1) / 2);
    }

    _getLNode(index) {
        return index * 2 + 1;
    }

    _getRNode(index) {
        return index * 2 + 2;
    }

    _reorder(index) {
        const { compare } = this;
        const size = this.tasks.length;

        const l = this._getLNode(index);
        const r = this._getRNode(index);

        let swap = index;

        if (l < size && compare(this.tasks[l].priority_obj, this.tasks[swap].priority_obj))
            swap = l;
        if (r < size && compare(this.tasks[r].priority_obj, this.tasks[swap].priority_obj))
            swap = r;

        if (swap !== index) {
            const temp = this.tasks[index];
            this.tasks[index] = this.tasks[swap];
            this.tasks[swap] = temp;
            this._reorder(swap);
        }
    }

    _orderQueue() {
        const size = this.tasks.length;
        const start = Math.trunc((size - 2) / 2);

        for (let i = start; i >= 0; i--) {
            this._reorder(i);
        }
    }

    _runTask() {
        this._orderQueue();

        const job = this.tasks.shift();
        const { task, args, resolve, reject } = job;

        this.taskRunning = true;

        task(...args)
            .then((...args) => {
                resolve(...args);
                this.taskRunning = false;
                this._next();
            })
            .catch((...args) => {
                reject(...args);
                this.taskRunning = false;
                this._next();
            });
    }

    _next() {
        if (this.tasks.length !== 0 && this.taskRunning === false) {
            this._runTask();
        }
    }
}

module.exports = { promiseTimeout, delay, TaskQueue };
