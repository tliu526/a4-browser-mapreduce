/**
 * Provides simple data structure functions.
 * (c) 2016 Tony Liu, Michael Shaw.
 */
module.exports = {
    enq: function(queue, val){
        queue.push(val);
    },

    deq: function(queue){
        var val = queue.shift();
        return val;
    },

    //A task to be completed by a volunteer node, can either be a map or reduce.
    Task: function(id, func, data){
        this['id'] = id;
        this['func'] = func;
        this['data'] = data;
    }
}