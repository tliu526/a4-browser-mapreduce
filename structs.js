/**
 * Provides simple data structure functions.
 * (c) 2016 Tony Liu, Michael Shaw.
 */
module.exports = {
    /**
     * A simple Queue wrapper.
     */
    Queue: function(data){
        data = typeof data !== 'undefined' ? data : [];
        this.data = data;

        this.enq = function(val){
            this.data.push(val);
        }

        this.deq = function(){
            var val = data.shift();
            return val;
        }

        this.is_empty = function(){
            return this.data.length <= 0;
        }

        this.size = function(){
            return this.data.length; 
        }
    },

    //takes list l and returns a list of at most num_chunks chunks of l
    chunk: function(l, num_chunks) {
        var chunk_size = Math.ceil(l.length / num_chunks);
        var chunks = [];

        for(var i = 0; i < l.length; i += chunk_size){
            chunks.push(l.slice(i,i+chunk_size));
        }

        return chunks;
    },

    //A task to be completed by a volunteer node, can either be a map or reduce.
    Task: function(id, func, data){
        this['id'] = id;
        this['func'] = func;
        this['data'] = data;

        this.is_complete = function(){
            return (this['id'] != undefined) && (this['func'] != undefined) && (this['data'] != undefined);
        }
    },

    //Escapes all sql special characters, source: http://stackoverflow.com/questions/7744912/making-a-javascript-string-sql-friendly
    escape_sql_str: function(str) {

        if (typeof str != 'string')
            return str;
        return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
            switch (char) {
                case "\0":
                return "\\0";
                case "\x08":
                return "\\b";
                case "\x09":
                return "\\t";
                case "\x1a":
                return "\\z";
                case "\n":
                return "\\n";
                case "\r":
                return "\\r";
                case "\"":
                case "'":
                case "\\":
                case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
            }
        });
    }
}