
module.exports = {
    map: function(k, v){
        var vals = v.split(" ");
        var res = [];
        for (var i = 0; i < vals.length; i++){
            var tup = [vals[i], 1];
            res.push(tup);
        }

        return res;
    }, 

    reduce: function(k, l){
        var result = 0;
        for (var i = 0; i < l.length; i++){
            result += l[i];
        }

        return result;
    }
}