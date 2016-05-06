/**
 * A MapReduce implementation built specifically for our architecture.
 * 
 * User specified function signatures:
 * map(k1,v1) -> array(k2, v2)
 * reduce(k2,array(v2)) -> array(v2)
 *
 * (c) Tony Liu and Michael Shaw 2016.
 */
 module.exports = {

    /**
     * A job object that initializes and manages map/reduce tasks.
     * data: list of k1,v1 pairs
     * map: the map function as specified by the user
     * reduce: the reduce function as specified by the user
     */
    Job: function(map, reduce, data){
        var structs = require('./structs');

        /**** INITIALIZATION ****/

        this.id = new Date().getTime(); //id is milliseconds, TODO make more robust?
        this.map_tasks = new structs.Queue();
        this.red_tasks = new structs.Queue();
        this.complete = false;

        //track the outstanding map/reduce tasks
        this.map_todo = [];
        this.red_todo = [];
        this.num_maps = 0;
        this.num_reds = 0;

        //Stores the interMIDeate k2,v2 pairs
        this.mid_output = [];

        //Stores the FINal v2 values.
        this.fin_output = [];

        /**** FUNCTIONS ****/

        /**
         * splits up the data into separate tasks pushes them onto the map_tasks queue.
         * 
         * Returns the number of tasks submitted to queue.
         */
        this.create_map_tasks = function(num_chunks){
            var data_list = structs.chunk(data, num_chunks);

            for(var i = 0; i < data_list.length; i++){
                var map_id = 'm' + i;
                var t = new structs.Task(map_id, map.toString(), data_list[i]);
                this.map_tasks.enq(t);
                this.map_todo.push(map_id);
            }

            return data_list.length;
        };


        /**
         * splits up the data into separate tasks pushes them onto the red_tasks queue.
         * 
         * Returns the number of tasks submitted to queue.
         */
        this.create_red_tasks = function(data, num_chunks){
            var data_list = structs.chunk(data, num_chunks);

            for(var i = 0; i < data_list.length; i++){
                var red_id = 'r' + i;
                var t = new structs.Task(red_id, reduce.toString(), data_list[i]);
                this.red_tasks.enq(t);
                this.red_todo.push(red_id);
            }

            return data_list.length;
        };

        /**
         * submission of results. If all map tasks are complete, process
         * and create reduce tasks.
         * TODO how do we callback in order for job_server to specify num_chunks?
         */
        this.submit_output = function(id, results){
            //TODO worries about submitting out of order?
            if(this.map_todo.length > 0 && (id.substring(0,1) == 'm')){
                this.mid_output = this.mid_output.concat(results);

                //remove id from map_todo
                var i = this.map_todo.indexOf(id);
                if (i != -1) this.map_todo.splice(i,1);

                //process reduce tasks
                if(this.map_todo.length == 0){
                    //TODO need to specifiy number of chunks
                    this.create_red_tasks(this.mid_group(), 1);
                }
            }
            else if(this.red_todo.length > 0 && (id.substring(0,1) == 'r')){
                this.fin_output = this.fin_output.concat(results);

                //remove id from map_todo
                var i = this.red_todo.indexOf(id);
                if (i != -1) this.red_todo.splice(i,1);

                if(this.red_todo.length == 0){
                    this.complete = true;
                }
            }
            else {
                console.log("Finished job or incorrectly submitted task")
            }
        };

        /**
         * Groups the intermediate output k2,v2 pairs together into single [k2,[v2]]
         * lists. 
         */
        this.mid_group = function(){
            var temp_dict = {};

            for(var i = 0; i < this.mid_output.length; i++){
                var key = this.mid_output[i][0];
                var val = this.mid_output[i][1];

                if (!(key in temp_dict)){
                    temp_dict[key] = [];
                    temp_dict[key].push(val);
                }
                else{
                    temp_dict[key].push(val);
                }
            }
            var out_list = [];

            for(var k in temp_dict){
                if(temp_dict.hasOwnProperty(k)){
                    var tup = [k, temp_dict[k]];
                    out_list.push(tup);
                }
            }

            return out_list;
        };

        /**
         * Prints map/reduce progress to console.
         */
        this.print_progress = function(){
            if(this.map_todo.length > 0){
                console.log('Task: ' + this.id);
                console.log("Percent map complete: " + (this.map_todo.length) / this.num_maps);
            }
            else if(this.red_todo.length > 0){
                console.log('Task: ' + this.id);
                console.log("Percent reduce complete: " + (this.red_todo.length) / this.num_reds);
            }
        };

        /**
         * Returns whether or not the MapReduce task is complete.
         */
        this.is_complete = function(){
            return this.complete;
        };

        /**
         * Returns the output, if possible.
         */
        this.get_output = function(){
            return this.fin_output;
        };

        /**
         * Retrieves a Task off the appropriate queue.
         */
        this.get_task = function(){
            if(this.map_tasks.size() > 0){
                return this.map_tasks.deq();
            }
            else if(this.red_tasks.size() > 0){
                return this.red_tasks.deq();
            }
            else{
                console.log("No outstanding tasks");
                return null;
            }
        }
    }  
 }