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
 * @param {number}
 * @class JobQueue
 */
class TaskQueue {
    constructor(compare_func, max_queue_size = 100) {
        this.tasks = [];
        this.taskRunning = false;
        this.max = max_queue_size;

        if (typeof compare_func !== "function")
            throw new Error(
                `JobQueue Comparison Function must be of Type <function> instead got ${typeof compare_func}`
            );

        if (typeof max_queue_size !== "number")
            throw new Error(
                `JobQueue Max Queue Size must be of Type <function> instead got ${typeof number}`
            );

        this.compare = compare_func;
    }

    /**
     * Schedules a new "Task" to be Performed
     *
     * @param {function} task - task to schedule
     * @param {Array} args - array of arguments to pass to task
     * @param {object} priority_obj - object that will be passed to comparison handler provided in the constructor
     * @returns
     * @memberof TaskQueue
     */
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
            if (this.tasks.length > this.max) {
                reject(new Error("Task Queue Exceeded Max Queue Size!!!"));
            } else {
                // Push Task to Queue
                if (this.tasks.length === 0) {
                    this.tasks.push({ task, args, priority_obj, resolve, reject });
                    this._next();
                } else {
                    this.tasks.push({ task, args, priority_obj, resolve, reject });
                }
            }
        });
    }

    /**
     * Gets Parent Node Index
     *
     * @param {number} index
     * @returns {number}
     * @memberof TaskQueue
     */
    _getParent(index) {
        return Math.trunc((index - 1) / 2);
    }

    /**
     * Gets Left Child Node Index
     *
     * @param {number} index
     * @returns {number}
     * @memberof TaskQueue
     */
    _getLNode(index) {
        return index * 2 + 1;
    }

    /**
     * Gets Right Child Node Index
     *
     * @param {number} index
     * @returns
     * @memberof TaskQueue
     */
    _getRNode(index) {
        return index * 2 + 2;
    }

    /**
     * Recursively Reorders from Seed Index Based on Outcome of Comparison Function
     *
     * @param {number} index
     * @memberof TaskQueue
     */
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

    /**
     * Organized Queue based on Priority
     *
     * @memberof TaskQueue
     */
    _orderQueue() {
        const size = this.tasks.length;
        const start = Math.trunc((size - 2) / 2);

        for (let i = start; i >= 0; i--) {
            this._reorder(i);
        }
    }

    /**
     * Executes Highest Priority Task
     *
     * @memberof TaskQueue
     */
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

    /**
     * Executes Next Task in Queue if One Exists and One is Currently Running
     *
     * @memberof TaskQueue
     */
    _next() {
        if (this.tasks.length !== 0 && this.taskRunning === false) {
            this._runTask();
        }
    }
}

module.exports = { promiseTimeout, delay, TaskQueue };
