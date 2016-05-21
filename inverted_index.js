module.exports = {
	/**
	* Maps words in v to the file in which they are found
	*/
	map: function(k, v) {
		var vals = v.split(" ");
		var res = [];
		for (var i = 0; i < vals.length; i++) {
			var tup = [vals[i],k];
			res.push(tup);
		}
		return res;
	},	

	/**
	* Aggregates all files in which a word is found
	*/
	reduce: function(k,l) {
		var unique_list = l.filter(function(elem, pos) {
    		return l.indexOf(elem) == pos;
		})
		return unique_list;
	}

}