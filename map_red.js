/**
 * A MapReduce implementation built specifically for our architecture.
 * 
 * User specified function signatures:
 * map(k1,v1) -> array(k2, v2)
 * reduce(k2,array(v2)) -> array(v2)
 *
 * (c) Tony Liu and Michael Shaw 2016.
 */
 module.exports {

    /**
     * A job object that initializes and manages map/reduce tasks.
     * data: list of k1,v1 pairs
     * map: the map function as specified by the user
     * reduce: the reduce function as specified by the user
     */
    MapReduceJob: function(map, reduce, data){
        var structs = require('./structs');

        /**** INITIALIZATION ****/

        this.id = new Date().getTime(); //id is milliseconds, TODO make more robust?
        this.map_tasks = new structs.Queue();
        this.red_tasks = new structs.Queue();

        //track the outstanding map/reduce tasks
        this.map_todo = [];
        this.red_todo = [];
        this.num_maps = 0;
        this.num_reds = 0;

        //Stores the interMIDeate k2,v2 pairs
        this.mid_output = [];

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
                var t = new structs.Task(map_id, map, data_list[i]);
                this.map_tasks.enq(t);
                this.map_todo.push(map_id);
            }

            return data_list.length;
        };

        /**
         * submission of intermediate results. If all map tasks are complete, process
         * and create reduce tasks.
         * TODO how do we callback in order for job_server to specify num_chunks?
         */
        this.submit_mid_output = function(map_id, results){
            this.mid_output = this.mid_output.concat(results);

            //remove map_id from map_todo
            var i = this.map_todo.indexOf(map_id);
            if (i != -1) this.map_todo.splice(i,1);

            //process reduce tasks
            if(this.map_todo.length == 0){
                
            }
        };

        this.print_progress = function(){
            if(this.map_todo.length > 0){
                console.log('Task: ' + this.id);
                console.log("Percent map complete: " + (this.map_todo.length) / num_maps);
            }
            else if(this.red_todo.length > 0){
                console.log('Task: ' + this.id);
                console.log("Percent reduce complete: " + (this.red_todo.length) / num_reds);
            }
        };
    }
 }