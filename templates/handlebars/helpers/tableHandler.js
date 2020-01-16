var Handlebars = require('handlebars');
module.exports = function(data, column) {
    var html = "";

    for (var i = 0; i < column.length; i++) {
        html += "<td data-value='" + data[column[i]] + "' data-column='" + column[i] + "'>" + data[column[i]] + "</td>"
    }

    return new Handlebars.SafeString(html);
};